from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models import db, Warehouse, Workspace
from services.plan import within_quota_warehouses
from decorators.guard import require_perm

warehouse_bp = Blueprint("warehouse_bp", __name__, url_prefix="/api/warehouse")

#API ADD WEARHOUSE (เช็ค quota)
@warehouse_bp.post("/")
@jwt_required()
@require_perm("inventory.write")   # ✅ role ต้องมีสิทธิ์
def create_warehouse():
    wsid = get_jwt()["wsid"]
    plan = Workspace.query.get(wsid).plan

    if not within_quota_warehouses(plan, wsid):
        return jsonify({"error": "QUOTA_EXCEEDED", "resource": "warehouses"}), 403

    data = request.get_json() or {}
    name = data.get("name") or "New Warehouse"
    code = data.get("code") or "W" + str(int(datetime.utcnow().timestamp()))

    wh = Warehouse(workspace_id=wsid, name=name, code=code)
    db.session.add(wh)
    db.session.commit()

    return jsonify({"id": wh.id, "name": wh.name, "code": wh.code}), 201