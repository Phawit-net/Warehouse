from sqlalchemy import Index, ForeignKey
from sqlalchemy.orm import relationship
from ._base import db, IDMixin, TimestampMixin

class RefreshToken(TimestampMixin, IDMixin, db.Model):
    __tablename__ = "refresh_token"
    jti = db.Column(db.String(64), unique=True, nullable=False)
    user_id = db.Column(db.Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    workspace_id = db.Column(db.Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False)
    user_agent = db.Column(db.String(255))
    ip_address = db.Column(db.String(64))
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked = db.Column(db.Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")
    workspace = relationship("Workspace", back_populates="refresh_tokens")

    __table_args__ = (Index("ix_refresh_user_ws", "user_id", "workspace_id"),)