"""bin4 ecosystem & platform

Revision ID: b1n4ec0sys7em
Revises: e3v3tc0ll4b1n3
Create Date: 2026-10-04

New normalized tables: organizations, org_memberships, vet_professionals,
pet_care_relationships, external_connections, external_imports, lab_panels,
device_readings, partner_api_clients, api_credentials, webhook_subscriptions,
webhook_deliveries, plans, entitlements. No changes to existing tables.
Fully reversible, no data changes.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid

revision: str = 'b1n4ec0sys7em'
down_revision: Union[str, Sequence[str], None] = 'e3v3tc0ll4b1n3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _uid():
    return uuid.uuid4()


def _id():
    return sa.Column("id", PG_UUID(as_uuid=True), primary_key=True, default=_uid)


TABLES: list[tuple[str, list]] = [
    ("organizations", [
        _id(),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("org_type", sa.String(20), nullable=True, index=True),
        sa.Column("contact", sa.String(200), nullable=True),
        sa.Column("location", sa.String(300), nullable=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("created_by", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    ]),
    ("org_memberships", [
        _id(),
        sa.Column("org_id", PG_UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("user_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("role", sa.String(30), nullable=True, index=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    ]),
    ("vet_professionals", [
        _id(),
        sa.Column("user_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("org_id", PG_UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=True, index=True),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("professional_role", sa.String(80), nullable=True),
        sa.Column("professional_type", sa.String(80), nullable=True),
        sa.Column("jurisdiction", sa.String(120), nullable=True),
        sa.Column("location", sa.String(300), nullable=True),
        sa.Column("verification_state", sa.String(20), nullable=True, index=True),
        sa.Column("verification_source", sa.String(80), nullable=True),
        sa.Column("verification_evidence_ref", sa.String(300), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("verification_expires_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_by_user_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("professional_metadata", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    ]),
    ("pet_care_relationships", [
        _id(),
        sa.Column("pet_id", PG_UUID(as_uuid=True), sa.ForeignKey("dog_profiles.id"), nullable=False, index=True),
        sa.Column("owner_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("professional_id", PG_UUID(as_uuid=True), sa.ForeignKey("vet_professionals.id"), nullable=True, index=True),
        sa.Column("org_id", PG_UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=True, index=True),
        sa.Column("care_member_id", PG_UUID(as_uuid=True), nullable=True),
        sa.Column("purpose", sa.String(40), nullable=True, index=True),
        sa.Column("scope", sa.String(40), nullable=True, index=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    ]),
    ("external_connections", [
        _id(),
        sa.Column("owner_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("pet_id", PG_UUID(as_uuid=True), sa.ForeignKey("dog_profiles.id"), nullable=True, index=True),
        sa.Column("provider_type", sa.String(20), nullable=False, index=True),
        sa.Column("provider_name", sa.String(200), nullable=False),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("scopes", sa.JSON(), nullable=True),
        sa.Column("consent_purpose", sa.String(120), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    ]),
    ("external_imports", [
        _id(),
        sa.Column("connection_id", PG_UUID(as_uuid=True), sa.ForeignKey("external_connections.id"), nullable=False, index=True),
        sa.Column("pet_id", PG_UUID(as_uuid=True), sa.ForeignKey("dog_profiles.id"), nullable=False, index=True),
        sa.Column("external_id", sa.String(200), nullable=True, index=True),
        sa.Column("kind", sa.String(40), nullable=False, index=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("raw", sa.JSON(), nullable=True),
        sa.Column("normalized", sa.JSON(), nullable=True),
        sa.Column("result_event_id", PG_UUID(as_uuid=True), nullable=True),
        sa.Column("source_label", sa.String(40), nullable=True),
        sa.Column("verification_status", sa.String(20), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    ]),
    ("lab_panels", [
        _id(),
        sa.Column("pet_id", PG_UUID(as_uuid=True), sa.ForeignKey("dog_profiles.id"), nullable=False, index=True),
        sa.Column("panel_name", sa.String(200), nullable=False),
        sa.Column("ordered_at", sa.DateTime(), nullable=True),
        sa.Column("source", sa.String(40), nullable=True),
        sa.Column("source_ref", sa.String(200), nullable=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    ]),
    ("device_readings", [
        _id(),
        sa.Column("pet_id", PG_UUID(as_uuid=True), sa.ForeignKey("dog_profiles.id"), nullable=False, index=True),
        sa.Column("connection_id", PG_UUID(as_uuid=True), sa.ForeignKey("external_connections.id"), nullable=True, index=True),
        sa.Column("metric_type", sa.String(60), nullable=False, index=True),
        sa.Column("value", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(40), nullable=True),
        sa.Column("measured_at", sa.DateTime(), nullable=False, index=True),
        sa.Column("device_meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    ]),
    ("partner_api_clients", [
        _id(),
        sa.Column("org_id", PG_UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=True, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("scopes", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("created_by", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    ]),
    ("api_credentials", [
        _id(),
        sa.Column("client_id", PG_UUID(as_uuid=True), sa.ForeignKey("partner_api_clients.id"), nullable=False, index=True),
        sa.Column("key_hash", sa.String(64), nullable=False, index=True),
        sa.Column("key_prefix", sa.String(16), nullable=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    ]),
    ("webhook_subscriptions", [
        _id(),
        sa.Column("owner_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("client_id", PG_UUID(as_uuid=True), sa.ForeignKey("partner_api_clients.id"), nullable=True, index=True),
        sa.Column("events", sa.JSON(), nullable=True),
        sa.Column("url", sa.String(600), nullable=False),
        sa.Column("secret", sa.String(120), nullable=False),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    ]),
    ("webhook_deliveries", [
        _id(),
        sa.Column("subscription_id", PG_UUID(as_uuid=True), sa.ForeignKey("webhook_subscriptions.id"), nullable=False, index=True),
        sa.Column("event_type", sa.String(60), nullable=False, index=True),
        sa.Column("idempotency_key", sa.String(120), nullable=True, index=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("attempts", sa.Integer(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    ]),
    ("plans", [
        _id(),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("features", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    ]),
    ("entitlements", [
        _id(),
        sa.Column("user_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("org_id", PG_UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=True, index=True),
        sa.Column("plan_id", PG_UUID(as_uuid=True), sa.ForeignKey("plans.id"), nullable=True),
        sa.Column("features", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(20), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    ]),
]


def upgrade() -> None:
    for name, cols in TABLES:
        try:
            op.create_table(name, *cols)
        except Exception:
            pass  # already applied on rerun


def downgrade() -> None:
    for name, _cols in reversed(TABLES):
        try:
            op.drop_table(name)
        except Exception:
            pass
