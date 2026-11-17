"""Create additive Skillengine core workflow tables.

Revision ID: 0001_core_workflows
Revises:
"""
from alembic import op

from app.db import Base
from app import models  # noqa: F401


revision = "0001_core_workflows"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # All core table names use the core_ prefix. create_all only adds missing
    # tables and leaves every pre-existing table and record untouched.
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade():
    # Deliberately non-destructive: assessment and candidate records are user data.
    pass
