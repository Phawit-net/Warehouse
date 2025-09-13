# decorators/guard.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt
from models import Workspace, Membership
from services.plan import get_limits, has_feature, within_quota_members, within_quota_warehouses, ROLE_PERMS

#(OWNER เท่านั้น)
def require_perm(perm: str):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            role = get_jwt().get("role")
            if not role or perm not in ROLE_PERMS.get(role, []):
                return jsonify({"error": "FORBIDDEN", "message": "permission denied"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return deco

#(แผนที่เปิดฟีเจอร์)
def enforce_plan_feature(key: str):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            wsid = get_jwt().get("wsid")
            ws = Workspace.query.get(wsid)
            if not has_feature(ws.plan, key):
                return jsonify({"error": "FEATURE_LOCKED", "message": f"{key} not available on this plan"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return deco


#(เช็คจำนวน non-owner ไม่เกินโควตา PRO/ENT)
def enforce_quota(resource: str):  # "members" | "warehouses"
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            wsid = get_jwt().get("wsid")
            ws = Workspace.query.get(wsid)
            ok = within_quota_members(ws.plan, wsid) if resource == "members" else within_quota_warehouses(ws.plan, wsid)
            if not ok:
                return jsonify({"error": "QUOTA_EXCEEDED", "resource": resource}), 403
            return fn(*args, **kwargs)
        return wrapper
    return deco
