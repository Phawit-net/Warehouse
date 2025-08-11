from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from model import db
from routes.product_routes import product_bp
from routes.stockin_routes import stockin_bp
from routes.sale_routes import sale_bp
from routes.channel_routes import channel_bp

app = Flask(__name__)
app.config["DEBUG"] = True
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)  # ให้ frontend (ต่าง origin) เรียกได้

# สร้าง path สำหรับไฟล์ .db เก็บในโปรเจกต์
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'warehouse.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# init db
db.init_app(app)

# register routes
app.register_blueprint(product_bp)
app.register_blueprint(stockin_bp)
app.register_blueprint(sale_bp)
app.register_blueprint(channel_bp)

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(port=5001, debug=True)
