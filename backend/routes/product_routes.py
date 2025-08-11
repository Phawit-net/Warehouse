from flask import abort, Blueprint, jsonify, request, send_from_directory
from model import Sale, StockIn, StockInEntry, db, Product, ProductVariant, ProductImage
from werkzeug.utils import secure_filename
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
import os
import json
import uuid

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

# API - ที่เกี่ยวกับ PRODUCTS ทั้งหมด
# 1. API GET - get all product
@product_bp.route('/', methods=['GET'])
def get_all_products():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        offset = (page - 1) * limit

        products = (
            Product.query
            .options(
                selectinload(Product.images),
                selectinload(Product.variants)
            )
            .offset(offset)
            .limit(limit)
            .distinct()
            .all()
        )

        total = Product.query.count()

        result = {
            "data":[
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "category": p.category,
                "unit": p.unit,
                "cost_price": p.cost_price,
                "stock": p.stock,
                "variants": p.serialized_variants,
                "images": [
                    {
                        "filename": img.image_filename,
                        "is_main": img.is_main
                    } for img in p.images
                ],
            }
            for p in products
        ], 
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }}
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
            cost_price=data["cost_price"]
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
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "ไม่พบสินค้า"}), 404

        # 🔁 ลบ stock-in ทั้งหมดของ product นี้
        StockIn.query.filter_by(product_id=product.id).delete(synchronize_session=False)

        # 🔁 ลบภาพทั้งหมดของสินค้านี้ (ทั้ง DB และไฟล์)
        for img in product.images:
            try:
                delete_image_file(img.image_filename)
            except Exception as file_err:
                print(f"⚠️ ไม่สามารถลบไฟล์: {img.image_filename}: {file_err}")
            db.session.delete(img)

        #  🔁 ลบ variants ที่เกี่ยวข้องแบบ bulk (ถ้าไม่มี foreign key cascade)
        ProductVariant.query.filter_by(product_id=product.id).delete(synchronize_session=False)

        # ✅ ลบ product หลัก
        db.session.delete(product)
        db.session.commit()

        return jsonify({"message": "✅ ลบสินค้าสำเร็จ!"}), 200

    except Exception as e:
        print("❌ ERROR:", e)
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

# 6. API Update product - change specific product data by ID
@product_bp.route('/<int:product_id>', methods=['PATCH'])
def update_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        data = request.form

        # 🎯 1. อัปเดตข้อมูลทั่วไป
        fields = ["name", "sku", "category", "unit", "cost_price"]
        for field in fields:
            if field in data:
                setattr(product, field, data.get(field))

        # 🎯 2. อัปเดต Variants (ลบของเก่า เพิ่มใหม่)
        ProductVariant.query.filter_by(product_id=product.id).delete()
        variants_data = json.loads(data.get("variants", "[]"))
        db.session.bulk_save_objects([
            ProductVariant(
                product_id=product.id,
                sku_suffix=v["sku_suffix"],
                sale_mode=v["sale_mode"],
                pack_size=v["pack_size"],
                selling_price=v["selling_price"],
                is_active=v["is_active"]
            ) for v in variants_data
        ])

        # 🎯 3.อัพรูปภาพใหม่ (ถ้ามีอัปโหลดใหม่มา)
        main_image = request.files.get("main_image")
        if main_image:
            old_main = ProductImage.query.filter_by(product_id=product.id, is_main=True).first()
            if old_main:
                delete_image_file(old_main.image_filename)
                db.session.delete(old_main)

            new_filename = save_image(main_image)
            db.session.add(ProductImage(product_id=product.id, image_filename=new_filename, is_main=True))

        other_images = request.files.getlist("other_images")
        for image in other_images:
            if image and image.filename:
                filename = save_image(image)
                db.session.add(ProductImage(product_id=product.id, image_filename=filename, is_main=False))


        # 4.จัดการรูปภาพที่เราลบออกไปดูใน images_to_delete
        images_to_delete = request.form.getlist("images_to_delete")
        for filename in images_to_delete:
            delete_image_file(filename)
            ProductImage.query.filter_by(image_filename=filename, product_id=product.id).delete()

        db.session.commit()
        return jsonify({"message": "✅ Product updated successfully!"}), 200

    except FileNotFoundError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ File not found: {str(e)}"}), 400

    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Invalid data: {str(e)}"}), 400

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "❌ Database error occurred."}), 500

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