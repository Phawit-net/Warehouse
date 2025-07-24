from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
 
# ตารางเก็บข้อมูล Product แต่ละตัว
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    sku = db.Column(db.String(50), unique=True, nullable=False) #รหัสSKU
    category = db.Column(db.String(50), nullable=False) #หมวดหมู่สินค้า เช่น Vitamin / Drug / กระดาษ  ไม่ได้มีผลอะไรกับ data
    unit = db.Column(db.String(20), nullable=False) #หน่วยนับ เช่น 
    cost_price = db.Column(db.Float, nullable=False) #ราคาต้นทุนสินค้า
    stock = db.Column(db.Integer, default=0) #จำนวนคงเหลือรวม
    variants = db.relationship('ProductVariant', backref='product', cascade="all, delete-orphan", lazy="selectin") #ต่อ One-to-Many กับ ProductVariant เพราะ Product 1 ชิ้นมีรูปแบบการขายได้หลายแบบ
    images = db.relationship('ProductImage', backref='product', cascade="all, delete-orphan", lazy="selectin")  #ต่อ One-to-Many กับ ProductImage เพราะ Product 1 ชิ้นมีรูปภาพหลายภาพได้ ใช้แค่แสดงเฉยๆ 
    @property
    def serialized_variants(self):
        return [
            {
                "sku_suffix": v.sku_suffix,
                "sale_mode": v.sale_mode,
                "pack_size": v.pack_size,
                "selling_price": v.selling_price,
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
    is_for_sale = db.Column(db.Boolean, default=True) #กำหนดรูปแบบ pack_size นี้ใช้สำหรับการขาย

    def to_dict(self):
        return {
            "id": self.id,
            "pack_size": self.pack_size,
            "sku_suffix": self.sku_suffix,
            "sale_mode": self.sale_mode,
            "pack_size": self.pack_size,
            "selling_price": self.selling_price,
            "is_for_sale": self.is_for_sale
        }

# ตารางเก็บข้อมูลไฟล์รูปของ ญพนกีแะ
class ProductImage(db.Model):
    __tablename__ = 'product_image'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False) #Id ของ Product
    image_filename = db.Column(db.String(200), nullable=False)  # เช่น 'image1.jpg'
    alt_text = db.Column(db.String(100)) 
    is_main = db.Column(db.Boolean, default=False)  