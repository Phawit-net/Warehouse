# routes/member_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models import db, Membership, User, Workspace
from services.plan import within_quota_members, has_feature
from decorators.guard import require_perm

member_bp = Blueprint("member", __name__, url_prefix="/api/members")

#API GET LIST ALL MEMBER of OWNER
@member_bp.get("/")
@jwt_required()
@require_perm("member.view")
def list_members():
    wsid = get_jwt()["wsid"]
    mems = Membership.query.filter_by(workspace_id=wsid).all()
    return jsonify([
        {"id": m.id, "user_id": m.user_id, "role": m.role, "is_primary": m.is_primary}
        for m in mems
    ])

#API CREATE INVITE MEMBER from PLANS (เช็ค feature + quota)
@member_bp.post("/")
@jwt_required()
@require_perm("member.manage")
def invite_member():
    wsid = get_jwt()["wsid"]
    ws = Workspace.query.get(wsid)

    # ✅ เช็คว่าแผนนี้เปิดให้ใช้ feature "members"
    if not has_feature(ws.plan, "members"):
        return jsonify({"error": "FEATURE_LOCKED", "resource": "members"}), 403

    # ✅ quota
    if not within_quota_members(ws.plan, wsid):
        return jsonify({"error": "QUOTA_EXCEEDED", "resource": "members"}), 403

    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    role = data.get("role") or "STAFF"

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    mem = Membership(user_id=user.id, workspace_id=wsid, role=role)
    db.session.add(mem)
    db.session.commit()

    return jsonify({"id": mem.id, "user_id": mem.user_id, "role": mem.role}), 201


#API DELETE MEMBER ลบสมาชิก (ห้ามลบ OWNER)
@member_bp.delete("/<int:mem_id>")
@jwt_required()
@require_perm("member.manage")
def delete_member(mem_id):
    wsid = get_jwt()["wsid"]
    mem = Membership.query.get(mem_id)
    if not mem or mem.workspace_id != wsid:
        return jsonify({"error": "not found"}), 404

    if mem.role == "OWNER":
        return jsonify({"error": "cannot delete owner"}), 400

    db.session.delete(mem)
    db.session.commit()
    return jsonify({"ok": True})