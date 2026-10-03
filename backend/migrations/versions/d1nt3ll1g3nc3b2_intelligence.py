"""bin2 intelligence lineage

Revision ID: d1nt3ll1g3nc3b2
Revises: c2r0nw0rk3r1
Create Date: 2026-10-04

Extends ai_analysis_records with BIN2 lineage columns. All nullable —
fully backward-compatible, fully reversible, no data changes.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd1nt3ll1g3nc3b2'
down_revision: Union[str, Sequence[str], None] = 'c2r0nw0rk3r1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for name, typ in [
        ("status", sa.String(length=20)),
        ("period_start", sa.DateTime()),
        ("period_end", sa.DateTime()),
        ("method", sa.String(length=120)),
        ("rules_version", sa.String(length=40)),
        ("evidence", sa.JSON()),
    ]:
        try:
            op.add_column("ai_analysis_records", sa.Column(name, typ, nullable=True))
        except Exception:
            pass  # already applied on rerun


def downgrade() -> None:
    for name in ["evidence", "rules_version", "method", "period_end", "period_start", "status"]:
        try:
            op.drop_column("ai_analysis_records", name)
        except Exception:
            pass
