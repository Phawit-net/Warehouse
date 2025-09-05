from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError
from extensions import ph  # PasswordHasher จาก extensions.py
from models import db, User, Workspace, Membership

auth_bp = Blueprint("auth", __name__)

def _validate_email(email: str) -> bool:
    return isinstance(email, str) and "@" in email and "." in email

@auth_bp.post("/api/auth/register-owner")
def register_owner():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    workspace_name = (data.get("workspace_name") or "").strip()

    # 1) validate เบสิก
    if not _validate_email(email):
        return jsonify({"error": "อีเมลไม่ถูกต้อง"}), 400
    if len(password) < 8:
        return jsonify({"error": "รหัสผ่านต้องอย่างน้อย 8 ตัว"}), 400
    if not workspace_name:
        return jsonify({"error": "กรุณาใส่ชื่อร้าน/เวิร์กสเปซ"}), 400

    # 2) สร้าง user + workspace + membership(OWNER) ในทรานแซคชันเดียว
    try:
        pwd_hash = ph.hash(password)

        user = User(email=email, password_hash=pwd_hash)
        ws = Workspace(name=workspace_name, plan="FREE")
        db.session.add_all([user, ws])
        db.session.flush()  # ได้ id

        # owner คนแรกของ workspace นี้
        mem = Membership(user_id=user.id, workspace_id=ws.id, role="OWNER", is_primary=True)
        db.session.add(mem)

        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "อีเมลนี้ถูกใช้แล้ว"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"unexpected: {e}"}), 500

    # 3) ตอบกลับข้อมูล minimal (ยังไม่ออก token ใน step นี้)
    return jsonify({
        "message": "สมัครสำเร็จ",
        "user": {"id": user.id, "email": user.email},
        "workspace": {"id": ws.id, "name": ws.name, "plan": ws.plan},
        "membership": {"role": mem.role, "is_primary": mem.is_primary}
    }), 201