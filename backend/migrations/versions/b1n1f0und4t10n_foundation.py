"""bin1 foundation

Revision ID: b1n1f0und4t10n
Revises: 8931a6352851
Create Date: 2026-10-02

Adds canonical BIN1 tables + dog_profiles canonical columns.
Non-destructive: only creates new tables / adds nullable columns.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b1n1f0und4t10n'
down_revision: Union[str, Sequence[str], None] = '8931a6352851'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # dog_profiles canonical additions (nullable -> safe on existing data)
    for col, typ in [
        ("species", sa.String()),
        ("date_of_birth", sa.String()),
        ("sex", sa.String()),
        ("profile_image_ref", sa.String()),
        ("is_archived", sa.Boolean()),
    ]:
        try:
            op.add_column("dog_profiles", sa.Column(col, typ, nullable=True))
        except Exception:
            pass  # column may already exist on rerun

    op.create_table(
        'health_events',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pet_id', sa.UUID(), nullable=False),
        sa.Column('event_type', sa.String(length=60), nullable=False),
        sa.Column('source', sa.String(length=40), nullable=True),
        sa.Column('actor', sa.String(length=120), nullable=True),
        sa.Column('effective_at', sa.DateTime(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('verification_status', sa.String(length=20), nullable=True),
        sa.Column('title', sa.String(length=300), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('event_metadata', sa.JSON(), nullable=True),
        sa.Column('ref_table', sa.String(length=80), nullable=True),
        sa.Column('ref_id', sa.UUID(), nullable=True),
        sa.Column('corrects_event_id', sa.UUID(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['corrects_event_id'], ['health_events.id']),
        sa.ForeignKeyConstraint(['pet_id'], ['dog_profiles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_health_events_pet_effective', 'health_events', ['pet_id', 'effective_at'])
    op.create_index('ix_health_events_type', 'health_events', ['event_type'])

    def _clinical(name, extra):
        cols = [
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('pet_id', sa.UUID(), nullable=False),
            sa.Column('health_event_id', sa.UUID(), nullable=True),
            *extra,
            sa.Column('source', sa.String(length=40), nullable=True),
            sa.Column('verification_status', sa.String(length=20), nullable=True),
            sa.Column('is_archived', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['health_event_id'], ['health_events.id']),
            sa.ForeignKeyConstraint(['pet_id'], ['dog_profiles.id']),
            sa.PrimaryKeyConstraint('id'),
        ]
        op.create_table(name, *cols)
        op.create_index(f'ix_{name}_pet', name, ['pet_id'])

    _clinical('symptoms', [
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=True),
        sa.Column('onset_at', sa.DateTime(), nullable=True),
        sa.Column('duration_hours', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=True),
    ])
    _clinical('medications', [
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('dose', sa.String(length=120), nullable=True),
        sa.Column('dose_unit', sa.String(length=40), nullable=True),
        sa.Column('frequency', sa.String(length=120), nullable=True),
        sa.Column('route', sa.String(length=60), nullable=True),
        sa.Column('start_at', sa.DateTime(), nullable=True),
        sa.Column('end_at', sa.DateTime(), nullable=True),
        sa.Column('prescribed_by', sa.String(length=200), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=True),
    ])
    _clinical('allergies', [
        sa.Column('allergen', sa.String(length=200), nullable=False),
        sa.Column('reaction', sa.Text(), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=True),
    ])
    _clinical('procedures', [
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('performed_at', sa.DateTime(), nullable=True),
        sa.Column('clinic_name', sa.String(length=200), nullable=True),
        sa.Column('vet_name', sa.String(length=200), nullable=True),
        sa.Column('outcome', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
    ])
    _clinical('lab_results', [
        sa.Column('test_name', sa.String(length=200), nullable=False),
        sa.Column('result_value', sa.String(length=200), nullable=True),
        sa.Column('result_unit', sa.String(length=60), nullable=True),
        sa.Column('reference_range', sa.String(length=200), nullable=True),
        sa.Column('collected_at', sa.DateTime(), nullable=True),
        sa.Column('lab_name', sa.String(length=200), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
    ])
    _clinical('imaging_studies', [
        sa.Column('modality', sa.String(length=60), nullable=False),
        sa.Column('body_area', sa.String(length=120), nullable=True),
        sa.Column('performed_at', sa.DateTime(), nullable=True),
        sa.Column('clinic_name', sa.String(length=200), nullable=True),
        sa.Column('findings', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
    ])
    _clinical('observations', [
        sa.Column('category', sa.String(length=60), nullable=True),
        sa.Column('observed_at', sa.DateTime(), nullable=True),
        sa.Column('note', sa.Text(), nullable=False),
    ])

    op.create_table(
        'weight_measurements',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pet_id', sa.UUID(), nullable=False),
        sa.Column('health_event_id', sa.UUID(), nullable=True),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=True),
        sa.Column('measured_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=40), nullable=True),
        sa.Column('context', sa.String(length=300), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['health_event_id'], ['health_events.id']),
        sa.ForeignKeyConstraint(['pet_id'], ['dog_profiles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_weight_pet_time', 'weight_measurements', ['pet_id', 'measured_at'])

    op.create_table(
        'activity_records',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pet_id', sa.UUID(), nullable=False),
        sa.Column('health_event_id', sa.UUID(), nullable=True),
        sa.Column('activity_type', sa.String(length=80), nullable=False),
        sa.Column('duration_mins', sa.Integer(), nullable=True),
        sa.Column('distance_km', sa.Float(), nullable=True),
        sa.Column('occurred_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=40), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['health_event_id'], ['health_events.id']),
        sa.ForeignKeyConstraint(['pet_id'], ['dog_profiles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'nutrition_entries',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pet_id', sa.UUID(), nullable=False),
        sa.Column('health_event_id', sa.UUID(), nullable=True),
        sa.Column('food_name', sa.String(length=200), nullable=False),
        sa.Column('amount_g', sa.Float(), nullable=True),
        sa.Column('calories', sa.Float(), nullable=True),
        sa.Column('fed_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=40), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['health_event_id'], ['health_events.id']),
        sa.ForeignKeyConstraint(['pet_id'], ['dog_profiles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'behavior_entries',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pet_id', sa.UUID(), nullable=False),
        sa.Column('health_event_id', sa.UUID(), nullable=True),
        sa.Column('behavior_type', sa.String(length=80), nullable=False),
        sa.Column('intensity', sa.String(length=20), nullable=True),
        sa.Column('duration_mins', sa.Integer(), nullable=True),
        sa.Column('observed_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=40), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['health_event_id'], ['health_events.id']),
        sa.ForeignKeyConstraint(['pet_id'], ['dog_profiles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'veterinarians',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=True),
        sa.Column('phone', sa.String(length=60), nullable=True),
        sa.Column('email', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'clinics',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=True),
        sa.Column('address', sa.String(length=400), nullable=True),
        sa.Column('phone', sa.String(length=60), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'health_files',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pet_id', sa.UUID(), nullable=False),
        sa.Column('health_event_id', sa.UUID(), nullable=True),
        sa.Column('file_name', sa.String(length=300), nullable=False),
        sa.Column('mime_type', sa.String(length=120), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('storage_backend', sa.String(length=40), nullable=True),
        sa.Column('storage_ref', sa.String(length=600), nullable=False),
        sa.Column('category', sa.String(length=60), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['health_event_id'], ['health_events.id']),
        sa.ForeignKeyConstraint(['pet_id'], ['dog_profiles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'report_records',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pet_id', sa.UUID(), nullable=False),
        sa.Column('report_type', sa.String(length=80), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('version', sa.Integer(), nullable=True),
        sa.Column('storage_ref', sa.String(length=600), nullable=True),
        sa.Column('source_summary', sa.JSON(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['pet_id'], ['dog_profiles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'share_grants',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pet_id', sa.UUID(), nullable=False),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('recipient_label', sa.String(length=200), nullable=False),
        sa.Column('scope', sa.String(length=40), nullable=True),
        sa.Column('selected_types', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('access_count', sa.Integer(), nullable=True),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.ForeignKeyConstraint(['pet_id'], ['dog_profiles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'reminder_v1',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pet_id', sa.UUID(), nullable=False),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('reminder_type', sa.String(length=60), nullable=False),
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('due_at', sa.DateTime(), nullable=False),
        sa.Column('recurrence', sa.String(length=60), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.ForeignKeyConstraint(['pet_id'], ['dog_profiles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_reminder_v1_due', 'reminder_v1', ['due_at'])
    op.create_table(
        'notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('reminder_id', sa.UUID(), nullable=True),
        sa.Column('recipient_id', sa.UUID(), nullable=False),
        sa.Column('channel', sa.String(length=20), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('attempt', sa.Integer(), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id']),
        sa.ForeignKeyConstraint(['reminder_id'], ['reminder_v1.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'consent_records',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('purpose', sa.String(length=120), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'sync_operations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('client_operation_id', sa.String(length=80), nullable=False),
        sa.Column('entity_type', sa.String(length=60), nullable=False),
        sa.Column('entity_id', sa.String(length=80), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('payload_hash', sa.String(length=64), nullable=True),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'client_operation_id', name='uq_syncop_user_clientop'),
    )
    op.create_table(
        'ai_analysis_records',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pet_id', sa.UUID(), nullable=False),
        sa.Column('health_event_id', sa.UUID(), nullable=True),
        sa.Column('analysis_type', sa.String(length=80), nullable=False),
        sa.Column('input_ref', sa.JSON(), nullable=True),
        sa.Column('output_summary', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('model_id', sa.String(length=120), nullable=True),
        sa.Column('verification_status', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['health_event_id'], ['health_events.id']),
        sa.ForeignKeyConstraint(['pet_id'], ['dog_profiles.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    for t in ['ai_analysis_records', 'sync_operations', 'consent_records', 'notifications',
              'reminder_v1', 'share_grants', 'report_records', 'health_files', 'clinics',
              'veterinarians', 'behavior_entries', 'nutrition_entries', 'activity_records',
              'weight_measurements', 'observations', 'imaging_studies', 'lab_results',
              'procedures', 'allergies', 'medications', 'symptoms', 'health_events']:
        try:
            op.drop_table(t)
        except Exception:
            pass
    for col in ["is_archived", "profile_image_ref", "sex", "date_of_birth", "species"]:
        try:
            op.drop_column("dog_profiles", col)
        except Exception:
            pass
