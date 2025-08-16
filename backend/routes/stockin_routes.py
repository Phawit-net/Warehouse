from flask import abort, Blueprint, jsonify, request, send_from_directory
from model import ProductVariant, db,Product, StockIn, StockInEntry
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime, timezone
from sqlalchemy.orm import joinedload
import traceback

stockin_bp = Blueprint('stockin_bp', __name__, url_prefix='/api/stock-in')

# 🛠 ตั้งค่า path ที่จะเก็บไฟล์ (แก้ตามโครงสร้างจริงของคุณ)
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads/receipts')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# API - ที่เกี่ยวกับ STOCKIN ทั้งหมด
# 1. API POST - add new stockin
@stockin_bp.route('/', methods=['POST'])
def create_stockin():
    try:
        data = request.form
        order_image = request.files.get("order_image")

        # ✅ เช็ค product_id
        product_id = data.get("product_id")
        if not product_id:
            return jsonify({"error": "❌ Missing product_id"}), 400
        product = db.session.get(Product, product_id)
        if not product:
            return jsonify({"error": "❌ Product not found"}), 404

        
        # ✅ แปลง created_at เป็น datetime object
        created_at_str = data.get("created_at")
        expiry_date_str = data.get("expiry_date")
        try:
            created_at = datetime.fromisoformat(created_at_str) if created_at_str else datetime.now(timezone.utc)
            expiry_date = datetime.fromisoformat(expiry_date_str) if expiry_date_str else datetime.now(timezone.utc)
        except ValueError:
            return jsonify({"error": "❌ Invalid datetime format"}), 400
        
        # ✅ จัดการไฟล์ภาพ
        image_filename = None
        if order_image:
            filename = secure_filename(order_image.filename)
            image_path = os.path.join(UPLOAD_FOLDER, filename)
            order_image.save(image_path)
            image_filename = filename


        # ✅ สร้าง StockIn object
        new_stockin = StockIn(
            product_id=product_id,
            created_at=created_at,
            expiry_date=expiry_date,
            note=data.get("note", ""),
            lot_number=data.get("lot_number"),
            image_filename=image_filename
        )

        # ✅ เพิ่ม Entries
        entries_data = json.loads(data.get("entries", "[]"))
        if not entries_data:
            return jsonify({"error": "❌ No entries provided"}), 400
        
        for v in entries_data:
            variant_id = v.get("variant_id")
            quantity = v.get("quantity")
            custom_sale_mode = v.get("custom_sale_mode")
            custom_pack_size = v.get("custom_pack_size")

            if not quantity:
                return jsonify({"error": "❌ Missing quantity in an entry"}), 400

            # ✅ ตรวจสอบให้กรอก variant_id หรือ custom ให้ครบอย่างใดอย่างหนึ่ง
            if not variant_id and (not custom_sale_mode or not custom_pack_size):
                return jsonify({"error": "❌ Each entry must have either a variant_id or both custom_sale_mode and custom_pack_size"}), 400

            # ⭐ ส่วนที่แก้ไข: ดึง pack_size จากฐานข้อมูล
            pack_size_at_receipt  = 0
            if variant_id:
                variant = db.session.get(ProductVariant, variant_id)
                if not variant:
                    return jsonify({"error": f"❌ Variant with id {variant_id} not found"}), 404
                pack_size_at_receipt  = variant.pack_size
            else:
                pack_size_at_receipt  = custom_pack_size

            entry = StockInEntry(
                variant_id=variant_id,
                quantity=quantity,
                custom_sale_mode=custom_sale_mode,
                custom_pack_size=custom_pack_size,
                pack_size_at_receipt=pack_size_at_receipt,
            )
            new_stockin.entries.append(entry)

        db.session.add(new_stockin)
        db.session.commit()

        total_stock = 0
        for entry in new_stockin.entries:
            # ใช้ pack_size_at_receipt ที่บันทึกไว้
            total_stock += entry.pack_size_at_receipt * entry.quantity

        # ✅ STEP 4: อัปเดต stock ใน Product
        product.stock += total_stock # ✅ แก้ไข: ควรใช้ += เพื่อเพิ่ม stock ไม่ใช่กำหนดค่าใหม่
        db.session.commit()

        return jsonify({"message": "✅ StockIn created successfully", "stockin_id": new_stockin.id}), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Database error: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500
    
# 2. API GET - get stockin by product ID
@stockin_bp.route('/<int:product_id>', methods=['GET'])
def get_stockins_by_product(product_id):
    try:
        # 🔍 ดึง stock-in ทั้งหมดของสินค้านี้ และ load entries + variant แบบ eager
        stockins = (
            db.session.query(StockIn)
            .filter(StockIn.product_id == product_id)
            .options(joinedload(StockIn.entries).joinedload(StockInEntry.variant))
            .order_by(StockIn.created_at.desc())
            .all()
        )
        result = []
        for stockin in stockins:
            entries_data = []

            for entry in stockin.entries:
                # คำนวณ pack_size (ถ้าใช้ variant เดิม หรือ custom)
                pack_size_at_receipt  = entry.pack_size_at_receipt
                if entry.variant:
                    sale_mode = entry.variant.sale_mode
                else:
                    sale_mode = entry.custom_sale_mode

                total_unit = pack_size_at_receipt  * entry.quantity if pack_size_at_receipt  else 0

                entries_data.append({
                    "quantity": entry.quantity,
                    "sale_mode": sale_mode,
                    "pack_size": pack_size_at_receipt ,
                    "total_unit": total_unit
                })

            # รวม total_unit ของ stockin รายการนี้
            total_unit = sum(e["total_unit"] for e in entries_data)

            result.append({
                "id": stockin.id,
                "lot_number":stockin.lot_number,
                "mfg_date":stockin.mfg_date,
                "expiry_date":stockin.expiry_date,
                "note": stockin.note,
                "image_filename": stockin.image_filename,
                "created_at": stockin.created_at.isoformat(),
                "entries": entries_data,
                "total_unit": total_unit,
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
        stock_in = StockIn.query.get(stock_in_id)
        if not stock_in:
            return jsonify({"error": "StockIn not found"}), 404
        
        # ดึง product ก่อนที่จะลบ stock_in
        product = stock_in.product
        if not product:
            return jsonify({"error": "❌ Associated Product not found"}), 404

       # คำนวณจำนวน unit ที่ต้องลบออกจาก stock
        amount_to_deduct = 0
        for item in stock_in.entries:
            # ⭐ แก้ไข: ใช้ pack_size_at_receipt ที่บันทึกไว้
            pack_size = item.pack_size_at_receipt
            amount_to_deduct += pack_size * item.quantity
        
        # อัปเดต stock ใน Product ก่อนลบ
        product.stock -= amount_to_deduct
        
        # ลบ StockIn หลัก ซึ่งจะลบ StockInEntry ด้วย เพราะใช้ cascade='all, delete-orphan'
        db.session.delete(stock_in)
        db.session.commit()

        return jsonify({"message": "✅ StockIn deleted and stock adjusted"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        # ควร import traceback
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"❌ Database error: {str(e)}"}), 500
    except Exception as e:
        # ควร import traceback
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500