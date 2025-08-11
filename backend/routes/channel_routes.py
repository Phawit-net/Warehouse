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

channel_bp = Blueprint('channel_bp', __name__, url_prefix='/api/channel')

# 1. API POST - add new Sale Channel
@channel_bp.route('/', methods=['POST'])
def create_stockin():
    try:
        data = request.form
        channel_name = data.get("channel_name")
        if not channel_name:
            return jsonify({"error": "❌ channel_name is required"}), 400
        
        try:
            # ใช้ .get() เพื่อป้องกัน KeyError และใช้ float() เพื่อแปลงชนิด
            commission_percent = float(data.get("commission_percent", 0))
            transaction_percent = float(data.get("transaction_percent", 0))
            # is_active ไม่ได้ส่งมาจาก frontend แต่คุณสามารถกำหนดค่า default ได้
            is_active = True

        except (ValueError, TypeError):
            return jsonify({"error": "❌ Invalid data type for percentages"}), 400
        
        new_channel = SalesChannel(
            channel_name = channel_name,
            commission_percent = commission_percent,
            transaction_percent = transaction_percent,
            is_active = is_active,
        )
        db.session.add(new_channel)
        db.session.commit()
        
        return jsonify({"message": "✅ Sale Channel created successfully", "Channel_id": new_channel.id}), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Database error: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500
    

# 2. API GET - get all Channel
@channel_bp.route('/', methods=['GET'])
def get_all_channel():
    try:
        channels = (
            SalesChannel.query
            .distinct()
            .all()
        )
        
        # จัดโครงสร้างข้อมูลให้อยู่ในรูปแบบที่ต้องการ
        channels_list = [
            {
                "id": c.id,
                "channel_name": c.channel_name,
                "commission_percent": c.commission_percent,
                "transaction_percent": c.transaction_percent,
            }
            for c in channels
        ]

        # สร้าง dictionary ที่มี key เป็น "data"
        result =  channels_list

        # ส่งค่า result ที่อยู่ในรูปแบบ JSON
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"❌ Failed to fetch products: {str(e)}"}), 500

# 3. API DELETE - delete sale channel
@channel_bp.route("/<int:sales_channel_id>", methods=["DELETE"])
def delete_sales_channel(sales_channel_id):
    try:
        sale_channel = db.session.get(SalesChannel, sales_channel_id)
        if not sale_channel:
            return jsonify({"error": "Sale_channel not found"}), 404
        
         # ⭐ ใช้ db.session.delete() เพื่อลบ Object
        db.session.delete(sale_channel)
        db.session.commit()
        
        return jsonify({"message": f"✅ Sale with id {sales_channel_id} deleted successfully"}), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Database error: {str(e)}"}), 500
    
    except Exception as e:
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500