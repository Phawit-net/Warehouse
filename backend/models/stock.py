from sqlalchemy import CheckConstraint, Index, UniqueConstraint
from ._base import IDMixin, TimestampMixin, db, utc_now

# ตารางเก็บ history stock-in of Product = เก็บประวัติการรับเข้า(ซื้อ)ของสินค้านั้นๆ
class StockIn(db.Model):
    __tablename__ = 'stock_in'
    id = db.Column(db.Integer, primary_key=True)

    workspace_id = db.Column(db.Integer, db.ForeignKey("workspace.id", ondelete="CASCADE"),nullable=False, index=True)

    doc_number = db.Column(db.String(50), nullable=False) #เลขเอกสารต่างๆ GRN-2025-08-001
    created_at = db.Column(db.DateTime, default= utc_now)
    note = db.Column(db.String(255), nullable=True) #หมายเหตุ
    image_filename = db.Column(db.String(255), nullable=True)

    # 👇 ใส่ expiry ของ “รอบรับเข้า” นี้ครั้งเดียว ใช้กับ entries ทั้งหมด
    expiry_date = db.Column(db.Date, nullable=True) 

    # 1 StockIn -> N Entries
    entries = db.relationship("StockInEntry", back_populates="stockin", cascade="all, delete-orphan",passive_deletes=True)

    # เผื่ออยาก query ดู batch ของใบนี้ทั้งหมด
    batches = db.relationship("StockBatch",back_populates="stockin",cascade="all, delete-orphan", passive_deletes=True,lazy="select")
    
    __table_args__ = (
        db.UniqueConstraint("workspace_id", "doc_number", name="uq_stockin_ws_doc"),
        db.Index("ix_stockin_ws_created", "workspace_id", "created_at"),
    )
    

# ตารางเก็บข้อมูลประวัติการรับเข้าสินค้า ตามStock-in-id
class StockInEntry(db.Model):
    __tablename__ = 'stock_in_entry'
    id = db.Column(db.Integer, primary_key=True)

    # อ้างกลับไปยังเอกสารรับเข้า (StockIn)
    stockin_id = db.Column(db.Integer, db.ForeignKey('stock_in.id', ondelete='CASCADE'), nullable=False)
    stockin = db.relationship("StockIn", back_populates="entries")

    # Product + Variant (เลือกได้ว่าผูก variant หรือใช้ custom)
    product_id   = db.Column(db.Integer, db.ForeignKey("product.id", ondelete="RESTRICT"),nullable=False, index=True)
    product = db.relationship("Product")
    

    variant_id = db.Column(db.Integer, db.ForeignKey('product_variant.id', ondelete='SET NULL'), nullable=True)
    variant = db.relationship("ProductVariant")

    # ถ้าเป็น custom variant ที่ user ใส่เอง
    custom_sale_mode = db.Column(db.String(50), nullable=True)   # เช่น "doublePack"
    custom_pack_size = db.Column(db.Integer, nullable=True)      # เช่น 20

    # snapshot ตอนรับเข้า (สำคัญ! กันกรณี variant เปลี่ยนในอนาคต)
    pack_size_at_receipt = db.Column(db.Integer, nullable=False)  # เช่น 10 เม็ด/ขวด/กล่อง ต่อ pack

    # จำนวน pack ที่รับเข้า
    quantity = db.Column(db.Integer, nullable=False)

    # หลาย Entry -> 1 Batch (รวมตาม lot/expiry)
    batch_id = db.Column(db.Integer, db.ForeignKey('stock_batch.id', ondelete='SET NULL'), nullable=True)
    batch = db.relationship("StockBatch", back_populates="entries")

    workspace_id = db.Column(db.Integer, db.ForeignKey("workspace.id", ondelete="CASCADE"),nullable=False, index=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouse.id", ondelete="RESTRICT"),nullable=False, index=True)
    warehouse = db.relationship("Warehouse")

    __table_args__ = (
        CheckConstraint('pack_size_at_receipt > 0', name='ck_entry_pack_size_positive'),
        CheckConstraint('quantity > 0', name='ck_entry_qty_positive'),
        Index("ix_stockin_ws_wh_prod_date", "workspace_id","warehouse_id","product_id"),
    )

class StockBatch(db.Model):
    __tablename__ = 'stock_batch'
    id = db.Column(db.Integer, primary_key=True)

    # ผูกกับ header + product (ระบุขอบเขตการรวม)
    stockin_id = db.Column(db.Integer, db.ForeignKey('stock_in.id', ondelete='CASCADE'), nullable=False)
    stockin = db.relationship("StockIn", back_populates="batches")

    product_id = db.Column(db.Integer, db.ForeignKey("product.id", ondelete="RESTRICT"), nullable=False, index=True)    
    product = db.relationship("Product")
   
    lot_number = db.Column(db.String(100), nullable=True)
    expiry_date = db.Column(db.Date, nullable=True)

    qty_received = db.Column(db.Integer, nullable=False, default=0)
    qty_remaining = db.Column(db.Integer, nullable=False, default=0)

    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    workspace_id = db.Column(db.Integer, db.ForeignKey("workspace.id", ondelete="CASCADE"),nullable=False, index=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouse.id", ondelete="RESTRICT"),nullable=False, index=True)
    warehouse = db.relationship("Warehouse")
    
    origin_batch_id = db.Column(db.Integer, db.ForeignKey("stock_batch.id"))
    origin_batch = db.relationship("StockBatch", remote_side="StockBatch.id")

    # 1 Batch -> N Entries (เอาไว้ trace ว่า batch นี้มาจาก entries อะไรบ้าง)    
    entries = db.relationship("StockInEntry", back_populates="batch", lazy="dynamic")

    __table_args__ = (
        # FEFO / report
        db.Index('ix_batch_product_expiry', 'product_id', 'expiry_date'),
        CheckConstraint('qty_received >= 0',  name='ck_batch_qty_received_nonneg'),
        CheckConstraint('qty_remaining >= 0', name='ck_batch_qty_remaining_nonneg'),
        # บังคับ "1 ก้อนต่อ (stockin, product, lot, expiry)"
        # หมายเหตุ: ถ้า lot_number เป็น NULL, DB ส่วนใหญ่จะอนุญาต NULL ซ้ำ → แนะนำ generate lot_number เสมอใน service
        UniqueConstraint('stockin_id', 'product_id', 'lot_number', 'expiry_date', name='uq_batch_stockin_prod_lot_exp'),
        CheckConstraint("qty_remaining >= 0", name="ck_batch_qty_nonneg"),
        Index("ix_batch_ws_wh_prod_exp", "workspace_id","warehouse_id","product_id","expiry_date"),
    )

# 4) บันทึก movement (IN/OUT/EXPIRED/ADJUST/VOID)
class StockMovement(db.Model):
    __tablename__ = 'stock_movement'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id', ondelete='RESTRICT'), nullable=False)
    batch_id   = db.Column(db.Integer, db.ForeignKey('stock_batch.id', ondelete='SET NULL'))
    movement_type = db.Column(db.String(20), nullable=False)  # IN / OUT / EXPIRED / ADJUST / VOID
    qty = db.Column(db.Integer, nullable=False)               # +IN / -OUT (base units)
    batch_qty_remaining = db.Column(db.Integer, nullable=False)
    ref_stockin_id = db.Column(db.Integer, db.ForeignKey('stock_in.id'))
    ref_sale_id    = db.Column(db.Integer, db.ForeignKey('sale.id'))
    note = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    workspace_id = db.Column(db.Integer, nullable=False, index=True)
    warehouse_id = db.Column(db.Integer, nullable=False, index=True)

    __table_args__ = (
        CheckConstraint('qty != 0', name='ck_movement_qty_nonzero'),
        Index('ix_mov_product_created', 'product_id', 'created_at'),
    )


class StockTransfer(TimestampMixin, IDMixin, db.Model):
    __tablename__ = "stock_transfer"

    workspace_id = db.Column(db.Integer, db.ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, index=True)
    from_warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouse.id", ondelete="RESTRICT"), nullable=False, index=True)
    to_warehouse_id   = db.Column(db.Integer, db.ForeignKey("warehouse.id", ondelete="RESTRICT"), nullable=False, index=True)

    status = db.Column(db.String(20), nullable=False, default="DRAFT")  # DRAFT/CONFIRMED
    transfer_date = db.Column(db.Date, nullable=False)
    note = db.Column(db.String(255))

    from_warehouse = db.relationship("Warehouse", foreign_keys=[from_warehouse_id])
    to_warehouse   = db.relationship("Warehouse",   foreign_keys=[to_warehouse_id])

class StockTransferItem(TimestampMixin, IDMixin, db.Model):
    __tablename__ = "stock_transfer_item"

    transfer_id = db.Column(db.Integer, db.ForeignKey("stock_transfer.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id  = db.Column(db.Integer, db.ForeignKey("product.id", ondelete="RESTRICT"), nullable=False, index=True)
    qty         = db.Column(db.Numeric(18, 6), nullable=False)

    transfer = db.relationship("StockTransfer", backref="items")
    product  = db.relationship("Product")

    __table_args__ = (
        CheckConstraint("qty > 0", name="ck_transfer_qty_pos"),
    )