from .base import engine
from .models import Base
from sqlalchemy import text


def init_tables():
    Base.metadata.create_all(bind=engine)
    
    # List of new columns to ensure exist on scan_summary table
    new_cols = [
        ("ips", "JSONB"),
        ("domain", "VARCHAR"),
        ("mail_security", "JSONB"),
        ("app_security", "JSONB"),
        ("network_security", "JSONB"),
        ("tls_security", "JSONB"),
        ("dns_security", "JSONB")
    ]
    
    with engine.connect() as conn:
        for col_name, col_type in new_cols:
            result = conn.execute(text(
                f"SELECT column_name FROM information_schema.columns "
                f"WHERE table_name='scan_summary' AND column_name='{col_name}'"
            ))
            if not result.fetchone():
                try:
                    conn.execute(text(f"ALTER TABLE scan_summary ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"Added '{col_name}' column to scan_summary table")
                except Exception as e:
                    print(f"Failed to add column {col_name}: {e}")
                    conn.rollback()