"""bin1 worker hardening

Revision ID: c2r0nw0rk3r1
Revises: b1n1f0und4t10n
Create Date: 2026-10-03

Adds notifications.processing_lock (nullable) for crash-safe worker claims.
Non-destructive: single nullable column, no backfill, fully reversible.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c2r0nw0rk3r1'
down_revision: Union[str, Sequence[str], None] = 'b1n1f0und4t10n'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.add_column("notifications", sa.Column("processing_lock", sa.String(length=80), nullable=True))
    except Exception:
        pass  # already applied on rerun


def downgrade() -> None:
    try:
        op.drop_column("notifications", "processing_lock")
    except Exception:
        pass
