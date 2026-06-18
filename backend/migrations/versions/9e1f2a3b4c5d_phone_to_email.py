"""miniapp_user: phone -> email without deleting user data

Revision ID: 9e1f2a3b4c5d
Revises: 7a2b3c4d5e6f
Create Date: 2026-05-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "9e1f2a3b4c5d"
down_revision = "7a2b3c4d5e6f"
branch_labels = None
depends_on = None
def _index_names(table: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {idx["name"] for idx in inspector.get_indexes(table)}


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "miniapp_user" not in inspector.get_table_names():
        return

    columns = {c["name"] for c in inspector.get_columns("miniapp_user")}
    indexes = _index_names("miniapp_user")

    for idx in ("ix_miniapp_user_phone", "phone"):
        if idx in indexes:
            try:
                op.drop_index(idx, table_name="miniapp_user")
            except Exception:
                pass

    if "phone" in columns:
        op.drop_column("miniapp_user", "phone")

    columns = {c["name"] for c in sa.inspect(bind).get_columns("miniapp_user")}
    if "email" not in columns:
        op.add_column("miniapp_user", sa.Column("email", sa.String(128), nullable=True))

    indexes = _index_names("miniapp_user")
    if "ix_miniapp_user_email" not in indexes:
        op.create_index("ix_miniapp_user_email", "miniapp_user", ["email"], unique=True)


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "miniapp_user" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("miniapp_user")}
    indexes = _index_names("miniapp_user")

    if "ix_miniapp_user_email" in indexes:
        try:
            op.drop_index("ix_miniapp_user_email", table_name="miniapp_user")
        except Exception:
            pass
    if "email" in columns:
        op.drop_column("miniapp_user", "email")

    columns = {c["name"] for c in sa.inspect(bind).get_columns("miniapp_user")}
    if "phone" not in columns:
        op.add_column("miniapp_user", sa.Column("phone", sa.String(20), nullable=True))
    indexes = _index_names("miniapp_user")
    if "ix_miniapp_user_phone" not in indexes:
        op.create_index("ix_miniapp_user_phone", "miniapp_user", ["phone"], unique=True)
