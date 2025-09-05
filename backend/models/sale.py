from sqlalchemy import CheckConstraint, Index
from ._base import db, utc_now


# ตารางเก็บข้อมูลประวัติการขายสินค้า # 1) หัวใบขาย
class Sale(db.Model):
    __tablename__ = 'sale'
    id = db.Column(db.Integer, primary_key=True)

    workspace_id = db.Column(db.Integer, db.ForeignKey("workspace.id", ondelete="CASCADE"),nullable=False, index=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouse.id", ondelete="RESTRICT"),nullable=False, index=True)
    channel_id   = db.Column(db.Integer, db.ForeignKey("sales_channel.id", ondelete="RESTRICT"),nullable=False, index=True)

    sale_date  = db.Column(db.DateTime, default=utc_now, nullable=False)

    # snapshot channel (กันกรณีช่องทางเปลี่ยน % ภายหลัง)
    channel_name_at_sale = db.Column(db.String(50), nullable=False)
    commission_percent_at_sale   = db.Column(db.Float, default=0.0)   # % ทั้งบิล
    transaction_percent_at_sale  = db.Column(db.Float, default=0.0)   # % ทั้งบิล

    # ลูกค้า/ที่อยู่ (optional)
    customer_name = db.Column(db.String(100))
    province      = db.Column(db.String(100))
    # note          = db.Column(db.String(255))

    # ยอดเงินระดับบิล (สรุปหลังคำนวณ)
    subtotal        = db.Column(db.Float, default=0.0)   # รวมราคาสินค้าทั้งหมด (ก่อนส่วนลด/ค่าธรรมเนียม)
    shipping_fee    = db.Column(db.Float, default=0.0)
    shop_discount   = db.Column(db.Float, default=0.0)
    platform_discount = db.Column(db.Float, default=0.0)
    coin_discount     = db.Column(db.Float, default=0.0)
    vat_amount      = db.Column(db.Float, default=0.0)
    commission_fee  = db.Column(db.Float, default=0.0)
    transaction_fee = db.Column(db.Float, default=0.0)
    customer_pay    = db.Column(db.Float, default=0.0)
    seller_receive  = db.Column(db.Float, default=0.0)

    items   = db.relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    warehouse = db.relationship("Warehouse")
    channel   = db.relationship("SalesChannel")
    __table_args__ = (
        Index("ix_sale_ws_wh_date", "workspace_id","warehouse_id","sale_date"),
        # ถ้ามีเลขบิล/เลขภาษี
        # db.UniqueConstraint("workspace_id","invoice_no", name="uq_sale_ws_invoice"),
    )


# 2) รายการขาย (1 รายการต่อ 1 variant — ไม่มี custom)
class SaleItem(db.Model):
    __tablename__ = 'sale_item'
    id = db.Column(db.Integer, primary_key=True)

    sale_id = db.Column(db.Integer, db.ForeignKey('sale.id', ondelete='CASCADE'), nullable=False)
    sale = db.relationship("Sale")

    workspace_id = db.Column(db.Integer, nullable=False, index=True)   # derive จาก sale
    warehouse_id = db.Column(db.Integer, nullable=False, index=True)  # derive จาก sale

    product_id = db.Column(db.Integer, db.ForeignKey("product.id", ondelete="RESTRICT"), nullable=False, index=True)
    product    = db.relationship("Product")

    variant_id = db.Column(db.Integer, db.ForeignKey('product_variant.id', ondelete='RESTRICT'), nullable=False)
    variant    = db.relationship("ProductVariant")

    # snapshot ตอนขาย (ล็อกค่าจาก variant ณ ขณะขาย)
    sale_mode_at_sale  = db.Column(db.String(50), nullable=False)  # ชื่อโหมด เช่น "โหล", "ลัง"
    pack_size_at_sale  = db.Column(db.Integer,    nullable=False)  # base/pack ณ ตอนขาย
    quantity_pack      = db.Column(db.Integer,    nullable=False)  # จำนวนแพ็คที่ขาย
    unit_price_at_sale = db.Column(db.Float,      nullable=False)  # ราคา/แพ็ค

    # ค่าคำนวณ
    base_units  = db.Column(db.Integer, nullable=False)            # pack_size_at_sale * quantity_pack
    line_total  = db.Column(db.Float, default=0.0)                 # unit_price_at_sale * quantity_pack (ก่อนส่วนลดหัวบิล/VAT)

    # แมปล็อตที่ถูกตัดจริง (FEFO)
    batches = db.relationship("SaleItemBatch", back_populates="sale_item", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint('pack_size_at_sale > 0', name='ck_saleitem_pack_size_pos'),
        CheckConstraint('quantity_pack > 0',     name='ck_saleitem_qty_pos'),
        CheckConstraint('base_units > 0',        name='ck_saleitem_base_pos'),
    )

# 3) แมประหว่าง SaleItem กับ StockBatch (ตัด FEFO หลายล็อตได้)
class SaleItemBatch(db.Model):
    __tablename__ = 'sale_item_batch'
    id = db.Column(db.Integer, primary_key=True)

    sale_item_id = db.Column(db.Integer, db.ForeignKey('sale_item.id', ondelete='CASCADE'), nullable=False)
    sale_item    = db.relationship("SaleItem", back_populates="batches")

    product_id = db.Column(db.Integer, db.ForeignKey('product.id', ondelete='RESTRICT'), nullable=False)
    batch_id = db.Column(db.Integer, db.ForeignKey('stock_batch.id', ondelete='RESTRICT'), nullable=False)

    qty = db.Column(db.Integer, nullable=False)  # base units ที่ตัดจากล็อตนี้
    batch = db.relationship("StockBatch")
    
    workspace_id = db.Column(db.Integer, nullable=False, index=True)
    warehouse_id = db.Column(db.Integer, nullable=False, index=True)

    __table_args__ = (
        CheckConstraint('qty > 0', name='ck_saleitembatch_qty_pos'),
        Index('ix_sib_batch', 'batch_id'),
    )
