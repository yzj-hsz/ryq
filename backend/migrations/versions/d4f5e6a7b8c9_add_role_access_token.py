"""add role access token table

Revision ID: d4f5e6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d4f5e6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _index_exists(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def upgrade():
    bind = op.get_bind()
    if not _table_exists(bind, "role_access_token"):
        op.create_table(
            "role_access_token",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("token", sa.String(length=128), nullable=False),
            sa.Column("role", sa.String(length=32), nullable=False),
            sa.Column("created_by_admin_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("expired_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["created_by_admin_id"], ["admin_user.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("token"),
        )
    if not _index_exists(bind, "role_access_token", "ix_role_access_token_token"):
        op.create_index(
            "ix_role_access_token_token",
            "role_access_token",
            ["token"],
            unique=True,
        )


def downgrade():
    bind = op.get_bind()
    if _table_exists(bind, "role_access_token"):
        if _index_exists(bind, "role_access_token", "ix_role_access_token_token"):
            op.drop_index("ix_role_access_token_token", table_name="role_access_token")
        op.drop_table("role_access_token")
