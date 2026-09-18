"""gift box tables

Revision ID: f3a4b5c6d7e8
Revises: e1f2a3b4c5d6
Create Date: 2026-09-18 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f3a4b5c6d7e8"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade():
    bind = op.get_bind()

    if not _table_exists(bind, "gift_box"):
        op.create_table(
            "gift_box",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("box_type", sa.String(length=32), nullable=False, server_default="square"),
            sa.Column("packing_fee", sa.Float(), nullable=False, server_default="0"),
            sa.Column("min_price", sa.Float(), nullable=False, server_default="0"),
            sa.Column("sort_order", sa.Integer(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists(bind, "gift_box_goods"):
        op.create_table(
            "gift_box_goods",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("summary", sa.String(length=512), nullable=True),
            sa.Column("w", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("h", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("price", sa.Float(), nullable=False, server_default="0"),
            sa.Column("color", sa.String(length=32), nullable=True),
            sa.Column("product_id", sa.Integer(), nullable=True),
            sa.Column("sort_order", sa.Integer(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["product_id"], ["product.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists(bind, "user_gift_box"):
        op.create_table(
            "user_gift_box",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("gift_box_id", sa.Integer(), nullable=True),
            sa.Column("box_name", sa.String(length=128), nullable=True),
            sa.Column("box_type", sa.String(length=32), nullable=True),
            sa.Column("packing_fee", sa.Float(), nullable=False, server_default="0"),
            sa.Column("items_json", sa.Text(), nullable=True),
            sa.Column("total_price", sa.Float(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["gift_box_id"], ["gift_box.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["miniapp_user.id"]),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade():
    bind = op.get_bind()
    for table_name in ("user_gift_box", "gift_box_goods", "gift_box"):
        if _table_exists(bind, table_name):
            op.drop_table(table_name)
