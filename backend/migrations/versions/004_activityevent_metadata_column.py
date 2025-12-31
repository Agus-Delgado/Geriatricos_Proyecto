"""
004: Alinear columna 'metadata' en activity_events

Revision ID: 004_activityevent_metadata_column
Revises: 014_resident_status_activity
Create Date: 2025-12-31
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_activityevent_metadata_column'
down_revision = '014_resident_status_activity'
branch_labels = None
depends_on = None

def upgrade():
    # Para Postgres: chequear columnas existentes
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [col['name'] for col in insp.get_columns('activity_events')]
    with op.batch_alter_table('activity_events') as batch_op:
        if 'meta' in columns and 'metadata' not in columns:
            batch_op.alter_column('meta', new_column_name='metadata', existing_type=postgresql.JSONB)
        elif 'metadata' not in columns:
            batch_op.add_column(sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

def downgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [col['name'] for col in insp.get_columns('activity_events')]
    with op.batch_alter_table('activity_events') as batch_op:
        if 'metadata' in columns and 'meta' not in columns:
            batch_op.alter_column('metadata', new_column_name='meta', existing_type=postgresql.JSONB)
        elif 'metadata' in columns:
            batch_op.drop_column('metadata')
