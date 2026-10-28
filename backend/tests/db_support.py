"""PostgreSQL tests use a unique disposable schema, never the configured app tables."""
import os
from uuid import uuid4
from sqlalchemy import create_engine, text


def test_engine():
    url = os.getenv('TEST_POSTGRES_URL')
    if not url:
        return create_engine('sqlite://'), lambda: None
    schema = 'bankdesk_test_' + uuid4().hex
    engine = create_engine(url, connect_args={'options': f'-csearch_path={schema}'})
    with engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA {schema}'))
    def cleanup():
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
    return engine, cleanup
