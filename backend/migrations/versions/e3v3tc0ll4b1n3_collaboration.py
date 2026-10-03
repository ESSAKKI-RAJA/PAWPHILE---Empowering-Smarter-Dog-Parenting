"""bin3 veterinary continuity & collaboration

Revision ID: e3v3tc0ll4b1n3
Revises: d1nt3ll1g3nc3b2
Create Date: 2026-10-04

New normalized tables: care_team_members, vet_health_packages, consultations,
vet_questions, vet_notes, follow_ups. Non-destructive extensions:
share_grants gains purpose/grantee_user_id/consultation_id/package_id;
notifications gains dedupe_key/subject/body (exactly-once collaboration
delivery through the existing BIN1 worker). All nullable/backward-compatible,
fully reversible, no data changes.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid

revision: str = 'e3v3tc0ll4b1n3'
down_revision: Union[str, Sequence[str], None] = 'd1nt3ll1g3nc3b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _uid():
    return uuid.uuid4()


def upgrade() -> None:
    op.create_table(
        "care_team_members",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True, default=_uid),
        sa.Column("pet_id", PG_UUID(as_uuid=True), sa.ForeignKey("dog_profiles.id"), nullable=False, index=True),
        sa.Column("owner_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("clinic_name", sa.String(200), nullable=True),
        sa.Column("role", sa.String(40), nullable=True, index=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("vet_user_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("verification_state", sa.String(30), nullable=True, index=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "vet_health_packages",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True, default=_uid),
        sa.Column("pet_id", PG_UUID(as_uuid=True), sa.ForeignKey("dog_profiles.id"), nullable=False, index=True),
        sa.Column("owner_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("consultation_id", PG_UUID(as_uuid=True), sa.ForeignKey("consultations.id"), nullable=True),
        sa.Column("package_type", sa.String(40), nullable=True, index=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("version", sa.Integer(), nullable=True),
        sa.Column("parent_package_id", PG_UUID(as_uuid=True), sa.ForeignKey("vet_health_packages.id"), nullable=True),
        sa.Column("snapshot", sa.JSON(), nullable=True),
        sa.Column("snapshot_digest", sa.String(64), nullable=True),
        sa.Column("selected_types", sa.JSON(), nullable=True),
        sa.Column("generated_by", sa.String(120), nullable=True),
        sa.Column("reviewed_by_owner", sa.Boolean(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("shared_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "consultations",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True, default=_uid),
        sa.Column("pet_id", PG_UUID(as_uuid=True), sa.ForeignKey("dog_profiles.id"), nullable=False, index=True),
        sa.Column("owner_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("care_member_id", PG_UUID(as_uuid=True), sa.ForeignKey("care_team_members.id"), nullable=True),
        sa.Column("share_id", PG_UUID(as_uuid=True), sa.ForeignKey("share_grants.id"), nullable=True),
        sa.Column("package_id", PG_UUID(as_uuid=True), sa.ForeignKey("vet_health_packages.id"), nullable=True),
        sa.Column("vet_user_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("purpose", sa.String(40), nullable=True, index=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "vet_questions",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True, default=_uid),
        sa.Column("pet_id", PG_UUID(as_uuid=True), sa.ForeignKey("dog_profiles.id"), nullable=False, index=True),
        sa.Column("consultation_id", PG_UUID(as_uuid=True), sa.ForeignKey("consultations.id"), nullable=True, index=True),
        sa.Column("owner_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("answer_text", sa.Text(), nullable=True),
        sa.Column("answered_by_user_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("answered_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "vet_notes",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True, default=_uid),
        sa.Column("pet_id", PG_UUID(as_uuid=True), sa.ForeignKey("dog_profiles.id"), nullable=False, index=True),
        sa.Column("consultation_id", PG_UUID(as_uuid=True), sa.ForeignKey("consultations.id"), nullable=False, index=True),
        sa.Column("author_user_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("author_label", sa.String(200), nullable=True),
        sa.Column("note_text", sa.Text(), nullable=False),
        sa.Column("follow_up_text", sa.Text(), nullable=True),
        sa.Column("effective_at", sa.DateTime(), nullable=False),
        sa.Column("visibility", sa.String(20), nullable=True, index=True),
        sa.Column("source", sa.String(40), nullable=True),
        sa.Column("verification_status", sa.String(20), nullable=True),
        sa.Column("health_event_id", PG_UUID(as_uuid=True), sa.ForeignKey("health_events.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "follow_ups",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True, default=_uid),
        sa.Column("pet_id", PG_UUID(as_uuid=True), sa.ForeignKey("dog_profiles.id"), nullable=False, index=True),
        sa.Column("consultation_id", PG_UUID(as_uuid=True), sa.ForeignKey("consultations.id"), nullable=False, index=True),
        sa.Column("originating_vet_user_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column("due_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("owner_ack_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("resulting_event_id", PG_UUID(as_uuid=True), sa.ForeignKey("health_events.id"), nullable=True),
        sa.Column("reminder_id", PG_UUID(as_uuid=True), sa.ForeignKey("reminder_v1.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    for table, name, typ, fk in [
        ("share_grants", "purpose", sa.String(40), None),
        ("share_grants", "grantee_user_id", PG_UUID(as_uuid=True), "users.id"),
        ("share_grants", "consultation_id", PG_UUID(as_uuid=True), "consultations.id"),
        ("share_grants", "package_id", PG_UUID(as_uuid=True), "vet_health_packages.id"),
        ("notifications", "dedupe_key", sa.String(120), None),
        ("notifications", "subject", sa.String(200), None),
        ("notifications", "body", sa.Text(), None),
    ]:
        try:
            if fk:
                op.add_column(table, sa.Column(name, typ, sa.ForeignKey(fk), nullable=True))
            else:
                col = sa.Column(name, typ, nullable=True)
                if table == "notifications" and name == "dedupe_key":
                    col = sa.Column(name, typ, nullable=True, index=True)
                op.add_column(table, col)
        except Exception:
            pass  # already applied on rerun


def downgrade() -> None:
    # dedupe_key is indexed: drop the index before the column (SQLite
    # cannot drop an indexed column; Postgres tolerates the extra step).
    try:
        op.drop_index("ix_notifications_dedupe_key", table_name="notifications")
    except Exception:
        pass
    for table, name in [
        ("notifications", "body"),
        ("notifications", "subject"),
        ("notifications", "dedupe_key"),
        ("share_grants", "package_id"),
        ("share_grants", "consultation_id"),
        ("share_grants", "grantee_user_id"),
        ("share_grants", "purpose"),
    ]:
        try:
            op.drop_column(table, name)
        except Exception:
            pass
    for table in ["follow_ups", "vet_notes", "vet_questions", "consultations",
                  "vet_health_packages", "care_team_members"]:
        try:
            op.drop_table(table)
        except Exception:
            pass
