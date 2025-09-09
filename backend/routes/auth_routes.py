from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import IntegrityError
from extensions import ph, limiter  # PasswordHasher จาก extensions.py
from models import db, User, Workspace, Membership, RefreshToken
from datetime import datetime, timedelta, timezone

from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    set_refresh_cookies, unset_jwt_cookies,
    jwt_required, get_jwt, decode_token
)

auth_bp = Blueprint("auth",  __name__, url_prefix='/api/auth')

# ====== Helper ======
def _now_utc():
    return datetime.now(timezone.utc)

def _as_aware_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    # ถ้า dt ไม่มี tzinfo ให้ถือว่าเป็น UTC แล้วใส่ tz เข้าไป
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    # ถ้ามี tz แล้ว แปลงมาเป็น UTC
    return dt.astimezone(timezone.utc)

def _get_primary_membership(user: User, wanted_ws_id: int | None = None) -> Membership | None:
    # ถ้าระบุ workspace_id มา ให้ใช้ของร้านนั้น ถ้าไม่มีก็ตกไปใช้ is_primary หรือแถวแรก
    q = Membership.query.filter_by(user_id=user.id)
    if wanted_ws_id:
        m = q.filter_by(workspace_id=wanted_ws_id).first()
        if m:
            return m
    m = q.filter_by(is_primary=True).first()
    return m or q.first()

def _save_refresh(user_id: int, ws_id: int, token: str, user_agent: str | None, ip: str | None):
    data = decode_token(token)  # ได้ jti และ exp (epoch)
    jti = data["jti"]
    exp = datetime.fromtimestamp(data["exp"], tz=timezone.utc)
    row = RefreshToken(
        jti=jti,
        user_id=user_id,
        workspace_id=ws_id,
        user_agent=(user_agent or "")[:255],
        ip_address=(ip or "")[:64],
        expires_at=exp,
        revoked=False,
    )
    db.session.add(row)
    db.session.commit()
    return jti

def _revoke_refresh(jti: str):
    row = RefreshToken.query.filter_by(jti=jti, revoked=False).first()
    if row:
        row.revoked = True
        db.session.commit()

def _validate_email(email: str) -> bool:
    return isinstance(email, str) and "@" in email and "." in email


@auth_bp.post("/register-owner")
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

# ====== Rate limit login กัน brute force ======
@limiter.limit("5/minute")
@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    workspace_id = data.get("workspace_id")  # optional: เลือกร้านตอนล้อกอิน

    # 1) หา user
    user = User.query.filter_by(email=email).first()
    if not user or not user.is_active:
        return jsonify({"error": "อีเมลหรือรหัสผ่านไม่ถูกต้อง"}), 401

    # 2) verify รหัส
    try:
        ph.verify(user.password_hash, password)
    except Exception:
        return jsonify({"error": "อีเมลหรือรหัสผ่านไม่ถูกต้อง"}), 401

    # 3) membership ปัจจุบัน
    m = _get_primary_membership(user, workspace_id)
    if not m:
        return jsonify({"error": "บัญชียังไม่อยู่ในร้านใด"}), 403

    # 4) ออก token
    claims = {
        "wsid": m.workspace_id,
        "role": m.role,
    }
    access_token = create_access_token(identity=str(user.id), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=claims)

    # 5) บันทึก refresh jti
    ua = request.headers.get("User-Agent", "")
    ip = request.headers.get("X-Forwarded-For") or request.remote_addr
    _save_refresh(user.id, m.workspace_id, refresh_token, ua, ip)

    # 6) ตอบกลับ: ตั้ง refresh cookie + ส่ง access token ใน body
    resp = jsonify({
        "access_token": access_token,
        "user": {"id": user.id, "email": user.email},
        "workspace": {"id": m.workspace_id},
        "role": m.role
    })
    set_refresh_cookies(resp, refresh_token)  # HttpOnly cookie + CSRF cookie
    return resp, 200

# ใช้ refresh cookie แลก access ใหม่ + rotate refresh
@auth_bp.post("/refresh")
@jwt_required(refresh=True)  # ต้องส่ง refresh token มาใน Cookie + X-CSRF-TOKEN header
def refresh():
     # DEBUG: log คร่าวๆ
    try:
        current_app.logger.info({
            "refresh_cookie": bool(request.cookies.get("refresh_token_cookie")),
            "csrf_header": bool(request.headers.get("X-CSRF-TOKEN")),
            "csrf_cookie": bool(request.cookies.get("csrf_refresh_token")),
        })
    except Exception:
        pass
    
    jwt = get_jwt()  # ของ refresh เดิม
    old_jti = jwt["jti"]
    user_id = jwt["sub"]  
    wsid = jwt["wsid"]
    role = jwt["role"]

    # 1) เช็คว่าถูกเพิกถอนหรือหมดอายุไปแล้วหรือยัง
    row = RefreshToken.query.filter_by(jti=old_jti).first()
    exp_utc = _as_aware_utc(row.expires_at)
    if not row or row.revoked or (exp_utc is None) or exp_utc < _now_utc():
        return jsonify({"error": "refresh token ใช้ไม่ได้"}), 401

    # 2) ออก access ใหม่ + refresh ใหม่ (rotate)
    claims = {"wsid": wsid, "role": role}
    access_token = create_access_token(identity=user_id, additional_claims=claims)
    new_refresh = create_refresh_token(identity=user_id, additional_claims=claims)

    # 3) เพิกถอนตัวเก่า + บันทึกตัวใหม่
    _revoke_refresh(old_jti)
    ua = request.headers.get("User-Agent", "")
    ip = request.headers.get("X-Forwarded-For") or request.remote_addr
    _save_refresh(user_id, wsid, new_refresh, ua, ip)

    resp = jsonify({"access_token": access_token})
    set_refresh_cookies(resp, new_refresh)
    return resp, 200


# ดูข้อมูลตัวเองจาก access token
@auth_bp.get("/me")
@jwt_required()  # ใช้ access token (Authorization: Bearer ...)
def me():
    jwt = get_jwt()
    user_id = int(jwt["sub"])
    wsid = jwt["wsid"]
    role = jwt["role"]

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "not found"}), 404

    # memberships ทั้งหมด (เผื่ออนาคตมีหลายร้าน)
    mems = Membership.query.filter_by(user_id=user_id).all()
    memberships = [{"workspace_id": x.workspace_id, "role": x.role, "is_primary": x.is_primary} for x in mems]

    return jsonify({
        "user": {"id": user.id, "email": user.email, "username": user.username},
        "current_workspace": {"id": wsid},
        "role": role,
        "memberships": memberships
    })


# ออกจากระบบ: เพิกถอน refresh ปัจจุบัน + ลบ cookie
@auth_bp.post("/logout")
@jwt_required(refresh=True)
def logout():
    jwt = get_jwt()
    jti = jwt["jti"]
    _revoke_refresh(jti)

    resp = jsonify({"ok": True})
    unset_jwt_cookies(resp)  # เคลียร์ทั้ง access/refresh cookies ถ้ามี
    return resp, 200