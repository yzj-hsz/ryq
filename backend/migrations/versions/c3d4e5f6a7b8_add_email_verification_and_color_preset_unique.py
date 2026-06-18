"""add email verification table and color preset uniqueness

Revision ID: c3d4e5f6a7b8
Revises: b2c4d6e8f901
Create Date: 2026-06-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c3d4e5f6a7b8"
down_revision = "b2c4d6e8f901"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _index_exists(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def _unique_exists(bind, table_name: str, constraint_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(
        constraint["name"] == constraint_name
        for constraint in inspector.get_unique_constraints(table_name)
    )


def upgrade():
    bind = op.get_bind()
    if not _table_exists(bind, "email_verification_code"):
        op.create_table(
            "email_verification_code",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("email", sa.String(length=128), nullable=False),
            sa.Column("code", sa.String(length=16), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("expired_at", sa.DateTime(), nullable=False),
            sa.Column("used_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _index_exists(bind, "email_verification_code", "ix_email_verification_code_email"):
        op.create_index(
            "ix_email_verification_code_email",
            "email_verification_code",
            ["email"],
            unique=False,
        )
    if not _index_exists(bind, "email_verification_code", "ix_email_verification_code_email_code"):
        op.create_index(
            "ix_email_verification_code_email_code",
            "email_verification_code",
            ["email", "code"],
            unique=False,
        )
    if not _index_exists(bind, "email_verification_code", "ix_email_verification_code_email_created_at"):
        op.create_index(
            "ix_email_verification_code_email_created_at",
            "email_verification_code",
            ["email", "created_at"],
            unique=False,
        )

    bind.execute(
        sa.text(
            """
            DELETE FROM color_card_preset
            WHERE id IN (
                SELECT id FROM (
                    SELECT duplicate.id
                    FROM color_card_preset AS duplicate
                    JOIN color_card_preset AS survivor
                      ON duplicate.fabric_option_id = survivor.fabric_option_id
                     AND duplicate.pattern_option_id = survivor.pattern_option_id
                     AND duplicate.mordant_option_id = survivor.mordant_option_id
                     AND duplicate.time_option_id = survivor.time_option_id
                     AND duplicate.id > survivor.id
                ) AS duplicate_ids
            )
            """
        )
    )

    if not _unique_exists(bind, "color_card_preset", "uq_color_card_preset_combination"):
        with op.batch_alter_table("color_card_preset", schema=None) as batch_op:
            batch_op.create_unique_constraint(
                "uq_color_card_preset_combination",
                [
                    "fabric_option_id",
                    "pattern_option_id",
                    "mordant_option_id",
                    "time_option_id",
                ],
            )


def downgrade():
    bind = op.get_bind()
    if _unique_exists(bind, "color_card_preset", "uq_color_card_preset_combination"):
        with op.batch_alter_table("color_card_preset", schema=None) as batch_op:
            batch_op.drop_constraint("uq_color_card_preset_combination", type_="unique")

    if _table_exists(bind, "email_verification_code"):
        if _index_exists(bind, "email_verification_code", "ix_email_verification_code_email_created_at"):
            op.drop_index(
                "ix_email_verification_code_email_created_at",
                table_name="email_verification_code",
            )
        if _index_exists(bind, "email_verification_code", "ix_email_verification_code_email_code"):
            op.drop_index(
                "ix_email_verification_code_email_code",
                table_name="email_verification_code",
            )
        if _index_exists(bind, "email_verification_code", "ix_email_verification_code_email"):
            op.drop_index(
                "ix_email_verification_code_email",
                table_name="email_verification_code",
            )
        op.drop_table("email_verification_code")
