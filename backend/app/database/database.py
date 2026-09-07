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
        "document_hash": "ALTER TABLE verification_records ADD COLUMN document_hash VARCHAR",
        "blockchain_verify_tx": "ALTER TABLE verification_records ADD COLUMN blockchain_verify_tx VARCHAR",
        "blockchain_revoke_tx": "ALTER TABLE verification_records ADD COLUMN blockchain_revoke_tx VARCHAR",
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