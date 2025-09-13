import os
import sqlite3
import click

from flask import Flask, jsonify
from flask.cli import with_appcontext
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS  # ใช้ผ่าน extensions.cors อยู่แล้ว แต่ import ไว้ไม่เสียหาย

from sqlalchemy import event
from sqlalchemy.engine import Engine

from config import Config
from extensions import cors, jwt, limiter, ph  # มาจาก Step 1 ที่เราวางไว้
from models import db, Platform, PlatformTier, Membership, User, Workspace  # db = SQLAlchemy() อยู่ใน model ของเน็ท
from seed_data import seed_platforms

# ----- เปิด Foreign Keys บน SQLite -----
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()


def create_app():
    app = Flask(__name__)

    # โหลดค่าคอนฟิกหลัก (JWT, CORS, etc.)
    app.config.from_object(Config)

    # ตั้งค่า DB ถ้ายังไม่ได้ตั้งจาก ENV/Config
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config.setdefault(
        "SQLALCHEMY_DATABASE_URI",
        "sqlite:///" + os.path.join(basedir, "warehouse.db"),
    )
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)

    # ----- init extensions -----
    cors.init_app(
        app,
        resources={ r"/api/*": { "origins": ["http://localhost:3000", "http://127.0.0.1:3000"] } }, 
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-CSRF-TOKEN"],  # ⬅️ สำคัญ
    )
    jwt.init_app(app)
    limiter.init_app(app)
    db.init_app(app)

    # ----- register blueprints (อย่าใส่ url_prefix ถ้า endpoint ภายในขึ้นต้น /api/ อยู่แล้ว) -----
    from routes.product_routes import product_bp
    from routes.stockin_routes import stockin_bp
    from routes.sale_routes import sale_bp
    from routes.channel_routes import channel_bp
    from routes.platform_routes import platform_bp
    from routes.auth_routes import auth_bp
    from routes.workspace_routes import workspace_bp
    # (ภายหลังจะเพิ่ม auth_bp ตรงนี้)
    app.register_blueprint(product_bp)
    app.register_blueprint(stockin_bp)
    app.register_blueprint(sale_bp)
    app.register_blueprint(channel_bp)
    app.register_blueprint(platform_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(workspace_bp)

    # ----- CLI: init-db / seed / clear -----
    @app.cli.command("init-db")
    @with_appcontext
    def init_db_cmd():
        db.create_all()
        click.echo("✅ Initialized DB")

    @app.cli.command("seed-platforms")
    @with_appcontext
    def seed_platforms_cmd():
        seed_platforms()
        click.echo("✅ Seeded Platforms & Tiers")

    @app.cli.command("clear-platforms")
    @with_appcontext
    def clear_platforms_cmd():
        PlatformTier.query.delete()
        Platform.query.delete()
        db.session.commit()
        click.echo("✅ Cleared Platforms & Tiers")

    @app.cli.command("create-owner")
    @click.option("--email", required=True)
    @click.option("--username", required=True)
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
    @click.option("--workspace", "workspace_name", required=False, help="ชื่อร้าน (optional)")
    @with_appcontext
    def create_owner_cmd(email, username, password, workspace_name):
        try:
            user = User(
                email=email.strip().lower(),
                username=username.strip(),
                password_hash=ph.hash(password),
            )
            # ✅ ถ้าไม่ได้ส่ง workspace name → ให้ None เพื่อไปตั้งชื่อใน onboarding
            ws = Workspace(name=workspace_name.strip() if workspace_name else None, plan="FREE")

            db.session.add_all([user, ws])
            db.session.flush()

            mem = Membership(user_id=user.id, workspace_id=ws.id, role="OWNER", is_primary=True)
            db.session.add(mem)

            db.session.commit()

            shown_name = workspace_name if workspace_name else "(ยังไม่ได้ตั้งชื่อ)"
            click.echo(f"✅ Created owner {email} for workspace '{shown_name}' (id={ws.id})")
        except Exception as e:
            db.session.rollback()
            click.echo(f"❌ Failed: {e}", err=True)

    return app


# WSGI/Dev entrypoint
app = create_app()

if __name__ == "__main__":
    # ปรับพอร์ตตามที่เน็ทใช้ก่อนหน้า (5001) หรือจะ default 5000 ก็ได้
    app.run(port=5001, debug=True)