from flask import  Blueprint, jsonify, request
from models import Platform, PlatformTier, db,  SalesChannel
from sqlalchemy.exc import SQLAlchemyError

channel_bp = Blueprint('channel_bp', __name__, url_prefix='/api/channel')

# 1. API POST - add new Sale Channel
@channel_bp.route('/', methods=['POST'])
def create_stockin():
    try:
        data = request.form
        
        # ⭐ การตรวจสอบข้อมูลก็เปลี่ยนไปเล็กน้อย
        if not data or "channel_name" not in data:
            return jsonify({"error": "❌ channel_name is required"}), 400

        channel_name = data.get("channel_name")
        is_active = True
        
        new_channel = SalesChannel(
            channel_name = channel_name,
            store_desc = data.get("store_desc"),
            platform_tier_id = data.get("platform_tier_id"),
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
        channels = db.session.query(
            SalesChannel.id,
            SalesChannel.channel_name,
            SalesChannel.store_desc,
            Platform.name.label("platform_name"), # ⭐ ดึงชื่อ Platform มาตั้งชื่อใหม่
            PlatformTier.name.label("platform_tier_name"), # ⭐ ดึงชื่อ Tier มาตั้งชื่อใหม่
            PlatformTier.commission_percent,
            PlatformTier.transaction_percent
        ).join(
            PlatformTier, SalesChannel.platform_tier_id == PlatformTier.id
        ).join(
            Platform, PlatformTier.platform_id == Platform.id
        ).all()
        
        # จัดโครงสร้างข้อมูลให้อยู่ในรูปแบบที่ต้องการ
        channels_list = [
            {
                "id": c.id,
                "channel_name": c.channel_name,
                "store_desc": c.store_desc,
                "platform_name": c.platform_name,
                "platform_tier_name": c.platform_tier_name,
                "commission_percent": c.commission_percent,
                "transaction_percent": c.transaction_percent,
            }
            for c in channels
        ]

        return jsonify(channels_list), 200

    except Exception as e:
        return jsonify({"error": f"❌ Failed to fetch products: {str(e)}"}), 500

    

