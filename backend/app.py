import click
from flask import Flask, jsonify, request
from flask.cli import with_appcontext
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from seed_data import seed_platforms
from model import Platform, PlatformTier, db
from routes.product_routes import product_bp
from routes.stockin_routes import stockin_bp
from routes.sale_routes import sale_bp
from routes.channel_routes import channel_bp
from routes.platform_routes import platform_bp
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3

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
app.register_blueprint(platform_bp)

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

with app.app_context():
    db.create_all()

@app.cli.command("seed_platforms")
@with_appcontext
def seed_platforms_command():
    seed_platforms()
    click.echo("✅ Seeded Platforms & Tiers")

@app.cli.command("clear_platforms")
@with_appcontext
def clear_platforms_command():
    PlatformTier.query.delete()
    Platform.query.delete()
    db.session.commit()
    print("✅ Cleared all platforms and tiers")

if __name__ == '__main__':
    app.run(port=5001, debug=True)
