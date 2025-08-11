import math
from flask import abort, Blueprint, jsonify, request, send_from_directory
from model import ProductVariant, db,Product, StockIn, StockInEntry, SalesChannel, Sale
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime
from sqlalchemy.orm import selectinload
import traceback

sale_bp = Blueprint('sale_bp', __name__, url_prefix='/api/sale')

# 1. API POST - create sale order
@sale_bp.route('/', methods=['POST'])
def create_sale_order():
    try:
        # ⭐STEP 1: ดึงข้อมูลจาก form และแปลงชนิดข้อมูลให้ถูกต้อง
        data = request.form

        # ตรวจสอบข้อมูลที่จำเป็นต้องมี
        required_fields = ["channel_id", "variant_id", "quantity", "sale_price"]
        for field in required_fields:
            if field not in data or not data.get(field):
                return jsonify({"error": f"❌ '{field}' is a required field"}), 400
        try:
            product_id = int(data.get("product_id"))
            channel_id = int(data.get("channel_id"))
            variant_id = int(data.get("variant_id"))
            quantity = int(data.get("quantity"))
            sale_price = float(data.get("sale_price"))
            shipping_fee = float(data.get("shipping_fee", 0.0))
            platform_discount = float(data.get("platform_discount", 0.0))
            shop_discount = float(data.get("shop_discount", 0.0))
            coin_discount = float(data.get("coin_discount", 0.0))
        except (ValueError, TypeError) as e:
            return jsonify({"error": f"❌ Invalid data type in form: {e}"}), 400

        # ดึงข้อมูล product ใช้เพื่อ update stock
        product = db.session.get(Product, product_id)
        if not product:
            return jsonify({"error": "❌ Product not found"}), 404

        # ⭐ STEP 2: ดึงข้อมูล Denormalize จากตารางที่เกี่ยวข้อง
        variant = db.session.get(ProductVariant, variant_id)
        if not variant:
            return jsonify({"error": "❌ ProductVariant not found"}), 404
        
        channel = db.session.get(SalesChannel, channel_id)
        if not channel:
            return jsonify({"error": "❌ SalesChannel not found"}), 404

        # ⭐ STEP 3: คำนวณค่าทั้งหมดที่ต้องใช้ ข้อมูล Denormalize
        pack_size_at_sale = variant.pack_size
        sale_mode_at_sale = variant.sale_mode
        commission_percent_at_sale = channel.commission_percent
        transaction_percent_at_sale = channel.transaction_percent

        # คำนวณราคาสุทธิ
        total_price = quantity * sale_price
        # คำนวณยอดที่ลูกค้าจ่าย (รวมส่วนลดและค่าส่ง)
        customer_pay = total_price - shop_discount - platform_discount - coin_discount + shipping_fee
        # คำนวณค่าธรรมเนียม
        commission_fee = math.floor(total_price * (commission_percent_at_sale / 100))
        transaction_fee = round((customer_pay + platform_discount + coin_discount) * (transaction_percent_at_sale / 100), 2)
        # คำนวณยอดเงินที่ผู้ขายได้รับและ VAT
        seller_receive = total_price - commission_fee - transaction_fee - shop_discount
        vat_amount = (commission_fee + transaction_fee) * 7 / 107
  
        # แปลง date time
        sale_date_str = data.get("sale_date")
        try:
            sale_date = datetime.fromisoformat(sale_date_str) if sale_date_str else datetime.utcnow()
        except ValueError:
            return jsonify({"error": "❌ Invalid datetime format"}), 400
  
        # ⭐⭐⭐ เพิ่มโค้ดสำหรับหักสต็อกที่นี่ ⭐⭐⭐
        stock_to_deduct = pack_size_at_sale * quantity
        if product.stock < stock_to_deduct:
            return jsonify({"error": "❌ Insufficient stock"}), 400
        
        # หักสต็อก
        product.stock -= stock_to_deduct

        # ⭐ STEP 4: สร้าง Object และบันทึกลง DB
        new_sale_order = Sale(
            product_id=product_id,
            variant_id=variant_id,
            channel_id=channel_id,
            sale_date=sale_date,
            customer_name=data.get("customer_name"),
            province=data.get("province"),
            quantity=quantity,
            sale_price=sale_price,
            
            # บันทึกข้อมูล Denormalize
            pack_size_at_sale=pack_size_at_sale,
            sale_mode_at_sale=sale_mode_at_sale,
            channel_name_at_sale=channel.channel_name,
            commission_percent_at_sale=commission_percent_at_sale,
            transaction_percent_at_sale=transaction_percent_at_sale,

            # บันทึกค่าที่คำนวณได้ทั้งหมด
            total_price=total_price,
            shipping_fee=shipping_fee,
            shop_discount=shop_discount,
            platform_discount=platform_discount,
            coin_discount=coin_discount,
            customer_pay=customer_pay,
            commission_fee=commission_fee,
            transaction_fee=transaction_fee,
            seller_receive=seller_receive,
            vat_amount=vat_amount,
        )

        db.session.add(new_sale_order)
        db.session.commit()

        return jsonify({"message": "✅ Sale order created successfully", "sale_id": new_sale_order.id}), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Database error: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500
    
# 2. API GET - get all sale orders by Product Id with pagination
@sale_bp.route("/<int:product_id>", methods=["GET"])
def get_all_sale_orders(product_id):
    try:
        # ✅ ดึงค่า pagination จาก query parameter
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        offset = (page - 1) * limit

        # ✅ ใช้ eager loading เพื่อดึงข้อมูล Sale ที่มีข้อมูล Variant และ Channel อยู่ด้วย
        sales_orders = (
            db.session.query(Sale)
            .options(
                selectinload(Sale.variant),
                selectinload(Sale.channel)
            )
            .filter(Sale.product_id == product_id)
            .offset(offset)
            .limit(limit)
            .all()
        )
        
        total = db.session.query(Sale).count()
        
        # ✅ สร้างโครงสร้าง JSON response ที่มี data และ pagination
        result = {
            "data": [
                {
                    "id": s.id,
                    "sale_date": s.sale_date.isoformat(),
                    "customer_name": s.customer_name,
                    "province": s.province,
                    "quantity": s.quantity,
                    "sale_price": s.sale_price,
                    "pack_size_at_sale": s.pack_size_at_sale,
                    "sale_mode_at_sale": s.sale_mode_at_sale,
                    # ดึงข้อมูลจาก object ที่ถูก eager load มาใช้
                    "shipping_fee":s.shipping_fee,
                    "shop_discount":s.shop_discount,
                    "platform_discount":s.platform_discount,
                    "coin_discount":s.coin_discount,
                    "channel_name_at_sale":s.channel_name_at_sale,
                    "seller_receive": s.seller_receive,
                    "commission_percent_at_sale":s.commission_percent_at_sale,
                    "transaction_percent_at_sale":s.transaction_percent_at_sale,
                    "total_price":s.total_price,
                    "vat_amount":s.vat_amount,
                    "seller_receive":s.seller_receive,
                    "customer_pay":s.customer_pay,
                    "commission_fee": s.commission_fee,
                    "transaction_fee": s.transaction_fee,
                }
                for s in sales_orders
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500

#3. API DELETE - delete a sale order
@sale_bp.route("/<int:sale_id>", methods=["DELETE"])
def delete_sale_order(sale_id):
    try:
        # ⭐ ค้นหา sale order ด้วย ID
        sale_order = db.session.get(Sale, sale_id)
        if not sale_order:
            return jsonify({"error": "❌ Sale order not found"}), 404
        
        # ⭐⭐⭐ เพิ่มโค้ดสำหรับคืนสต็อกที่นี่ ⭐⭐⭐
        # ค้นหา product ที่เกี่ยวข้อง
        product = db.session.get(Product, sale_order.product_id)
        if not product:
            # ถ้าไม่พบ product ให้ส่งข้อความ error แต่ยังคงลบ sale order
            print(f"⚠️ Warning: Product with ID {sale_order.product_id} not found. Cannot restore stock.")

        # คำนวณสต็อกที่ต้องคืน
        stock_to_add = sale_order.pack_size_at_sale * sale_order.quantity
        
        # คืนสต็อก
        product.stock += stock_to_add
        
        # ⭐ ลบ object จาก session และ commit
        db.session.delete(sale_order)
        db.session.commit()
        
        return jsonify({"message": f"✅ Sale order with id {sale_id} deleted successfully"}), 200
    
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Database error: {str(e)}"}), 500
    
    except Exception as e:
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500