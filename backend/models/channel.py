from sqlalchemy import UniqueConstraint, Index
from ._base import db

# ตารางเก็บข้อมูลช่องทาง platform แสดงค่าค่าคอมมิชชั่น/การชำระเงินที่โดนหักจาก platform ต่างๆ
class SalesChannel(db.Model): 
    __tablename__ = 'sales_channel'
    workspace_id = db.Column(db.Integer, db.ForeignKey("workspace.id", ondelete="CASCADE"),nullable=False, index=True)
    default_warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouse.id", ondelete="SET NULL"))

    id = db.Column(db.Integer, primary_key=True)
    channel_name = db.Column(db.String(50), nullable=False) #ชื่อร้านของเรา
    store_desc = db.Column(db.String(255)) #รายละเอียดร้านค้า
    platform_tier_id = db.Column(db.Integer, db.ForeignKey("platform_tier.id"), nullable=False)
    is_active = db.Column(db.Boolean, default=True) # ⭐ เพิ่ม Soft Delete
    
    workspace = db.relationship("Workspace", backref="channels")
    default_warehouse = db.relationship("Warehouse")
    platform_tier = db.relationship("PlatformTier", backref="stores")
    __table_args__ = (
        UniqueConstraint("workspace_id", "channel_name", name="uq_channel_ws_name"),
        Index("ix_channel_ws_active", "workspace_id", "is_active"),
    )


# ตารางเก็บข้อมูลช่องทาง platform แสดงค่าค่าคอมมิชชั่น/การชำระเงินที่โดนหักจาก platform ต่างๆ
class Platform(db.Model):
    __tablename__ = "platform"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)  # Shopee, Lazada, TikTokShop
    note = db.Column(db.Text)

class PlatformTier(db.Model):
    __tablename__ = "platform_tier"
    id = db.Column(db.Integer, primary_key=True)
    platform_id = db.Column(db.Integer, db.ForeignKey("platform.id"), nullable=False)
    name = db.Column(db.String(50), nullable=False)  # Mall, Normal, YellowFlag
    commission_percent = db.Column(db.Float, nullable=False)  # %
    transaction_percent = db.Column(db.Float, nullable=False)  # %
    # ความสัมพันธ์
    platform = db.relationship("Platform", backref="tiers")