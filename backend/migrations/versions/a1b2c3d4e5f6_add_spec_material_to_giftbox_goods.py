"""add spec/material to gift_box_goods

Revision ID: a1b2c3d4e5f6
Revises: f3a4b5c6d7e8
Create Date: 2026-09-28 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f3a4b5c6d7e8'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'gift_box_goods' in tables:
        columns = [c['name'] for c in inspector.get_columns('gift_box_goods')]
        if 'spec' not in columns:
            op.add_column('gift_box_goods', sa.Column('spec', sa.String(length=128), nullable=True))
        if 'material' not in columns:
            op.add_column('gift_box_goods', sa.Column('material', sa.String(length=256), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if 'gift_box_goods' in tables:
        columns = [c['name'] for c in inspector.get_columns('gift_box_goods')]
        if 'material' in columns:
            op.drop_column('gift_box_goods', 'material')
        if 'spec' in columns:
            op.drop_column('gift_box_goods', 'spec')
