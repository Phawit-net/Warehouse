from flask import abort, Blueprint, current_app, jsonify, request, send_from_directory
from model import ProductVariant, db,Product, StockIn, StockInEntry, StockBatch, StockMovement
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from werkzeug.utils import secure_filename
import os
import json
from datetime import date, datetime, timezone
from sqlalchemy.orm import joinedload
import traceback
from sqlalchemy import func

stockin_bp = Blueprint('stockin_bp', __name__, url_prefix='/api/stock-in')

# 🛠 ตั้งค่า path ที่จะเก็บไฟล์ (แก้ตามโครงสร้างจริงของคุณ)
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads/receipts')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def parse_iso_datetime(s: str | None) -> datetime:
    """รับ ISO datetime, รองรับ Z (UTC). ถ้าไม่ส่งมา -> now(UTC)"""
    if not s:
        return datetime.now(timezone.utc)
    s = s.strip()
    if s.endswith('Z'):
        s = s[:-1] + '+00:00'
    return datetime.fromisoformat(s)

def parse_flexible_date(s: str | None) -> date | None:
    """รับ yyyy-MM-dd หรือ dd/MM/yyyy; ค่าว่าง -> None"""
    if not s:
        return None
    s = s.strip()
    try:
        return date.fromisoformat(s)  # yyyy-MM-dd
    except ValueError:
        pass
    try:  # dd/MM/yyyy
        dd, mm, yyyy = s.split('/')
        return date(int(yyyy), int(mm), int(dd))
    except Exception as e:
        raise ValueError(f"Unsupported date format: {s}") from e

def auto_lot(doc_number: str) -> str:
    """gen lot ถ้าไม่กรอกมา -> LOT-{doc_number}"""
    base = (doc_number or "GRN").replace(' ', '').upper()
    return f"LOT-{base}"

def generate_doc_number():
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"GRN-{today}"

    # หา doc_number ล่าสุดของวันนี้
    last = (
        db.session.query(StockIn)
        .filter(StockIn.doc_number.like(f"{prefix}-%"))
        .order_by(StockIn.doc_number.desc())
        .first()
    )

    if last:
        # ดึงเลขท้ายมา +1
        last_num = int(last.doc_number.split("-")[-1])
        next_num = last_num + 1
    else:
        next_num = 1

    return f"{prefix}-{next_num:03d}"

def _get_receipts_dir():
    base = current_app.config.get("RECEIPTS_DIR")
    if base:
        return base
    
    # ถ้าไม่กำหนดไว้ จะใช้ค่า default uploads/receipts
    upload_base = current_app.config.get("UPLOAD_FOLDER", "uploads")
    return os.path.join(upload_base, "receipts")

def _delete_receipt_file(filename: str | None):
    if not filename:
        return
    try:
        receipts_dir = _get_receipts_dir()
        path = os.path.join(receipts_dir, filename)
        # กัน path traversal
        path = os.path.normpath(path)
        if os.path.commonpath([receipts_dir, path]) != os.path.normpath(receipts_dir):
            # ถ้าไฟล์ชี้ออกนอกโฟลเดอร์ receipts จะไม่ลบ
            return
        if os.path.isfile(path):
            os.remove(path)
    except Exception as e:
        # ไม่ให้ล้มการลบ DB ถ้าลบไฟล์ไม่ได้
        current_app.logger.warning(f"⚠️ Failed to delete receipt file {filename}: {e}")

# API - ที่เกี่ยวกับ STOCKIN ทั้งหมด
# 1. API POST - add new stockin
@stockin_bp.route('/', methods=['POST'])
def create_stockin():
    """
    form-data:
      - product_id (int)                         # required (หน้า product ส่งมา)
      - created_at (ISO datetime) [optional]
      - expiry_date ('yyyy-MM-dd' หรือ 'dd/MM/yyyy') [optional: สินค้าที่ไม่มีวันหมดอายุ -> ว่างได้]
      - note (str) [optional]
      - order_image (file) [optional]
      - doc_number (str) [optional แต่ควรมี; ถ้าไม่มีจะปล่อย None]
      - entries (json)  # required
        [
          {"variant_id":10, "quantity":5,  "custom_sale_mode":null,        "custom_pack_size":null, "pack_size_at_receipt":12, "lot_number":"A1"},
          {"variant_id":null,"quantity":3,  "custom_sale_mode":"doublePack","custom_pack_size":20,  "pack_size_at_receipt":20, "lot_number":"A1"}
        ]
    behavior:
      - ทุก entry ใช้ product_id จาก header เสมอ
      - รวมเป็น batch เดียวกัน ถ้า (stockin_id, product_id, lot_number, expiry_date) ตรงกัน
      - ถ้าไม่ส่ง lot_number -> ระบบ gen ให้อัตโนมัติ (ต่อเลขตามลำดับ entry)
    """
    try:
        data = request.form
        order_image = request.files.get("order_image")

        # --- 1) header: product_id ---
        product_id_str = data.get("product_id")
        if not product_id_str:
            return jsonify({"error": "❌ Missing product_id"}), 400
        try:
            header_product_id = int(product_id_str)
        except ValueError:
            return jsonify({"error": "❌ product_id must be integer"}), 400

        product = db.session.get(Product, header_product_id)
        if not product:
            return jsonify({"error": "❌ Product not found"}), 404

        # --- 2) parse created_at / expiry_date ---
        try:
            created_at = parse_iso_datetime(data.get("created_at"))
            expiry_date = parse_flexible_date(data.get("expiry_date"))
        except ValueError as e:
            return jsonify({"error": "❌ Invalid datetime/date format", "detail": str(e)}), 400

        # --- 3) file upload (optional) ---
        image_filename = None
        if order_image:
            filename = secure_filename(order_image.filename)
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            image_path = os.path.join(UPLOAD_FOLDER, filename)
            order_image.save(image_path)
            image_filename = filename

        # --- 4) parse entries ---
        try:
            entries_data = json.loads(data.get("entries", "[]"))
        except json.JSONDecodeError:
            return jsonify({"error": "❌ entries must be valid JSON"}), 400
        if not entries_data:
            return jsonify({"error": "❌ No entries provided"}), 400

        doc_number = data.get("doc_number")
        if not doc_number:
            doc_number = generate_doc_number()

        header_lot = (data.get("lot_number") or "").strip() or None
        if header_lot:
            if any((e.get("lot_number") and e.get("lot_number").strip() != header_lot) for e in entries_data):
                return jsonify({"error": "❌ Entries lot_number must match header lot_number"}), 400
            
        default_lot = header_lot or auto_lot(doc_number or "GRN")

        # --- 5) begin transaction ---
        with db.session.begin_nested():
            # 5.1 สร้าง header StockIn (expiry ทั้งใบ)
            new_stockin = StockIn(
                doc_number=doc_number,
                created_at=created_at,
                expiry_date=expiry_date,
                note=data.get("note", ""),
                image_filename=image_filename,
            )
            db.session.add(new_stockin)
            db.session.flush()  # ให้มี id ใช้สร้าง batch/entry

            total_base_qty = 0
            created_or_updated_batches = {}

            # 🔹 สะสมยอดรับเข้าต่อ batch_id เพื่อนำไปสร้าง movement(IN) ทีเดียว
            added_by_batch_id: dict[int, int] = {}

            # เพื่อ gen lot ถ้าไม่ได้ส่งมา (นับตาม entry)

            for idx, v in enumerate(entries_data, start=1):
                # 5.2 validate entry base
                variant_id = v.get("variant_id")
                quantity = v.get("quantity")
                custom_sale_mode = v.get("custom_sale_mode")
                custom_pack_size = v.get("custom_pack_size")
                lot_number = v.get("lot_number")  # อาจว่าง

                # ห้ามมี product_id ใน entry (หรือถ้ามีต้องตรงกับ header)
                if "product_id" in v and v["product_id"] not in (None, header_product_id):
                    return jsonify({"error": f"❌ Entry #{idx}: product_id in entry must match header product_id={header_product_id}"}), 400

                # quantity ต้องเป็น int > 0
                try:
                    quantity = int(quantity)
                except (TypeError, ValueError):
                    return jsonify({"error": f"❌ Entry #{idx}: quantity must be integer"}), 400
                if quantity <= 0:
                    return jsonify({"error": f"❌ Entry #{idx}: quantity must be > 0"}), 400

                # ต้องมี either variant_id หรือ (custom_sale_mode + custom_pack_size)
                if not variant_id and (not custom_sale_mode or not custom_pack_size):
                    return jsonify({"error": f"❌ Entry #{idx}: Need variant_id or (custom_sale_mode & custom_pack_size)"}), 400

                # 5.3 หา pack_size_at_receipt (ถ้า FE ส่งมาแล้วใช้ได้เลย; ไม่งั้นคำนวณให้)
                pack_size_at_receipt = v.get("pack_size_at_receipt")
                if pack_size_at_receipt is None:
                    if variant_id:
                        variant = db.session.get(ProductVariant, variant_id)
                        if not variant:
                            return jsonify({"error": f"❌ Entry #{idx}: Variant {variant_id} not found"}), 404
                        pack_size_at_receipt = int(variant.pack_size or 0)
                    else:
                        try:
                            pack_size_at_receipt = int(custom_pack_size)
                        except (TypeError, ValueError):
                            return jsonify({"error": f"❌ Entry #{idx}: custom_pack_size must be integer"}), 400

                try:
                    pack_size_at_receipt = int(pack_size_at_receipt)
                except (TypeError, ValueError):
                    return jsonify({"error": f"❌ Entry #{idx}: pack_size_at_receipt must be integer"}), 400
                if pack_size_at_receipt <= 0:
                    return jsonify({"error": f"❌ Entry #{idx}: pack_size_at_receipt must be > 0"}), 400

                # 5.4 base units
                base_qty = pack_size_at_receipt * quantity
                total_base_qty += base_qty

                # 5.5 lot_number (optional) -> auto-generate ถ้าไม่ส่งมา
                lot_number = (v.get("lot_number") or "").strip() or default_lot

                # 5.6 หา/สร้าง Batch ของ (stockin, product, lot, expiry)
                # ใช้ in-memory cache ป้องกัน query ซ้ำในรอบเดียวกัน
                batch_key = (lot_number, expiry_date)
                batch = created_or_updated_batches.get(batch_key)
                if not batch:
                    batch = (db.session.query(StockBatch)
                             .filter(StockBatch.stockin_id == new_stockin.id,
                                     StockBatch.product_id == header_product_id,
                                     StockBatch.lot_number == lot_number,
                                     StockBatch.expiry_date == new_stockin.expiry_date)
                             .with_for_update(read=True)
                             .first())
                    if not batch:
                        batch = StockBatch(
                            stockin_id=new_stockin.id,
                            product_id=header_product_id,
                            lot_number=lot_number,
                            expiry_date=new_stockin.expiry_date,
                            qty_received=0,
                            qty_remaining=0,
                        )
                        db.session.add(batch)
                        db.session.flush()
                    created_or_updated_batches[batch_key] = batch

                # 5.7 อัปเดตยอด batch
                batch.qty_received += base_qty
                batch.qty_remaining += base_qty
                db.session.add(batch)

                added_by_batch_id[batch.id] = added_by_batch_id.get(batch.id, 0) + base_qty

                # 5.8 สร้าง Entry + ผูก batch
                entry = StockInEntry(
                    stockin_id=new_stockin.id,
                    product_id=header_product_id,
                    variant_id=variant_id,
                    custom_sale_mode=custom_sale_mode,
                    custom_pack_size=(None if variant_id else custom_pack_size),
                    pack_size_at_receipt=pack_size_at_receipt,
                    quantity=quantity,
                    batch_id=batch.id,
                )
                db.session.add(entry)

            for b in created_or_updated_batches.values():
                added = int(added_by_batch_id.get(b.id, 0))
                if added <= 0:
                    continue
                db.session.add(StockMovement(
                    product_id=b.product_id,
                    batch_id=b.id,
                    movement_type="IN",                 # ✅ รับเข้า
                    qty=added,                          # + จำนวน base units
                    batch_qty_remaining=int(b.qty_remaining or 0),
                    ref_stockin_id=new_stockin.id,
                    note=f"StockIn {new_stockin.doc_number} lot {b.lot_number}",
                ))
        # try-commit
        try:
            db.session.commit()
        except IntegrityError as ie:
            db.session.rollback()
            # กันเคสชน UniqueConstraint: ลองรวมใหม่สั้น ๆ หรือแจ้ง error อ่านง่าย
            return jsonify({"error": "❌ Duplicate batch for same (stockin, product, lot, expiry).",
                            "detail": str(ie)}), 400

        return jsonify({
            "message": "✅ StockIn created",
            "stockin_id": new_stockin.id,
            "product_id": header_product_id,
            "expiry_date": new_stockin.expiry_date.isoformat() if new_stockin.expiry_date else None,
            "total_received_base_qty": total_base_qty,
            "batches": [
                {
                    "batch_id": b.id,
                    "lot_number": b.lot_number,
                    "expiry_date": b.expiry_date.isoformat() if b.expiry_date else None,
                    "qty_received": b.qty_received,
                    "qty_remaining": b.qty_remaining,
                }
                for b in created_or_updated_batches.values()
            ]
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Database error: {str(e)}"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500
    
# 2. API GET - get stockin by product ID
@stockin_bp.route('/<int:product_id>', methods=['GET'])
def get_stockins_by_product(product_id):
    try:
        # ถ้า StockIn.batches ไม่ได้เป็น dynamic (แนะนำ): eager load ได้
        stockins = (
            db.session.query(StockIn)
            .join(StockIn.entries)
            .filter(StockInEntry.product_id == product_id)
            .options(
                joinedload(StockIn.entries).joinedload(StockInEntry.variant),
                joinedload(StockIn.entries).joinedload(StockInEntry.batch),
                joinedload(StockIn.batches),  # ถ้าเป็น dynamic ให้ลบบรรทัดนี้ แล้วใช้ .all() ด้านล่าง
            )
            .order_by(StockIn.created_at.desc())
            .all()
        )

        result = []
        for si in stockins:
            # ----- Entries (เฉพาะสินค้านี้) -----
            entries_data = []
            for e in si.entries:
                if e.product_id != product_id:
                    continue
                pack_size = e.pack_size_at_receipt or 0
                qty_pack  = e.quantity or 0
                total_u   = pack_size * qty_pack
                sale_mode = e.variant.sale_mode if e.variant else e.custom_sale_mode
                lot_no    = e.batch.lot_number if e.batch else None

                entries_data.append({
                    "entry_id": e.id,
                    "sale_mode": sale_mode,
                    "quantity": qty_pack,
                    "pack_size": pack_size,
                    "total_unit": total_u,
                    "lot_number": lot_no,
                })

            if not entries_data:
                continue

            # ----- Lots (สรุปจาก Batch ของสินค้านี้ในใบนี้) -----
            # ถ้า si.batches เป็น dynamic: ใช้ batches_iter = si.batches.all()
            batches_iter = si.batches if isinstance(si.batches, list) else si.batches.all()
            lots_map = {}  # key: (lot, expiry) -> agg
            for b in batches_iter:
                if b.product_id != product_id:
                    continue
                key = (b.lot_number, b.expiry_date)
                agg = lots_map.get(key)
                if not agg:
                    lots_map[key] = {
                        "lot_number": b.lot_number,
                        "expiry_date": b.expiry_date.isoformat() if b.expiry_date else None,
                        "qty_received": int(b.qty_received or 0),
                        "qty_remaining": int(b.qty_remaining or 0),
                        "batch_ids": [b.id],
                    }
                else:
                    agg["qty_received"]  += int(b.qty_received or 0)
                    agg["qty_remaining"] += int(b.qty_remaining or 0)
                    agg["batch_ids"].append(b.id)

            lots = list(lots_map.values())

            locked = any(
            (b.qty_remaining or 0) < (b.qty_received or 0)
            for b in (si.batches if isinstance(si.batches, list) else si.batches.all())
        )

            result.append({
                # ----- Header -----
                "id": si.id,
                "doc_number": si.doc_number,
                "created_at": si.created_at.isoformat() if si.created_at else None,
                "expiry_date": si.expiry_date.isoformat() if si.expiry_date else None,  # header-level (ถ้ามี)
                "note": si.note,
                "image_filename": si.image_filename,

                # ----- Lots summary (อยู่นอก entries ตามที่ขอ) -----
                "lots": lots,             # [{lot_number, expiry_date, qty_received, qty_remaining, batch_ids}]
                "lot_count": len(lots),
                "lot_numbers": ", ".join(l["lot_number"] for l in lots if l["lot_number"]),

                # ----- Entries detail -----
                "entries": entries_data,
                "total_unit": sum(e["total_unit"] for e in entries_data),
                "locked": locked,
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"❌ Failed to fetch stock-in history: {str(e)}"}), 500

# 3. API File serving - serve image when call API path from front-end
@stockin_bp.route('/uploads/receipts/<filename>')
def uploaded_receipts(filename):
    # ✅ ป้องกัน path traversal เช่น "../../etc/passwd"
    filename = secure_filename(filename)

    # ✅ เช็คว่าไฟล์มีจริงก่อนส่ง
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        abort(404, description="📁 File not found")

    # ✅ ส่งไฟล์แบบปลอดภัย
    return send_from_directory(UPLOAD_FOLDER, filename)

# 4. API DELETE - delete stokin + relationship of stokin + minus stock
@stockin_bp.route("/<int:stock_in_id>", methods=["DELETE"])
def delete_stock_in(stock_in_id):
    try:
        stock_in = (
            db.session.query(StockIn)
            .options(
                joinedload(StockIn.entries).joinedload(StockInEntry.batch),
                joinedload(StockIn.batches),
            )
            .get(stock_in_id)
        )
        if not stock_in:
            return jsonify({"error": "❌ StockIn not found"}), 404

        batches = list(stock_in.batches)
        batch_ids = [b.id for b in batches]

        # ❗ กันลบถ้ามีการใช้ล็อตแล้ว (ขาย/โอนออก)
        used = [
            {
                "batch_id": b.id,
                "lot_number": b.lot_number,
                "expiry_date": b.expiry_date.isoformat() if b.expiry_date else None,
                "qty_received": int(b.qty_received or 0),
                "qty_remaining": int(b.qty_remaining or 0),
            }
            for b in batches
            if (b.qty_remaining or 0) < (b.qty_received or 0)
        ]
        if used:
            return jsonify({
                "error": "❌ Cannot delete: some batches have already been consumed.",
                "conflicts": used,
                "hint": "ลบ/void ใบขายที่ใช้ล็อตเหล่านี้ก่อน",
            }), 409

        # ลบไฟล์รูปก่อน (ไม่ผูกทรานแซกชัน DB)
        _delete_receipt_file(getattr(stock_in, "image_filename", None))

        with db.session.begin_nested():
            if batch_ids:
                # 1) SET NULL ที่ StockInEntry.batch_id กัน FK ชนตอนลบ batch
                db.session.query(StockInEntry)\
                    .filter(StockInEntry.stockin_id == stock_in.id,
                            StockInEntry.batch_id.in_(batch_ids))\
                    .update({StockInEntry.batch_id: None}, synchronize_session=False)

                # 2) ลบ StockMovement ที่อ้างใบนี้ และที่อ้าง batch เหล่านี้ (ลบแบบ bulk ได้)
                db.session.query(StockMovement)\
                    .filter(StockMovement.ref_stockin_id == stock_in.id)\
                    .delete(synchronize_session=False)

                db.session.query(StockMovement)\
                    .filter(StockMovement.batch_id.in_(batch_ids))\
                    .delete(synchronize_session=False)

                # 3) ลบ Batch ทีละตัว (อย่า bulk delete เพราะ instance ถูกโหลดแล้ว)
                for b in batches:
                    db.session.delete(b)

            # 4) ลบ StockIn (entries จะโดนลบเพราะ cascade)
            db.session.delete(stock_in)

        db.session.commit()
        return jsonify({"message": "✅ StockIn deleted (entries, batches, movements removed)"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Database error: {str(e)}"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Failed to delete StockIn: {str(e)}"}), 500
    
# 4. API Get Stockin Detail - get stock-in detail by stock-in Id for Edit Stock-in
# return Locked = for check PATCH Stockin
@stockin_bp.route('/detail/<int:stockin_id>', methods=['GET'])
def get_stockin_detail(stockin_id):
    try:
        si = (
            db.session.query(StockIn)
            .options(
                joinedload(StockIn.entries)
                    .joinedload(StockInEntry.variant),
                joinedload(StockIn.entries)
                    .joinedload(StockInEntry.batch),
                joinedload(StockIn.batches),
            )
            .get(stockin_id)
        )
        if not si:
            return jsonify({"error": "❌ StockIn not found"}), 404

        # lots summary
        lots = []
        for b in (si.batches if isinstance(si.batches, list) else si.batches.all()):
            lots.append({
                "batch_id": b.id,
                "lot_number": b.lot_number,
                "expiry_date": b.expiry_date.isoformat() if b.expiry_date else None,
                "qty_received": int(b.qty_received or 0),
                "qty_remaining": int(b.qty_remaining or 0),
            })

        # entries
        entries = []
        for e in si.entries:
            pack = int(e.pack_size_at_receipt or 0)
            qty  = int(e.quantity or 0)
            variant_label = e.variant.sale_mode if e.variant else e.custom_sale_mode
            entries.append({
                "entry_id": e.id,
                "variant_id": e.variant_id,
                "variant_label": variant_label,
                "quantity": qty,
                "pack_size_at_receipt": pack,
                "custom_sale_mode": e.custom_sale_mode,
                "custom_pack_size": e.custom_pack_size,
                "total_unit": pack * qty,
                "batch_id": e.batch_id,
                "lot_number": e.batch.lot_number if e.batch else None,
            })

        # ถ้าใบนี้ใช้ล็อตเดียวทั้งใบ ดึงจากล็อตแรก (optional)
        lot_number_hdr = None
        if lots:
            # เงื่อนไข: ทุก batch มี lot เดียวกัน
            uniq = {l["lot_number"] for l in lots}
            if len(uniq) == 1:
                lot_number_hdr = list(uniq)[0]

        locked = any(
            (b.qty_remaining or 0) < (b.qty_received or 0)
            for b in (si.batches if isinstance(si.batches, list) else si.batches.all())
        )

        return jsonify({
            "id": si.id,
            "doc_number": si.doc_number,
            "created_at": si.created_at.isoformat() if si.created_at else None,
            "expiry_date": si.expiry_date.isoformat() if si.expiry_date else None,
            "note": si.note,
            "image_filename": si.image_filename,
            "product": {"id": si.entries[0].product_id} if si.entries else None,

            "lot_number": lot_number_hdr,
            "lots": lots,
            "entries": entries,
            "total_unit": sum(x["total_unit"] for x in entries),
            "locked": locked,
        }), 200

    except Exception as e:
        return jsonify({"error": f"❌ Failed to fetch stock-in: {str(e)}"}), 500

# 5. API PATCH Stockin detail - fix stock-in detail for don't have sale ONLY
@stockin_bp.route('/<int:stockin_id>', methods=['PATCH'])
def patch_stockin(stockin_id: int):
    """
    PATCH /api/stock-in/<id>

    - ถ้าบางล็อตถูกใช้แล้ว (qty_remaining < qty_received) → LOCKED:
        อนุญาตเฉพาะ: created_at, note, doc_number (optional), order_image
    - ถ้ายังไม่ถูกใช้ → ลบ entries/batches/movements(IN) เดิม แล้วสร้างใหม่จาก payload
    """
    try:
        p = request.form
        order_image = request.files.get("order_image")

        # โหลดใบ + ความสัมพันธ์
        si = (
            db.session.query(StockIn)
            .options(
                joinedload(StockIn.entries).joinedload(StockInEntry.batch),
                joinedload(StockIn.batches),
            )
            .get(stockin_id)
        )
        if not si:
            return jsonify({"error": "❌ StockIn not found"}), 404

        # ตรวจ product_id จาก header (ให้ตรงกับของเดิม)
        product_id_str = p.get("product_id")
        if not product_id_str:
            return jsonify({"error": "❌ product_id is required"}), 400
        try:
            header_product_id = int(product_id_str)
        except ValueError:
            return jsonify({"error": "❌ product_id must be integer"}), 400

        # ตรวจว่า entries เดิมทั้งหมดเป็น product ไหน (ใบนี้เราใช้สินค้าตัวเดียว)
        if si.entries:
            old_pid = si.entries[0].product_id
            if old_pid != header_product_id:
                return jsonify({"error": "❌ product_id mismatch with existing stock-in"}), 400

        # เช็คสถานะถูกใช้แล้วหรือไม่
        batches_iter = si.batches if isinstance(si.batches, list) else si.batches.all()
        locked = any((b.qty_remaining or 0) < (b.qty_received or 0) for b in batches_iter)

        # ฟิลด์ที่อัปเดตได้เสมอ
        # created_at
        created_at_str = p.get("created_at")
        if created_at_str:
            try:
                si.created_at = parse_iso_datetime(created_at_str)
            except Exception:
                return jsonify({"error": "❌ created_at invalid ISO datetime"}), 400

        # note
        if "note" in p:
            si.note = p.get("note") or ""

        # doc_number (optional - ต้องไม่ซ้ำ)
        new_doc = p.get("doc_number")
        if new_doc and new_doc != si.doc_number:
            # ตรวจซ้ำ
            exists = db.session.query(StockIn.id)\
                .filter(StockIn.doc_number == new_doc, StockIn.id != si.id).first()
            if exists:
                return jsonify({"error": "❌ doc_number already exists"}), 409
            si.doc_number = new_doc

        # อัปเดตรูป (ถ้ามี) — แทนที่ไฟล์เก่า
        if order_image:
            old = getattr(si, "image_filename", None)
            if old:
                try:
                    _delete_receipt_file(old)
                except Exception:
                    pass
            filename = secure_filename(order_image.filename)
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            order_image.save(os.path.join(UPLOAD_FOLDER, filename))
            si.image_filename = filename

        # ถ้า locked → หยุดแค่นี้ (ไม่อนุญาตแก้ expiry/lot/entries)
        if locked:
            if any(k in p for k in ("expiry_date", "lot_number", "entries")):
                return jsonify({
                    "error": "❌ This StockIn has consumed batches; entries/lot/expiry cannot be modified.",
                    "hint": "อนุญาตแก้เฉพาะ created_at / note / doc_number / image",
                }), 409

            db.session.commit()
            return jsonify({"message": "✅ StockIn updated (header only: locked)"}), 200

        # ---- ยังไม่ถูกใช้: อนุญาตแก้เต็ม ----

        # expiry_date
        expiry_date = None
        if "expiry_date" in p:
            try:
                expiry_date = parse_flexible_date(p.get("expiry_date"))
            except ValueError as e:
                return jsonify({"error": f"❌ Invalid expiry_date: {str(e)}"}), 400
            si.expiry_date = expiry_date

        # header-lot (optional)
        header_lot = (p.get("lot_number") or "").strip() or None

        # entries (จำเป็นเมื่อแก้เต็ม)
        try:
            entries_data = json.loads(p.get("entries", "[]"))
        except json.JSONDecodeError:
            return jsonify({"error": "❌ entries must be valid JSON"}), 400
        if not entries_data:
            return jsonify({"error": "❌ No entries provided"}), 400

        # เริ่มปรับทั้งชุดแบบ rebuild (ปลอดภัยกว่า)
        with db.session.begin_nested():
            # 1) ลบ StockMovement(IN) ของใบนี้
            db.session.query(StockMovement)\
                .filter(StockMovement.ref_stockin_id == si.id)\
                .delete(synchronize_session=False)

            # 2) ลบ batches เดิมทั้งหมดของใบนี้
            for b in list(batches_iter):
                db.session.delete(b)

            # 3) ลบ entries เดิมทั้งหมดของใบนี้
            db.session.query(StockInEntry)\
                .filter(StockInEntry.stockin_id == si.id)\
                .delete(synchronize_session=False)

            # 4) สร้าง batches/entries ใหม่ (ตาม logic เดิมของ POST)
            default_lot = header_lot or auto_lot(si.doc_number or "GRN")
            created_batches = {}  # key: (lot, expiry) => batch

            for idx, v in enumerate(entries_data, start=1):
                variant_id        = v.get("variant_id")
                custom_sale_mode  = v.get("custom_sale_mode")
                custom_pack_size  = v.get("custom_pack_size")
                lot_number        = (v.get("lot_number") or "").strip() or default_lot

                # quantity > 0
                try:
                    quantity = int(v.get("quantity"))
                except (TypeError, ValueError):
                    return jsonify({"error": f"❌ Entry #{idx}: quantity must be integer"}), 400
                if quantity <= 0:
                    return jsonify({"error": f"❌ Entry #{idx}: quantity must be > 0"}), 400

                # ต้องมี variant หรือ custom ครบคู่
                if not variant_id and (not custom_sale_mode or not custom_pack_size):
                    return jsonify({"error": f"❌ Entry #{idx}: Need variant_id or (custom_sale_mode & custom_pack_size)"}), 400

                # pack_size_at_receipt
                pack_size_at_receipt = v.get("pack_size_at_receipt")
                if pack_size_at_receipt is None:
                    if variant_id:
                        var = db.session.get(ProductVariant, variant_id)
                        if not var:
                            return jsonify({"error": f"❌ Entry #{idx}: Variant not found"}), 404
                        pack_size_at_receipt = int(var.pack_size or 0)
                    else:
                        try:
                            pack_size_at_receipt = int(custom_pack_size)
                        except (TypeError, ValueError):
                            return jsonify({"error": f"❌ Entry #{idx}: custom_pack_size must be integer"}), 400
                try:
                    pack_size_at_receipt = int(pack_size_at_receipt)
                except (TypeError, ValueError):
                    return jsonify({"error": f"❌ Entry #{idx}: pack_size_at_receipt must be integer"}), 400
                if pack_size_at_receipt <= 0:
                    return jsonify({"error": f"❌ Entry #{idx}: pack_size_at_receipt must be > 0"}), 400

                base_qty = pack_size_at_receipt * quantity

                # หา/สร้าง batch ใหม่ของ (stockin, product, lot, expiry)
                key = (lot_number, si.expiry_date)
                batch = created_batches.get(key)
                if not batch:
                    batch = StockBatch(
                        stockin_id=si.id,
                        product_id=header_product_id,
                        lot_number=lot_number,
                        expiry_date=si.expiry_date,
                        qty_received=0,
                        qty_remaining=0,
                    )
                    db.session.add(batch)
                    db.session.flush()
                    created_batches[key] = batch

                batch.qty_received += base_qty
                batch.qty_remaining += base_qty
                db.session.add(batch)

                entry = StockInEntry(
                    stockin_id=si.id,
                    product_id=header_product_id,
                    variant_id=variant_id,
                    custom_sale_mode=(None if variant_id else custom_sale_mode),
                    custom_pack_size=(None if variant_id else custom_pack_size),
                    pack_size_at_receipt=pack_size_at_receipt,
                    quantity=quantity,
                    batch_id=batch.id,
                )
                db.session.add(entry)

                # บันทึก movement(IN) ใหม่
                db.session.add(StockMovement(
                    product_id=header_product_id,
                    batch_id=batch.id,
                    movement_type="IN",
                    qty=base_qty,
                    batch_qty_remaining=int(batch.qty_remaining),
                    ref_stockin_id=si.id,
                    note=f"EDIT StockIn #{si.id}",
                ))

        db.session.commit()
        return jsonify({
            "message": "✅ StockIn updated",
            "stockin_id": si.id,
            "locked": False
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"error": f"❌ DB error: {str(e)}"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500