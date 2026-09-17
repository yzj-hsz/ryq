"""add role access token usage fields

Revision ID: e1f2a3b4c5d6
Revises: d4f5e6a7b8c9
Create Date: 2026-09-14 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e1f2a3b4c5d6"
down_revision = "d4f5e6a7b8c9"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade():
    bind = op.get_bind()
    if not _table_exists(bind, "role_access_token"):
        return

    with op.batch_alter_table("role_access_token", schema=None) as batch_op:
        if not _column_exists(bind, "role_access_token", "max_uses"):
            batch_op.add_column(sa.Column("max_uses", sa.Integer(), nullable=True))
        if not _column_exists(bind, "role_access_token", "used_count"):
            batch_op.add_column(
                sa.Column("used_count", sa.Integer(), nullable=False, server_default="0")
            )
        if not _column_exists(bind, "role_access_token", "revoked_at"):
            batch_op.add_column(sa.Column("revoked_at", sa.DateTime(), nullable=True))


def downgrade():
    bind = op.get_bind()
    if not _table_exists(bind, "role_access_token"):
        return

    with op.batch_alter_table("role_access_token", schema=None) as batch_op:
        if _column_exists(bind, "role_access_token", "revoked_at"):
            batch_op.drop_column("revoked_at")
        if _column_exists(bind, "role_access_token", "used_count"):
            batch_op.drop_column("used_count")
        if _column_exists(bind, "role_access_token", "max_uses"):
            batch_op.drop_column("max_uses")

