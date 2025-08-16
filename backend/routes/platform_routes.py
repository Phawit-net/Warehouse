from flask import Blueprint, jsonify
from model import db, Platform

platform_bp = Blueprint("platform_bp", __name__, url_prefix="/api/platforms")

@platform_bp.route("/<string:platform_name>", methods=["GET"])
def get_platform_by_name(platform_name):
    platform = Platform.query.filter(Platform.name.ilike(platform_name)).first()
    if not platform:
        return jsonify({"error": f"Platform '{platform_name}' not found"}), 404

    tiers = [
        {
            "id": t.id,
            "name": t.name,
            "commission_percent": t.commission_percent,
            "transaction_percent": t.transaction_percent
        }
        for t in platform.tiers
    ]
    return jsonify(tiers)
