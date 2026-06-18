"""recovery

Revision ID: 8f3c1b2a9d4e
Revises: 1da12c60db1c
Create Date: 2026-05-19 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8f3c1b2a9d4e'
down_revision = '1da12c60db1c'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 创建 product 表 if not exists
    if 'product' not in tables:
        op.create_table(
            'product',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(length=128), nullable=False),
            sa.Column('summary', sa.Text(), nullable=True),
            sa.Column('cover_url', sa.String(length=512), nullable=False),
            sa.Column('product_type', sa.String(length=32), nullable=False),
            sa.Column('list_category', sa.String(length=32), nullable=True),
            sa.Column('primary_category', sa.String(length=32), nullable=True),
            sa.Column('producer', sa.String(length=128), nullable=True),
            sa.Column('origin', sa.String(length=128), nullable=True),
            sa.Column('process_text', sa.Text(), nullable=True),
            sa.Column('detail_html', sa.Text(), nullable=True),
            sa.Column('qr_code_url', sa.String(length=512), nullable=True),
            sa.Column('sort_order', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('publisher_id', sa.Integer(), sa.ForeignKey('admin_user.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True)
        )
    else:
        # 检查并添加缺失的列
        columns = [c['name'] for c in inspector.get_columns('product')]
        if 'qr_code_url' not in columns:
            op.add_column('product', sa.Column('qr_code_url', sa.String(length=512), nullable=True))
        if 'publisher_id' not in columns:
            op.add_column('product', sa.Column('publisher_id', sa.Integer(), sa.ForeignKey('admin_user.id'), nullable=True))
        if 'created_at' not in columns:
            op.add_column('product', sa.Column('created_at', sa.DateTime(), nullable=True))

    # 创建 product_flow_step 表 if not exists
    if 'product_flow_step' not in tables:
        op.create_table(
            'product_flow_step',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('product_id', sa.Integer(), sa.ForeignKey('product.id'), nullable=False),
            sa.Column('step_order', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('image_url', sa.String(length=512), nullable=False),
            sa.Column('caption', sa.String(length=256), nullable=True)
        )

    # 创建 product_gallery 表 if not exists
    if 'product_gallery' not in tables:
        op.create_table(
            'product_gallery',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('product_id', sa.Integer(), sa.ForeignKey('product.id'), nullable=False),
            sa.Column('url', sa.String(length=512), nullable=False),
            sa.Column('sort_order', sa.Integer(), nullable=True, server_default='0')
        )


def downgrade():
    pass
