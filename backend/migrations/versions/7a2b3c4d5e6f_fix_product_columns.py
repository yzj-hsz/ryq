"""fix product columns

Revision ID: 7a2b3c4d5e6f
Revises: 8f3c1b2a9d4e
Create Date: 2026-05-19 11:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7a2b3c4d5e6f'
down_revision = '8f3c1b2a9d4e'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 检查并添加缺失的列
    if 'product' in tables:
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
