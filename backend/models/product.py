from sqlalchemy import UniqueConstraint
from ._base import db, utc_now
  
# ตารางเก็บข้อมูล Product แต่ละตัว
class Product(db.Model):
    __tablename__ = "product" 
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    sku = db.Column(db.String(50), nullable=False) #รหัสSKU
    category = db.Column(db.String(50), nullable=False) #หมวดหมู่สินค้า เช่น Vitamin / Drug / กระดาษ  ไม่ได้มีผลอะไรกับ data
    unit = db.Column(db.String(20), nullable=False) #หน่วยนับ เช่น 
    cost_price = db.Column(db.Float, nullable=False) #ราคาต้นทุนสินค้า
    stock = db.Column(db.Integer, default=0) #จำนวนคงเหลือรวม
    has_expire = db.Column(db.Boolean, default=False) #เป็นสินค้ามีวันหมดอายุไหม
    
    # Timestamp fields (timezone-aware)
    created_at = db.Column(db.DateTime, nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    # สินค้าของร้านค้า workspace
    workspace_id = db.Column(db.Integer, db.ForeignKey("workspace.id", ondelete="CASCADE"),nullable=False, index=True)
    workspace = db.relationship("Workspace", backref="products")

    variants = db.relationship('ProductVariant', backref='product', cascade="all, delete-orphan", lazy="selectin") #ต่อ One-to-Many กับ ProductVariant เพราะ Product 1 ชิ้นมีรูปแบบการขายได้หลายแบบ
    images = db.relationship('ProductImage', backref='product', cascade="all, delete-orphan", lazy="selectin")  #ต่อ One-to-Many กับ ProductImage เพราะ Product 1 ชิ้นมีรูปภาพหลายภาพได้ ใช้แค่แสดงเฉยๆ 

    __table_args__ = (
        UniqueConstraint("workspace_id", "sku", name="uq_product_ws_sku"),
    )

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