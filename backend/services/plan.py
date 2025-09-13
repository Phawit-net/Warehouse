# services/plan.py
from models import db, Membership, Warehouse

PLAN_LIMITS = {
    "FREE": {
        "max_warehouses": 1,
        "max_members_non_owner": 0,      # สร้าง member เพิ่มไม่ได้
        "features": {
            "members": False,
            "reports": False,
            "multi_warehouse": False,
        },
    },
    "PRO": {
        "max_warehouses": 3,
        "max_members_non_owner": 5,      # ✅ ตามที่กำหนด
        "features": {
            "members": True,
            "reports": True,
            "multi_warehouse": True,
        },
    },
    "ENTERPRISE": {
        "max_warehouses": None,
        "max_members_non_owner": None,
        "features": {
            "members": True,
            "reports": True,
            "multi_warehouse": True,
        },
    },
}

ROLE_PERMS = {
    "OWNER": ["workspace.manage", "member.manage", "inventory.write", "sale.write", "report.read"],
    "ADMIN": ["member.view", "inventory.write", "sale.write", "report.read"],
    "STAFF": ["inventory.read", "sale.write"],
}

def get_limits(plan: str):
    return PLAN_LIMITS.get((plan or "FREE").upper(), PLAN_LIMITS["FREE"])

def has_feature(plan: str, key: str) -> bool:
    return bool(get_limits(plan)["features"].get(key, False))

def count_members_non_owner(workspace_id: int) -> int:
    # นับสมาชิกที่ไม่ใช่ OWNER
    return db.session.query(Membership).filter(
        Membership.workspace_id == workspace_id,
        Membership.role != "OWNER"
    ).count()

def count_warehouses(workspace_id: int) -> int:
    return db.session.query(Warehouse).filter_by(workspace_id=workspace_id).count()

def within_quota_warehouses(plan: str, wsid: int) -> bool:
    limit = get_limits(plan)["max_warehouses"]
    return True if limit is None else count_warehouses(wsid) < limit

def within_quota_members(plan: str, wsid: int) -> bool:
    limit = get_limits(plan)["max_members_non_owner"]
    return True if limit is None else count_members_non_owner(wsid) < limit
