from flask import abort, Blueprint, current_app, jsonify, request, send_from_directory
from model import Sale, SaleItem, StockBatch, StockIn, StockInEntry, StockMovement, db, Product, ProductVariant, ProductImage
from werkzeug.utils import secure_filename
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.exc import SQLAlchemyError
import os
import json
import uuid
from sqlalchemy import func

product_bp = Blueprint('product_bp', __name__, url_prefix='/api/inventory')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif','webp'}
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')  # สมมุติว่าอัปโหลดไว้ที่นี่

# Utility
# function file extension ให้เช็คนามสกุลไฟล์
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# function generate ชื่อแบบไม่ซ้ำกัน
def generate_unique_filename(filename):
    ext = filename.rsplit(".", 1)[-1]
    return f"{uuid.uuid4().hex}.{ext}"

# function save file ไปที่ folder Upload
def save_image(file):
    filename = generate_unique_filename(secure_filename(file.filename))
    file.save(os.path.join(UPLOAD_FOLDER, filename))
    return filename

# function delete file ที่ folder Upload
def delete_image_file(filename):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(path):
        os.remove(path)

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

# API - ที่เกี่ยวกับ PRODUCTS ทั้งหมด
# 1. API GET - get all product
@product_bp.route('/', methods=['GET'])
def get_all_products():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        offset = (page - 1) * limit

        # สรุป stock ต่อสินค้า จาก StockBatch
        stock_subq = (
            db.session.query(
                StockBatch.product_id.label('pid'),
                func.coalesce(func.sum(StockBatch.qty_remaining), 0).label('stock_qty')
            )
            .group_by(StockBatch.product_id)
            .subquery()
        )

        # ดึง Product + stock รวม (LEFT JOIN เผื่อสินค้าที่ไม่มี batch เลย → 0)
        rows = (
            db.session.query(
                Product,
                func.coalesce(stock_subq.c.stock_qty, 0).label('stock_total')
            )
            .outerjoin(stock_subq, stock_subq.c.pid == Product.id)
            .options(
                selectinload(Product.images),
                selectinload(Product.variants),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

        total = db.session.query(func.count(Product.id)).scalar()

        data = []
        for p, stock_total in rows:
            data.append({
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "category": p.category,
                "unit": p.unit,
                "cost_price": p.cost_price,
                # ใช้ stock_total จาก StockBatch (เลิกใช้ p.stock)
                "stock": int(stock_total or 0),
                "has_expire": getattr(p, "has_expire", None),
                "variants": getattr(p, "serialized_variants", []),
                "images": [
                    {"filename": img.image_filename, "is_main": img.is_main}
                    for img in p.images
                ],
            })

        result = {
            "data": data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"❌ Failed to fetch products: {str(e)}"}), 500


# 2. API POST - add new product
@product_bp.route('/', methods=['POST'])
def create_product():
    data = request.form
    main_image = request.files.get("main_image")
    other_images = request.files.getlist("other_images")

    try:
        # 📌 Validate required fields (optional เพิ่มเติม)
        required_fields = ["name", "sku", "category", "unit", "cost_price", "variants"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"❌ Missing required field: {field}"}), 400

        # ✅ สร้าง Product
        new_product = Product(
            name=data["name"],
            sku=data["sku"],
            category=data["category"],
            unit=data["unit"],
            cost_price=data["cost_price"],
            has_expire=str(data["has_expire"]).lower() == "true"
        )

        # ✅ เพิ่ม Variants
        variants_data = json.loads(data["variants"])
        for v in variants_data:
            variant = ProductVariant(
                sku_suffix=v["sku_suffix"],
                sale_mode=v["sale_mode"],
                pack_size=v["pack_size"],
                selling_price=v["selling_price"],
                is_active = v["is_active"]
            )
            new_product.variants.append(variant)
        db.session.add(new_product)
        db.session.flush()

        
        # สร้างโฟลเดอร์หากยังไม่มี
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

        # ✅ บันทึก main image
        if main_image and allowed_file(main_image.filename):
            filename = save_image(main_image)
            db.session.add(ProductImage(product_id=new_product.id, image_filename=filename, is_main=True))

        # ✅ บันทึก other images
        for img in other_images:
            if img and allowed_file(img.filename):
                filename = save_image(img)
                db.session.add(ProductImage(product_id=new_product.id, image_filename=filename, is_main=False))

        db.session.commit()
        return jsonify({"message": "✅ Product and variants created successfully!"}), 201

    except SQLAlchemyError as e:
            db.session.rollback()
            return jsonify({"error": f"❌ Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500
    
    
# 3. API File serving - serve image when call API path from front-end
@product_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    # ✅ ป้องกัน path traversal เช่น "../../etc/passwd"
    filename = secure_filename(filename)

    # ✅ เช็คว่าไฟล์มีจริงก่อนส่ง
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        abort(404, description="📁 File not found")

    # ✅ ส่งไฟล์แบบปลอดภัย
    return send_from_directory(UPLOAD_FOLDER, filename)


# 4. API DELETE - delete product + relationship of product
@product_bp.route('/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        # กัน autoflush ระหว่างที่เรายังเตรียมข้อมูล/ตรวจเงื่อนไข
        with db.session.no_autoflush:
            product = (
                db.session.query(Product)
                .options(
                    selectinload(Product.images),
                    selectinload(Product.variants),
                )
                .get(product_id)
            )
            if not product:
                return jsonify({"error": "ไม่พบสินค้า"}), 404

            # 1) หา StockIn ทั้งหมดที่เกี่ยวข้อง (header ของใบที่เคยรับสินค้านี้)
            stockins = (
                db.session.query(StockIn)
                .join(StockIn.entries)
                .filter(StockInEntry.product_id == product_id)
                .options(
                    joinedload(StockIn.entries),
                    joinedload(StockIn.batches),
                )
                .distinct()
                .all()
            )
            stockin_ids = [si.id for si in stockins]

            # 2) หา Batch ทั้งหมดของสินค้านี้
            batches = (
                db.session.query(StockBatch)
                .filter(StockBatch.product_id == product_id)
                .all()
            )
            batch_ids = [b.id for b in batches]

            # 3) Guard: มี “ประวัติการขาย” ของสินค้านี้หรือไม่ → ถ้ามี ห้ามลบ
            sale_item_count = db.session.query(SaleItem)\
                .filter(SaleItem.product_id == product_id).count()
            if sale_item_count > 0:
                return jsonify({
                    "error": "❌ ลบไม่ได้: พบประวัติการขายของสินค้านี้",
                    "sale_items": sale_item_count
                }), 409

            # 4) Guard: มีล็อตที่ถูกใช้ไปแล้วหรือไม่ → ถ้ามี ห้ามลบ
            used_batches = [
                {
                    "batch_id": b.id,
                    "lot_number": b.lot_number,
                    "qty_received": int(b.qty_received or 0),
                    "qty_remaining": int(b.qty_remaining or 0),
                    "stockin_id": int(b.stockin_id or 0),
                }
                for b in batches
                if (b.qty_remaining or 0) < (b.qty_received or 0)
            ]
            if used_batches:
                return jsonify({
                    "error": "❌ ลบไม่ได้: มีล็อตของสินค้านี้ถูกใช้งานไปแล้ว",
                    "conflicts": used_batches,
                    "hint": "ยกเลิกรายการขายที่ใช้ล็อตเหล่านี้ก่อน (หรือทำ flow void/adjust) แล้วค่อยลบสินค้า"
                }), 409

        # ---- เริ่มลบตามลำดับปลอดภัย ----
        with db.session.begin_nested():
            # A) SET NULL FK ที่อาจชนตอนลบ batch (กัน FK fail ใน SQLite/schema เก่า)
            if batch_ids:
                db.session.query(StockInEntry)\
                    .filter(StockInEntry.product_id == product_id,
                            StockInEntry.batch_id.in_(batch_ids))\
                    .update({StockInEntry.batch_id: None}, synchronize_session=False)

            # B) ลบ movement ที่อ้างใบรับเข้า (IN) ของสินค้า (ref_stockin_id)
            if stockin_ids:
                db.session.query(StockMovement)\
                    .filter(StockMovement.ref_stockin_id.in_(stockin_ids))\
                    .delete(synchronize_session=False)

            # C) ลบ movement ใด ๆ ที่อ้าง batch ของสินค้านี้ (ปกติจะมีแต่ IN; เผื่อไว้)
            if batch_ids:
                db.session.query(StockMovement)\
                    .filter(StockMovement.batch_id.in_(batch_ids))\
                    .delete(synchronize_session=False)

            # D) ลบ Batch ทีละ instance (อย่า bulk ถ้าเราโหลด instance มาแล้ว)
            for b in batches:
                db.session.delete(b)

            # E) ลบ StockInEntry ของสินค้านี้ทั้งหมด
            db.session.query(StockInEntry)\
                .filter(StockInEntry.product_id == product_id)\
                .delete(synchronize_session=False)

            # F) ลบ StockIn header ที่ “ไม่มี entries เหลือ” แล้ว
            for si in stockins:
                remain = db.session.query(func.count(StockInEntry.id))\
                    .filter(StockInEntry.stockin_id == si.id).scalar()
                if remain == 0:
                    # ลบไฟล์รูปของใบรับเข้า (ถ้ามี)
                    try:
                        _delete_receipt_file(getattr(si, "image_filename", None))
                    except Exception:
                        pass
                    db.session.delete(si)

            # G) ลบรูปภาพไฟล์ + rows ของสินค้า
            for img in list(product.images):
                try:
                    delete_image_file(img.image_filename)
                except Exception as file_err:
                    print(f"⚠️ ลบไฟล์รูปไม่สำเร็จ: {img.image_filename}: {file_err}")
                db.session.delete(img)

            # H) ลบ variants ของสินค้า
            for v in list(product.variants):
                db.session.delete(v)

            # I) ลบ product หลัก
            db.session.delete(product)

        db.session.commit()
        return jsonify({"message": "✅ ลบสินค้าสำเร็จ!"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
# 5. API GET - get product by ID
@product_bp.route('/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        return jsonify({
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "category": product.category,
            "unit": product.unit,
            "cost_price": product.cost_price,
            "stock": product.stock,
            "has_expire":product.has_expire,
            "variants": product.serialized_variants,
            "images": [
                {
                    "filename": img.image_filename,
                    "is_main": img.is_main
                }
                for img in product.images
            ]
        }), 200
    
    except Exception as e:
        print("❌ ERROR:", e)
        return jsonify({"error": "เกิดข้อผิดพลาดขณะดึงข้อมูลสินค้า"}), 500

@product_bp.route('/<int:product_id>', methods=['PATCH'])
def update_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        data = request.form

        # ---------- helpers ----------
        def to_bool(x):
            if x is None:
                return None
            return str(x).strip().lower() in ('true','1','yes','y','on')

        def to_float(x, field):
            if x is None or x == '':
                return None
            try:
                return float(x)
            except ValueError:
                raise ValueError(f"{field} must be a number")

        # ---------- 1) update product fields with casting ----------
        if 'name' in data:       product.name = data['name']
        if 'sku' in data:        product.sku = data['sku']
        if 'category' in data:   product.category = data['category']
        if 'unit' in data:       product.unit = data['unit']
        if 'cost_price' in data:
            val = to_float(data.get('cost_price'), 'cost_price')
            if val is None:
                product.cost_price = 0.0
            else:
                product.cost_price = val
        if 'has_expire' in data:
            bv = to_bool(data.get('has_expire'))
            if bv is None:
                # ถ้าอยาก ignore ให้ไม่ตั้งค่าเมื่อ None ก็ลบทิ้ง 2 บรรทัดนี้ได้
                return jsonify({"error": "❌ has_expire must be boolean"}), 400
            product.has_expire = bv

        # ---------- 2) upsert variants (no bulk delete) ----------
        variants_payload = json.loads(data.get("variants", "[]"))

        # map ของเก่า
        old_variants = {v.id: v for v in ProductVariant.query.filter_by(product_id=product.id).all()}
        seen_ids = set()

        for v in variants_payload:
            vid = v.get("id")
            # casting
            try:
                pack_size = int(v["pack_size"])
            except (KeyError, ValueError, TypeError):
                return jsonify({"error": "❌ variant.pack_size must be integer"}), 400

            try:
                selling_price = float(v["selling_price"])
            except (KeyError, ValueError, TypeError):
                return jsonify({"error": "❌ variant.selling_price must be number"}), 400

            is_active = bool(v.get("is_active", True))

            if vid and vid in old_variants:
                # update
                ov = old_variants[vid]
                ov.sku_suffix    = v["sku_suffix"]
                ov.sale_mode     = v["sale_mode"]
                ov.pack_size     = pack_size
                ov.selling_price = selling_price
                ov.is_active     = is_active
                seen_ids.add(vid)
            else:
                # create
                nv = ProductVariant(
                    product_id=product.id,
                    sku_suffix=v["sku_suffix"],
                    sale_mode=v["sale_mode"],
                    pack_size=pack_size,
                    selling_price=selling_price,
                    is_active=is_active
                )
                db.session.add(nv)

        # ตัวที่ถูกเอาออกจาก payload
        removed = [ov for oid, ov in old_variants.items() if oid not in seen_ids]
        for ov in removed:
            used_in_stockin = db.session.query(StockInEntry.id)\
                .filter(StockInEntry.variant_id == ov.id).first()
            used_in_sale = db.session.query(SaleItem.id)\
                .filter(SaleItem.variant_id == ov.id).first()
            if used_in_stockin or used_in_sale:
                ov.is_active = False  # soft remove
            else:
                db.session.delete(ov)

        # ---------- 3) images ----------
        main_image = request.files.get("main_image")
        if main_image:
            old_main = ProductImage.query.filter_by(product_id=product.id, is_main=True).first()
            if old_main:
                try:
                    delete_image_file(old_main.image_filename)
                except Exception:
                    pass
                db.session.delete(old_main)

            new_filename = save_image(main_image)
            db.session.add(ProductImage(product_id=product.id, image_filename=new_filename, is_main=True))

        other_images = request.files.getlist("other_images")
        for image in other_images:
            if image and image.filename:
                filename = save_image(image)
                db.session.add(ProductImage(product_id=product.id, image_filename=filename, is_main=False))

        images_to_delete = request.form.getlist("images_to_delete")
        for filename in images_to_delete:
            try:
                delete_image_file(filename)
            except Exception:
                pass
            ProductImage.query\
                .filter_by(image_filename=filename, product_id=product.id)\
                .delete(synchronize_session=False)

        db.session.commit()
        return jsonify({"message": "✅ Product updated successfully!"}), 200

    except FileNotFoundError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ File not found: {str(e)}"}), 400

    except (ValueError, TypeError) as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Invalid data: {str(e)}"}), 400

    except SQLAlchemyError as e:
        db.session.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"error": f"❌ DB: {str(e)}"}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500

# 7. API Checking Hard Delete in Edit Product
@product_bp.route('/variant/<int:variant_id>', methods=['DELETE'])
def hard_delete_variant(variant_id):
    """
    API สำหรับลบ ProductVariant ถาวร (Hard Delete)
    - มีการตรวจสอบว่ามีข้อมูล StockIn หรือ SaleOrder ที่อ้างอิงอยู่หรือไม่
    - หากพบ จะไม่อนุญาตให้ลบ
    """
    try:
        # 1. ค้นหา ProductVariant ที่ต้องการลบ
        variant = db.session.get(ProductVariant, variant_id)
        if not variant:
            return jsonify({"error": "❌ ProductVariant not found"}), 404

        # 2. ⭐ ตรวจสอบความเกี่ยวข้องกับ StockIn
        related_stockinEntry = db.session.query(StockInEntry).filter_by(variant_id=variant_id).first()
        if related_stockinEntry:
            return jsonify({
                "error": "❌ Cannot delete variant. It is linked to existing stock-in records."
            }), 409 # HTTP 409 Conflict

        # 3. ⭐ ตรวจสอบความเกี่ยวข้องกับ Sale
        related_saleorder = db.session.query(Sale).filter_by(variant_id=variant_id).first()
        if related_saleorder:
            return jsonify({
                "error": "❌ Cannot delete variant. It is linked to existing sales orders."
            }), 409 # HTTP 409 Conflict

        # 4. หากไม่มีข้อมูลเกี่ยวข้อง จึงดำเนินการลบ
        db.session.delete(variant)
        db.session.commit()
        
        return jsonify({"message": f"✅ ProductVariant {variant_id} deleted permanently"}), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500