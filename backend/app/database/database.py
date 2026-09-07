from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./screening.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def initialize_database():
    """Create tables and apply the small SQLite migrations used by this prototype."""
    Base.metadata.create_all(bind=engine)
    columns = {column["name"] for column in inspect(engine).get_columns("verification_records")}
    migrations = {
        "document_type": "ALTER TABLE verification_records ADD COLUMN document_type VARCHAR",
        "document_hash": "ALTER TABLE verification_records ADD COLUMN document_hash VARCHAR",
        "blockchain_error": "ALTER TABLE verification_records ADD COLUMN blockchain_error TEXT",
        "risk_score": "ALTER TABLE verification_records ADD COLUMN risk_score FLOAT",
        "risk_level": "ALTER TABLE verification_records ADD COLUMN risk_level VARCHAR",
        "mrz_status": "ALTER TABLE verification_records ADD COLUMN mrz_status VARCHAR",
        "tampering_detected": "ALTER TABLE verification_records ADD COLUMN tampering_detected BOOLEAN",
        "tampering_confidence": "ALTER TABLE verification_records ADD COLUMN tampering_confidence FLOAT",
        "blockchain_verify_tx": "ALTER TABLE verification_records ADD COLUMN blockchain_verify_tx VARCHAR",
        "blockchain_revoke_tx": "ALTER TABLE verification_records ADD COLUMN blockchain_revoke_tx VARCHAR",
        "updated_at": "ALTER TABLE verification_records ADD COLUMN updated_at DATETIME",
    }
    with engine.begin() as connection:
        for column, statement in migrations.items():
            if column not in columns:
                connection.execute(
                    text(statement)
                )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()