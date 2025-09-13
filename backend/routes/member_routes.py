# routes/member_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models import db, Membership, User, Workspace
from services.plan import within_quota_members, has_feature
from decorators.guard import require_perm, enforce_quota, enforce_plan_feature
from werkzeug.utils import secure_filename
from extensions import ph
import os

member_bp = Blueprint("member", __name__, url_prefix="/api/members")

AVATAR_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "avatars")


#API GET LIST ALL MEMBER of OWNER
@member_bp.get("")
@jwt_required(locations=["headers"])
@require_perm("member.manage")            # OWNER เห็นทั้งหมด
@enforce_plan_feature("members")
def list_members():
    wsid = int(get_jwt()["wsid"])
    rows = (
        db.session.query(Membership, User)
        .join(User, User.id == Membership.user_id)
        .filter(Membership.workspace_id == wsid)
        .all()
    )
    # ไม่คืน OWNER ถ้าอยากซ่อน
    data = []
    for m, u in rows:
        data.append({
            "member_id": m.id,
            "user_id": u.id,
            "role": m.role,
            "is_primary": m.is_primary,
            "username": u.username,
            "email": u.email,
            "name": u.name,
            "phone": u.phone,
            "active": u.is_active,
            "avatar": u.avatar_path,
        })
    return jsonify({"members": data})

# #API CREATE INVITE MEMBER from PLANS (เช็ค feature + quota)
# @member_bp.post("/")
# @jwt_required()
# @require_perm("member.manage")
# def invite_member():
#     wsid = get_jwt()["wsid"]
#     ws = Workspace.query.get(wsid)

#     # ✅ เช็คว่าแผนนี้เปิดให้ใช้ feature "members"
#     if not has_feature(ws.plan, "members"):
#         return jsonify({"error": "FEATURE_LOCKED", "resource": "members"}), 403

#     # ✅ quota
#     if not within_quota_members(ws.plan, wsid):
#         return jsonify({"error": "QUOTA_EXCEEDED", "resource": "members"}), 403

#     data = request.get_json() or {}
#     email = (data.get("email") or "").strip().lower()
#     role = data.get("role") or "STAFF"

#     user = User.query.filter_by(email=email).first()
#     if not user:
#         return jsonify({"error": "User not found"}), 404

#     mem = Membership(user_id=user.id, workspace_id=wsid, role=role)
#     db.session.add(mem)
#     db.session.commit()

#     return jsonify({"id": mem.id, "user_id": mem.user_id, "role": mem.role}), 201


#API DELETE MEMBER ลบสมาชิก (ห้ามลบ OWNER)
@member_bp.delete("/<int:mem_id>")
@jwt_required(locations=["headers"])
@require_perm("member.manage")
@enforce_plan_feature("members")
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


#API POST MEMBER สร้างสมาชิก
@member_bp.post("")
@jwt_required(locations=["headers"])
@require_perm("member.manage")                 # OWNER only
@enforce_plan_feature("members")               # PRO/ENTERPRISE เท่านั้น
@enforce_quota("members")                      # โควตาสมาชิก non-owner
def create_member():
    wsid = int(get_jwt()["wsid"])

    form = request.form
    files = request.files

    username = (form.get("username") or "").strip()
    email    = (form.get("email") or "").strip().lower()
    name     = (form.get("name") or "").strip()
    phone    = (form.get("phone") or "").strip()
    password = form.get("password") or ""
    confirm  = form.get("confirm_password") or ""
    role     = (form.get("role") or "STAFF").upper()     # ADMIN | STAFF
    active   = (form.get("active") or "true").lower() == "true"

    if not all([username, email, password, confirm]):
        return jsonify({"error": "MISSING_FIELDS"}), 400
    if password != confirm:
        return jsonify({"error": "PASSWORD_MISMATCH"}), 400
    if role not in ("ADMIN", "STAFF"):
        return jsonify({"error": "BAD_ROLE"}), 400

    # อัปโหลดไฟล์ (ถ้ามี)
    avatar_path = None
    img = files.get("image")
    if img and img.filename:
        os.makedirs(AVATAR_DIR, exist_ok=True)
        fn = secure_filename(img.filename)
        save_as = os.path.join(AVATAR_DIR, fn)
        img.save(save_as)
        avatar_path = f"avatars/{fn}"

    # สร้างผู้ใช้
    try:
        user = User(
            email=email, username=username,
            password_hash=ph.hash(password),
            is_active=active, name=name, phone=phone,
            avatar_path=avatar_path,
        )
        db.session.add(user)
        db.session.flush()

        mem = Membership(workspace_id=wsid, user_id=user.id, role=role, is_primary=False)
        db.session.add(mem)
        db.session.commit()

        return jsonify({
            "ok": True,
            "user": {"id": user.id, "email": user.email, "username": user.username,
                     "name": user.name, "phone": user.phone, "active": user.is_active,
                     "avatar": user.avatar_path},
            "member": {"id": mem.id, "role": mem.role}
        }), 201

    except Exception as e:
        db.session.rollback()
        # duplicate email/username
        if "UNIQUE" in str(e).upper():
            return jsonify({"error": "DUPLICATE", "message": "email or username exists"}), 409
        return jsonify({"error": "SERVER_ERROR"}), 500
    

#API PATCH enable active member เปิด/ปิด Active (ห้ามแตะ OWNER)
@member_bp.patch("/<int:user_id>/active")
@jwt_required(locations=["headers"])
@require_perm("member.manage")
@enforce_plan_feature("members")
def set_active(user_id):
    wsid = int(get_jwt()["wsid"])
    # เป็นสมาชิกของ workspace นี้ไหม
    mem = Membership.query.filter_by(workspace_id=wsid, user_id=user_id).first()
    if not mem:
        return jsonify({"error":"NOT_FOUND"}), 404
    if mem.role == "OWNER":
        return jsonify({"error":"CANNOT_CHANGE_OWNER"}), 400

    data = request.get_json() or {}
    active = bool(data.get("active"))
    u = User.query.get(user_id)
    u.is_active = active
    db.session.commit()
    return jsonify({"ok": True, "active": u.is_active})


#API PATCH ข้อมูล USER แยก PATCH /api/members/<user_id> สำหรับแก้ข้อมูล User
@member_bp.patch("/<int:user_id>")
@jwt_required(locations=["headers"])
@require_perm("member.manage")
@enforce_plan_feature("members")
def update_user(user_id):
    wsid = int(get_jwt()["wsid"])
    mem = Membership.query.filter_by(workspace_id=wsid, user_id=user_id).first()
    if not mem:
        return jsonify({"error":"NOT_FOUND"}), 404
    if mem.role == "OWNER":
        return jsonify({"error":"CANNOT_EDIT_OWNER"}), 400

    # รองรับทั้ง JSON และ form-data + image ใหม่
    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        files = request.files
    else:
        form = request.get_json() or {}
        files = {}

    u = User.query.get(user_id)
    username = form.get("username")
    email    = form.get("email")
    name     = form.get("name")
    phone    = form.get("phone")

    if username: u.username = username.strip()
    if email:    u.email    = email.strip().lower()
    if name is not None:  u.name  = name.strip()
    if phone is not None: u.phone = phone.strip()

    img = files.get("image")
    if img and img.filename:
        os.makedirs(AVATAR_DIR, exist_ok=True)
        fn = secure_filename(img.filename)
        img.save(os.path.join(AVATAR_DIR, fn))
        u.avatar_path = f"avatars/{fn}"

    try:
        db.session.commit()
        return jsonify({"ok": True})
    except Exception as e:
        db.session.rollback()
        if "UNIQUE" in str(e).upper():
            return jsonify({"error":"DUPLICATE"}), 409
        return jsonify({"error":"SERVER_ERROR"}), 500


#API PATCH แก้ไขบทบาท user แยก PATCH /api/members/<member_id>/role สำหรับเปลี่ยนบทบาท (กันพลาดเรื่อง mapping id ระหว่าง User กับ Membership)
@member_bp.patch("/role/<int:member_id>")
@jwt_required(locations=["headers"])
@require_perm("member.manage")
@enforce_plan_feature("members")
def change_role(member_id):
    wsid = int(get_jwt()["wsid"])
    mem = Membership.query.get(member_id)
    if not mem or mem.workspace_id != wsid:
        return jsonify({"error":"NOT_FOUND"}), 404
    if mem.role == "OWNER":
        return jsonify({"error":"CANNOT_CHANGE_OWNER"}), 400

    data = request.get_json() or {}
    role = (data.get("role") or "").upper()
    if role not in ("ADMIN","STAFF"):
        return jsonify({"error":"BAD_ROLE"}), 400
    mem.role = role
    db.session.commit()
    return jsonify({"ok": True, "role": mem.role})