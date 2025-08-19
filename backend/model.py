from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, UniqueConstraint

db = SQLAlchemy()

def utc_now():
    return datetime.now(timezone.utc)
 
# ตารางเก็บข้อมูล Product แต่ละตัว
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    sku = db.Column(db.String(50), unique=True, nullable=False) #รหัสSKU
    category = db.Column(db.String(50), nullable=False) #หมวดหมู่สินค้า เช่น Vitamin / Drug / กระดาษ  ไม่ได้มีผลอะไรกับ data
    unit = db.Column(db.String(20), nullable=False) #หน่วยนับ เช่น 
    cost_price = db.Column(db.Float, nullable=False) #ราคาต้นทุนสินค้า
    stock = db.Column(db.Integer, default=0) #จำนวนคงเหลือรวม
    has_expire = db.Column(db.Boolean, default=False) #เป็นสินค้ามีวันหมดอายุไหม
    
    # Timestamp fields (timezone-aware)
    created_at = db.Column(db.DateTime, nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    variants = db.relationship('ProductVariant', backref='product', cascade="all, delete-orphan", lazy="selectin") #ต่อ One-to-Many กับ ProductVariant เพราะ Product 1 ชิ้นมีรูปแบบการขายได้หลายแบบ
    images = db.relationship('ProductImage', backref='product', cascade="all, delete-orphan", lazy="selectin")  #ต่อ One-to-Many กับ ProductImage เพราะ Product 1 ชิ้นมีรูปภาพหลายภาพได้ ใช้แค่แสดงเฉยๆ 
    @property
    def serialized_variants(self):
        return [
            {
                "id": v.id,
                "sku_suffix": v.sku_suffix,
                "sale_mode": v.sale_mode,
                "pack_size": v.pack_size,
                "selling_price": v.selling_price,
                "is_active": v.is_active,
            }
            for v in self.variants
        ]
    
    @property
    def main_image(self):
        main = next((img for img in self.images if img.is_main), None)
        return main.image_filename if main else None
    
# ตารางเก็บข้อมูลรูปแบบการขายของแต่ละ Product ตาม ID
class ProductVariant(db.Model):  
    __tablename__ = 'product_variant'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False) #Id ของ Product
    sale_mode = db.Column(db.String(50),  nullable=False)  # ชื่อรูปแบบการขาย (single, pack, box) 
    sku_suffix = db.Column(db.String(50), nullable=False)  # optional เช่น -P5, -P10
    pack_size = db.Column(db.Integer, nullable=False)# จำนวนหน่วยที่ขายในแต่ละรูปแบบ เช่น 5, 10  [จำนวนหน่วยย่อยต่อแพ็ค (ใช้ตอนขาย)]
    selling_price = db.Column(db.Float, nullable=False)  # ราคาขาย
    is_active = db.Column(db.Boolean, default=True) # ⭐ เพิ่ม Soft Delete
    
    def to_dict(self):
        return {
            "id": self.id,
            "sku_suffix": self.sku_suffix,
            "sale_mode": self.sale_mode,
            "pack_size": self.pack_size,
            "selling_price": self.selling_price,
            "is_active":self.is_active
        }

# ตารางเก็บข้อมูลไฟล์รูปของ Product
class ProductImage(db.Model):
    __tablename__ = 'product_image'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False) #Id ของ Product
    image_filename = db.Column(db.String(200), nullable=False)  # เช่น 'image1.jpg'
    alt_text = db.Column(db.String(100)) 
    is_main = db.Column(db.Boolean, default=False)  

# ตารางเก็บ history stock-in of Product = เก็บประวัติการรับเข้า(ซื้อ)ของสินค้านั้นๆ
class StockIn(db.Model):
    __tablename__ = 'stock_in'
    id = db.Column(db.Integer, primary_key=True)

    doc_number = db.Column(db.String(50), unique=True, nullable=False) #เลขเอกสารต่างๆ GRN-2025-08-001
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    note = db.Column(db.String(255), nullable=True) #หมายเหตุ
    image_filename = db.Column(db.String(255), nullable=True)

    # 👇 ใส่ expiry ของ “รอบรับเข้า” นี้ครั้งเดียว ใช้กับ entries ทั้งหมด
    expiry_date = db.Column(db.Date, nullable=True) 

    # 1 StockIn -> N Entries
    entries = db.relationship("StockInEntry", back_populates="stockin", cascade="all, delete-orphan",passive_deletes=True)

    # เผื่ออยาก query ดู batch ของใบนี้ทั้งหมด
    batches = db.relationship("StockBatch",back_populates="stockin", passive_deletes=True,lazy="select")
    

# ตารางเก็บข้อมูลประวัติการรับเข้าสินค้า ตามStock-in-id
class StockInEntry(db.Model):
    __tablename__ = 'stock_in_entry'
    id = db.Column(db.Integer, primary_key=True)

    # อ้างกลับไปยังเอกสารรับเข้า (StockIn)
    stockin_id = db.Column(db.Integer, db.ForeignKey('stock_in.id', ondelete='CASCADE'), nullable=False)
    stockin = db.relationship("StockIn", back_populates="entries")

    # Product + Variant (เลือกได้ว่าผูก variant หรือใช้ custom)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id', ondelete='CASCADE'), nullable=False)
    product = db.relationship("Product", backref=db.backref("stockin_entries", lazy="dynamic"))

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

    __table_args__ = (
        CheckConstraint('pack_size_at_receipt > 0', name='ck_entry_pack_size_positive'),
        CheckConstraint('quantity > 0',            name='ck_entry_qty_positive'),
    )

class StockBatch(db.Model):
    __tablename__ = 'stock_batch'
    id = db.Column(db.Integer, primary_key=True)

    # ผูกกับ header + product (ระบุขอบเขตการรวม)
    stockin_id = db.Column(db.Integer, db.ForeignKey('stock_in.id', ondelete='CASCADE'), nullable=False)
    stockin    = db.relationship("StockIn", back_populates="batches")

    product_id = db.Column(db.Integer, db.ForeignKey('product.id', ondelete='CASCADE'), nullable=False)
    product = db.relationship("Product", backref=db.backref("batches", lazy="dynamic"))

    lot_number = db.Column(db.String(100), nullable=True)
    expiry_date = db.Column(db.Date, nullable=True)

    qty_received = db.Column(db.Integer, nullable=False, default=0)
    qty_remaining = db.Column(db.Integer, nullable=False, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

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
    )

# ตารางเก็บข้อมูลประวัติการขายสินค้า 
class Sale(db.Model):
    __tablename__ = 'sale'
    id = db.Column(db.Integer, primary_key=True)

    # FK สำหรับ Product และ Variant (ตรงตามความต้องการของคุณ)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    variant_id = db.Column(db.Integer, db.ForeignKey('product_variant.id'), nullable=False)
    channel_id = db.Column(db.Integer, db.ForeignKey('sales_channel.id'), nullable=False)
    
    sale_date = db.Column(db.DateTime, default=utc_now) #วันที่ขาย
    customer_name = db.Column(db.String(100))   #ชื่อลูกค้า กรณีที่ต้องการหาว่าลูกค้าประจำ / ลูกค้าใหม่
    province = db.Column(db.String(100)) #จังหวัดที่จัดส่ง
    quantity = db.Column(db.Integer, nullable=False) #จำนวนที่ขาย * packsize จาก productVariant 

    # ข้อมูลที่ Denormalize เพื่อความถูกต้องในการเก็บประวัติ
    sale_price = db.Column(db.Float, nullable=False) #ราคาขายต่อหน่วยที่ขายไป
    pack_size_at_sale = db.Column(db.Integer, nullable=False) #ดึงค่า pack_size
    sale_mode_at_sale = db.Column(db.String(50), nullable=False) #ดึงค่าชื่อ sale_mode มาเผื่อถูกลบ

    # ข้อมูลการเงิน
    shipping_fee = db.Column(db.Float, default=0.0) #ค่าขนส่ง
    shop_discount = db.Column(db.Float, default=0.0) #ส่วนลดจากร้านค้า(เรา)
    platform_discount = db.Column(db.Float, default=0.0) #ส่วนลดจากช่องทางการขาย
    coin_discount = db.Column(db.Float, default=0.0) #ส่วนลดเหรียญ

    # ค่าเปอร์เซ็นต์ที่ Denormalize
    channel_name_at_sale = db.Column(db.String(50)) #เก็บชื่อมาเพื่อใช้แสดงในกรณีลบออกไป?
    commission_percent_at_sale = db.Column(db.Float, default=0.0)  #ค่าธรรมเนียมการขาย
    transaction_percent_at_sale = db.Column(db.Float, default=0.0) #ค่าธุรกรรมการชำระเงิน  

    #ค่าที่ต้องการใช้แสดงผ่านการคำนวณใน API
    total_price = db.Column(db.Float, nullable=False) #ราคาสุทธิ
    vat_amount = db.Column(db.Float, default=0.0) #ภาษีมูลค่าเพิ่ม
    seller_receive = db.Column(db.Float, default=0.0) #ราคาที่เราได้ 
    customer_pay = db.Column(db.Float, default=0.0)  #ราคาที่ลูกค้าจ่าย
    commission_fee = db.Column(db.Float, default=0.0)  #ค่าธรรมเนียมการขาย
    transaction_fee = db.Column(db.Float, default=0.0) #ค่าธุรกรรมการชำระเงิน

    product = db.relationship('Product', backref='sales_records')
    variant = db.relationship('ProductVariant', backref='sales_records')
    channel = db.relationship('SalesChannel', backref='sales_records')

# ตารางเก็บข้อมูลช่องทาง platform แสดงค่าค่าคอมมิชชั่น/การชำระเงินที่โดนหักจาก platform ต่างๆ
class SalesChannel(db.Model): 
    __tablename__ = 'sales_channel'
    id = db.Column(db.Integer, primary_key=True)
    channel_name = db.Column(db.String(50), unique=True, nullable=False) #ชื่อร้านของเรา
    store_desc = db.Column(db.String(255)) #รายละเอียดร้านค้า
    platform_tier_id = db.Column(db.Integer, db.ForeignKey("platform_tier.id"), nullable=False)
    is_active = db.Column(db.Boolean, default=True) # ⭐ เพิ่ม Soft Delete
    
    platform_tier = db.relationship("PlatformTier", backref="stores")

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