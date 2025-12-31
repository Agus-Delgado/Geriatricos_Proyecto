"""
004: Alinear columna 'metadata' en activity_events
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # Si existe columna 'meta', renombrar a 'metadata'
    with op.batch_alter_table('activity_events') as batch_op:
        columns = [col['name'] for col in op.get_bind().execute("PRAGMA table_info(activity_events)")]
        if 'meta' in columns:
            batch_op.alter_column('meta', new_column_name='metadata', existing_type=postgresql.JSONB)
        # Si no existe 'metadata', agregarla
        if 'metadata' not in columns:
            batch_op.add_column(sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

def downgrade():
    with op.batch_alter_table('activity_events') as batch_op:
        columns = [col['name'] for col in op.get_bind().execute("PRAGMA table_info(activity_events)")]
        if 'metadata' in columns:
            batch_op.drop_column('metadata')
