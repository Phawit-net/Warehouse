# models/warehouse.py
from sqlalchemy import UniqueConstraint, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from ._base import db, IDMixin, TimestampMixin

class Warehouse(TimestampMixin, IDMixin, db.Model):
    __tablename__ = "warehouse"

    workspace_id = db.Column(
        db.Integer,
        ForeignKey("workspace.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code = db.Column(db.String(30), nullable=False)   # เช่น MAIN, BKK-01, CNX-01
    name = db.Column(db.String(100), nullable=False)  # ชื่อแสดงผล
    address = db.Column(db.String(255))
    is_default = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    workspace = relationship("Workspace", backref="warehouses")

    __table_args__ = (
        UniqueConstraint("workspace_id", "code", name="uq_warehouse_ws_code"),
        CheckConstraint("length(code) > 0", name="ck_warehouse_code_not_empty"),
        CheckConstraint("length(name) > 0", name="ck_warehouse_name_not_empty"),
        Index("ix_warehouse_ws_active", "workspace_id", "is_active"),
    )
#หมายเหตุ: การบังคับให้ is_default มีได้ 1 ต่อ workspace ทำเป็น กฎในโค้ด (ก่อนบันทึก) เพราะ SQLite ไม่รองรับ partial unique index สวย ๆ