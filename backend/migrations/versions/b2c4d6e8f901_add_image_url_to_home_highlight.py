"""add image_url to home_highlight

Revision ID: b2c4d6e8f901
Revises: 41b049868981
Create Date: 2026-06-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import re


# revision identifiers, used by Alembic.
revision = 'b2c4d6e8f901'
down_revision = '41b049868981'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('home_highlight', schema=None) as batch_op:
        batch_op.add_column(sa.Column('image_url', sa.String(length=512), nullable=True))

    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, detail_html FROM home_highlight")).fetchall()
    pattern = re.compile(r"""<img[^>]+src=['"]([^'"]+)['"]""", re.IGNORECASE)
    for row in rows:
        if not row.detail_html:
            continue
        match = pattern.search(row.detail_html)
        if not match:
            continue
        bind.execute(
            sa.text("UPDATE home_highlight SET image_url = :image_url WHERE id = :id"),
            {"id": row.id, "image_url": match.group(1)},
        )


def downgrade():
    with op.batch_alter_table('home_highlight', schema=None) as batch_op:
        batch_op.drop_column('image_url')
