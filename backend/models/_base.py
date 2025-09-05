# models/_base.py
from __future__ import annotations
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData

# ชื่อ constraint/index ให้คงที่ (ดีต่อ migration)
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

db = SQLAlchemy(metadata=MetaData(naming_convention=NAMING_CONVENTION))

def utc_now():
    return datetime.now(timezone.utc)

class TimestampMixin:
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=datetime.utcnow, nullable=False)

class IDMixin:
    id = db.Column(db.Integer, primary_key=True)

class StrEnum:
    ROLE = ("OWNER", "ADMIN", "STAFF")
    PLAN = ("FREE", "PRO", "ENTERPRISE")

