from flask import Blueprint, request, jsonify
from models import db, Workspace, Warehouse
from sqlalchemy import func

from flask_jwt_extended import (
    jwt_required, get_jwt,
)

workspace_bp = Blueprint("workspace_bp",  __name__, url_prefix='/api/workspace')

# ====== Helper ======
def _get_onboarding_status(wsid: int):
    ws = Workspace.query.get(wsid)
    name_set = bool(ws and ws.name and ws.name.strip())
    have_wh = db.session.query(func.count(Warehouse.id)).filter_by(workspace_id=wsid).scalar() > 0
    return {
        "workspace_name_set": name_set,
        "has_default_warehouse": have_wh,
        "done": name_set and have_wh
    }

def _plan_limits(plan: str):
    plan = (plan or "").upper()
    if plan == "FREE":
        return {"max_warehouses": 1}
    if plan == "PRO":
        return {"max_warehouses": 3}
    return {"max_warehouses": None}  # ENTERPRISE/อื่นๆ = ไม่จำกัด


@workspace_bp.post("/name")
@jwt_required()
def set_workspace_name():
    wsid = get_jwt()["wsid"]
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"error": "กรุณาใส่ชื่อร้าน"}), 400

    ws = Workspace.query.get(wsid)
    if not ws:
        return jsonify({"error": "workspace ไม่พบ"}), 404

    ws.name = name
    db.session.commit()

    return jsonify({
        "workspace": {"id": ws.id, "name": ws.name, "plan": ws.plan},
        "onboarding": _get_onboarding_status(wsid)
    }), 200


@workspace_bp.post("/ensure-default-warehouse")
@jwt_required()
def ensure_default_warehouse():
    wsid = get_jwt()["wsid"]
    ws = Workspace.query.get(wsid)
    if not ws:
        return jsonify({"error": "workspace ไม่พบ"}), 404

    # มีคลังแล้ว ก็ถือว่าสำเร็จ
    existing = Warehouse.query.filter_by(workspace_id=wsid).first()
    if existing:
        return jsonify({
            "warehouse": {"id": existing.id, "code": existing.code, "name": existing.name, "is_default": getattr(existing, "is_default", False)},
            "onboarding": _get_onboarding_status(wsid)
        }), 200

    # quota ตามแผน
    limits = _plan_limits(ws.plan)
    if limits["max_warehouses"] is not None:
        count_wh = db.session.query(func.count(Warehouse.id)).filter_by(workspace_id=wsid).scalar()
        if count_wh >= limits["max_warehouses"]:
            return jsonify({"error": "QUOTA_EXCEEDED", "message": "แผนปัจจุบันอนุญาตจำนวนคลังถึงขีดจำกัดแล้ว"}), 403

    # สร้าง default warehouse
    wh = Warehouse(
        workspace_id=wsid,
        code="MAIN",
        name="Default Warehouse",
        is_default=True
    )
    db.session.add(wh)
    db.session.commit()

    return jsonify({
        "warehouse": {"id": wh.id, "code": wh.code, "name": wh.name, "is_default": True},
        "onboarding": _get_onboarding_status(wsid)
    }), 201