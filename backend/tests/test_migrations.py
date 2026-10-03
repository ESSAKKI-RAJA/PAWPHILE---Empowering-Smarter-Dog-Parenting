"""BIN1 migration tests — chain, fresh install, upgrade, rollback, preservation.

Run: venv/Scripts/python -m pytest backend/tests/test_migrations.py -v
Uses a scratch SQLite file + Alembic programmatic API. No network.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

TMP_DB = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scratch_migration_test.db"))
if os.path.exists(TMP_DB):
    os.remove(TMP_DB)

os.environ["DATABASE_URL"] = f"sqlite:///{TMP_DB}"

from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect, text


def _cfg() -> Config:
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{TMP_DB}")
    return cfg


def test_chain_is_linear_and_ordered():
    cfg = _cfg()
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected single head, got {heads}"
    assert heads[0] == "b1n4ec0sys7em"
    revs = list(script.walk_revisions())
    by_id = {r.revision: r for r in revs}
    assert by_id["b1n4ec0sys7em"].down_revision == "e3v3tc0ll4b1n3"
    assert by_id["e3v3tc0ll4b1n3"].down_revision == "d1nt3ll1g3nc3b2"
    assert by_id["c2r0nw0rk3r1"].down_revision == "b1n1f0und4t10n"
    assert by_id["b1n1f0und4t10n"].down_revision == "8931a6352851"
    assert by_id["8931a6352851"].down_revision is None


def test_fresh_upgrade_head_creates_bin1_schema():
    command.upgrade(_cfg(), "head")
    insp = inspect(create_engine(f"sqlite:///{TMP_DB}"))
    tables = set(insp.get_table_names())
    for t in ["users", "dog_profiles", "health_events", "symptoms", "medications",
              "weight_measurements", "report_records", "share_grants", "reminder_v1",
              "notifications", "consent_records", "sync_operations", "ai_analysis_records",
              "allergies", "procedures", "lab_results", "imaging_studies", "observations",
              "activity_records", "nutrition_entries", "behavior_entries", "health_files",
              "veterinarians", "clinics",
              "care_team_members", "vet_health_packages", "consultations",
              "vet_questions", "vet_notes", "follow_ups",
              "organizations", "org_memberships", "vet_professionals",
              "pet_care_relationships", "external_connections", "external_imports",
              "lab_panels", "device_readings", "partner_api_clients",
              "api_credentials", "webhook_subscriptions", "webhook_deliveries",
              "plans", "entitlements"]:
        assert t in tables, f"missing table {t}"
    for col in ["purpose", "grantee_user_id", "consultation_id", "package_id"]:
        assert col in {c["name"] for c in insp.get_columns("share_grants")}, \
            f"share_grants missing BIN3 column {col}"
    dog_cols = {c["name"] for c in insp.get_columns("dog_profiles")}
    for col in ["species", "sex", "date_of_birth", "profile_image_ref", "is_archived"]:
        assert col in dog_cols, f"dog_profiles missing {col}"
    notif_cols = {c["name"] for c in insp.get_columns("notifications")}
    assert "processing_lock" in notif_cols
    # unique idempotency constraint present
    uq = insp.get_unique_constraints("sync_operations")
    assert any("client_operation_id" in str(u.get("column_names")) for u in uq), uq


def test_downgrade_reupgrade_and_data_preservation():
    eng = create_engine(f"sqlite:///{TMP_DB}")
    with eng.begin() as conn:
        conn.execute(text("INSERT INTO users (id, clerk_user_id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'mig_user', 'm@x.com')"))
        conn.execute(text("INSERT INTO dog_profiles (id, user_id, name, breed) VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'MigDog', 'Pariah')"))
        conn.execute(text("INSERT INTO vaccine_records (id, dog_id, name) VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Rabies')"))
        conn.execute(text("INSERT INTO symptoms (id, pet_id, name) VALUES ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'cough')"))

    # Roll back the two newest revisions (ecosystem + collaboration).
    # Landing on d1nt3ll1g3nc3b2: BIN2 lineage + worker survive; BIN3/BIN4 drop.
    command.downgrade(_cfg(), "-2")
    insp = inspect(create_engine(f"sqlite:///{TMP_DB}"))
    assert "processing_lock" in {c["name"] for c in insp.get_columns("notifications")}
    assert "rules_version" in {c["name"] for c in insp.get_columns("ai_analysis_records")}
    assert "care_team_members" not in set(insp.get_table_names())
    assert "organizations" not in set(insp.get_table_names())
    assert "purpose" not in {c["name"] for c in insp.get_columns("share_grants")}

    # Re-upgrade to head.
    command.upgrade(_cfg(), "head")
    insp = inspect(create_engine(f"sqlite:///{TMP_DB}"))
    assert "processing_lock" in {c["name"] for c in insp.get_columns("notifications")}
    assert "rules_version" in {c["name"] for c in insp.get_columns("ai_analysis_records")}
    assert "care_team_members" in set(insp.get_table_names())
    assert "organizations" in set(insp.get_table_names())
    assert "purpose" in {c["name"] for c in insp.get_columns("share_grants")}
    assert "dedupe_key" in {c["name"] for c in insp.get_columns("notifications")}

    # Existing records survived the round-trip.
    eng = create_engine(f"sqlite:///{TMP_DB}")
    with eng.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM users WHERE clerk_user_id='mig_user'")).scalar() == 1
        assert conn.execute(text("SELECT COUNT(*) FROM dog_profiles WHERE name='MigDog'")).scalar() == 1
        assert conn.execute(text("SELECT COUNT(*) FROM vaccine_records WHERE name='Rabies'")).scalar() == 1
        assert conn.execute(text("SELECT COUNT(*) FROM symptoms WHERE name='cough'")).scalar() == 1
