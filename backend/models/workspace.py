from sqlalchemy import CheckConstraint
from sqlalchemy.orm import relationship
from ._base import db, IDMixin, TimestampMixin, StrEnum

class Workspace(TimestampMixin, IDMixin, db.Model):
    __tablename__ = "workspace"
    name = db.Column(db.String(120), nullable=True)

    # แผนราคา + บิลลิ่ง
    plan = db.Column(db.String(20), nullable=False, default="FREE")
    stripe_customer_id = db.Column(db.String(120))
    subscription_status = db.Column(db.String(50))
    current_period_end = db.Column(db.DateTime)

    memberships = relationship("Membership", back_populates="workspace", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="workspace", cascade="all, delete-orphan")

    __table_args__ = (CheckConstraint(f"plan in {StrEnum.PLAN}", name="ck_workspace_plan"),)