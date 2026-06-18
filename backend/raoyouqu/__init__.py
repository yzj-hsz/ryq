import os
from pathlib import Path

from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate

from .models import db
from .routes_api import bp as api_bp
from .routes_auth import auth_bp
from .routes_admin import admin_bp
from .seed import seed_admin_if_empty, seed_if_empty


def _warn_if_migrations_pending(backend_dir: Path) -> None:
    migrations_dir = backend_dir / "migrations"
    if not migrations_dir.exists():
        return

    try:
        script = ScriptDirectory(str(migrations_dir))
        heads = script.get_heads()
        with db.engine.connect() as conn:
            current_rev = MigrationContext.configure(conn).get_current_revision()
        if not current_rev:
            print(
                "Database migration warning: current database has no Alembic revision. "
                "Run the migration command manually before serving traffic."
            )
            return
        if current_rev not in heads:
            print(
                "Database migration warning: database revision is not at head "
                f"(current={current_rev}, heads={','.join(heads)}). "
                "Run the migration command manually before serving traffic."
            )
    except Exception as exc:
        print(f"Database migration status check failed: {exc}")


def create_app() -> Flask:
    app = Flask(__name__)
    backend_dir = Path(__file__).resolve().parent.parent
    load_dotenv(backend_dir / ".env")
    
    # 优先从环境变量获取，支持 MySQL (格式: mysql+pymysql://user:pass@host:port/db)
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        default_sqlite = backend_dir / "data.db"
        db_url = f"sqlite:///{default_sqlite.as_posix()}"
    
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET"] = os.environ.get(
        "JWT_SECRET", "dev-jwt-secret-change-in-production"
    )
    app.config["APP_ENV"] = os.environ.get("APP_ENV", os.environ.get("FLASK_ENV", "development")).lower()
    allow_placeholder_seed = os.environ.get("ALLOW_PLACEHOLDER_SEED_DATA")
    if allow_placeholder_seed is not None:
        app.config["ALLOW_PLACEHOLDER_SEED_DATA"] = allow_placeholder_seed.strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
    
    # 静态文件与上传配置
    app.config["UPLOAD_FOLDER"] = Path(app.root_path) / "static" / "uploads"
    app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 增加到 100MB，支持视频上传
    
    # 确保上传目录存在
    app.config["UPLOAD_FOLDER"].mkdir(parents=True, exist_ok=True)
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    db.init_app(app)
    migrate = Migrate(app, db)
    
    app.register_blueprint(api_bp, url_prefix="/api/v1")
    app.register_blueprint(auth_bp, url_prefix="/api/v1")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({"error": "file_too_large", "message": "文件大小超过限制 (最大 100MB)"}), 413

    with app.app_context():
        # 自动尝试创建数据库 (针对 MySQL)
        if db_url.startswith("mysql"):
            try:
                from sqlalchemy import create_engine
                from sqlalchemy.engine.url import make_url
                url = make_url(db_url)
                dbname = url.database
                
                # 连接到没有数据库名的服务器
                server_url = f"mysql+pymysql://{url.username}:{url.password}@{url.host}:{url.port or 3306}"
                engine = create_engine(server_url)
                with engine.connect() as conn:
                    # 关闭自动提交模式以执行 DDL
                    from sqlalchemy import text
                    conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {dbname} CHARACTER SET utf8mb4"))
                    print(f"Database '{dbname}' checked/created.")
            except Exception as e:
                print(f"Auto-create database failed: {e}. Please ensure database '{dbname}' exists.")

        try:
            from sqlalchemy import inspect

            inspector = inspect(db.engine)
            existing_tables = set(inspector.get_table_names())
            _warn_if_migrations_pending(backend_dir)

            # 不再在应用启动时自动执行迁移，避免服务重启触发危险变更。
            if {"admin_user", "site_config"}.issubset(existing_tables):
                seed_if_empty()
                seed_admin_if_empty()
            else:
                print(
                    "Database schema warning: required tables are missing. "
                    "Run the migration command manually before using the app."
                )
        except Exception as e:
            print(f"Database initialization warning: {e}")

    return app
