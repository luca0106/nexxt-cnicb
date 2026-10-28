"""Ordered, additive migrations; safe for existing SQLite and PostgreSQL data."""
from datetime import datetime, timezone
from sqlalchemy import inspect, text


def migrate(connection):
    connection.execute(text('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at VARCHAR(40) NOT NULL)'))
    applied = set(connection.execute(text('SELECT version FROM schema_migrations')).scalars())
    for version, operation in [(1, rename_national_id), (2, financial_metadata), (3, client_case_details)]:
        if version not in applied:
            operation(connection)
            connection.execute(text('INSERT INTO schema_migrations (version, applied_at) VALUES (:version, :at)'),
                               {'version': version, 'at': datetime.now(timezone.utc).isoformat()})


def rename_national_id(connection):
    inspector = inspect(connection)
    if inspector.has_table('clients'):
        columns = {item['name'] for item in inspector.get_columns('clients')}
        if 'cnp' in columns and 'national_id' not in columns:
            connection.execute(text('ALTER TABLE clients RENAME COLUMN cnp TO national_id'))


def financial_metadata(connection):
    inspector = inspect(connection)
    if not inspector.has_table('financial_profiles'):
        return
    columns = {item['name'] for item in inspector.get_columns('financial_profiles')}
    for name, definition in [('source_kind', "VARCHAR(20) NOT NULL DEFAULT 'unknown'"),
                             ('version', 'INTEGER NOT NULL DEFAULT 1')]:
        if name not in columns:
            connection.execute(text(f'ALTER TABLE financial_profiles ADD COLUMN {name} {definition}'))
    connection.execute(text("UPDATE financial_profiles SET source_kind = 'synthetic' WHERE is_demo = TRUE"))


# Fields added by the client/case detail expansion. Leave old values unknown;
# ORM defaults apply only to newly created records, not historical customers.
DETAIL_COLUMNS = {
    'clients': {
        'id_card_issuer': 'VARCHAR(100)', 'birth_date': 'VARCHAR(30)',
        'marital_status': 'VARCHAR(50)', 'dependents_count': 'INTEGER',
        'housing_status': 'VARCHAR(50)', 'employer_cui': 'VARCHAR(50)',
        'employment_contract_type': 'VARCHAR(100)', 'seniority_current_employer': 'VARCHAR(50)',
        'seniority_total': 'VARCHAR(50)', 'fico_score': 'INTEGER',
        'credit_bureau_status': 'VARCHAR(100)', 'credit_bureau_active_loans': 'INTEGER',
        'pep_status': 'VARCHAR(50)', 'aml_status': 'VARCHAR(100)',
        'anaf_consent': 'BOOLEAN', 'anaf_income': 'FLOAT',
    },
    'cases': {
        'branch': 'VARCHAR(100)', 'channel': 'VARCHAR(100)', 'interest_type': 'VARCHAR(50)',
        'dae_percent': 'FLOAT', 'monthly_installment': 'FLOAT', 'dti_percent': 'FLOAT',
    },
}


def client_case_details(connection):
    inspector = inspect(connection)
    for table, additions in DETAIL_COLUMNS.items():
        if not inspector.has_table(table):
            continue
        columns = {item['name'] for item in inspector.get_columns(table)}
        for name, definition in additions.items():
            if name not in columns:
                connection.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {definition}'))
