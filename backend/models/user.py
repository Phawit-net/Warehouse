from sqlalchemy import CheckConstraint, UniqueConstraint, Index, ForeignKey
from sqlalchemy.orm import relationship
from ._base import db, IDMixin, TimestampMixin, StrEnum

class User(TimestampMixin, IDMixin, db.Model):
    __tablename__ = "user"
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(50), unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_login_at = db.Column(db.DateTime)
    
    name          = db.Column(db.String(100))       # display name
    phone         = db.Column(db.String(30))
    avatar_path   = db.Column(db.String(255))       # เก็บ relative path เช่น "avatars/xxx.jpg"

    memberships = relationship("Membership", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

class Membership(TimestampMixin, IDMixin, db.Model):
    __tablename__ = "membership"
    user_id = db.Column(db.Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    workspace_id = db.Column(db.Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False)
    role = db.Column(db.String(10), nullable=False)
    is_primary = db.Column(db.Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="memberships")
    workspace = relationship("Workspace", back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("user_id", "workspace_id", name="uq_membership_user_ws"),
        CheckConstraint(f"role in {StrEnum.ROLE}", name="ck_membership_role"),
        Index("ix_membership_ws_role", "workspace_id", "role"),
    )