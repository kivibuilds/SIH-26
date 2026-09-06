from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text
from datetime import datetime

from .database import Base


# -----------------------------------
# DOCUMENT
# -----------------------------------

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String, unique=True, index=True, nullable=False)
    document_type = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)


# -----------------------------------
# EXTRACTED DATA
# -----------------------------------

class ExtractedData(Base):
    __tablename__ = "extracted_data"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String, nullable=False, index=True)

    name = Column(String)
    passport_number = Column(String)
    nationality = Column(String)
    date_of_birth = Column(String)
    gender = Column(String)
    issue_date = Column(String)
    expiry_date = Column(String)

    visa_number = Column(String)
    visa_type = Column(String)
    stay_duration = Column(String)


# -----------------------------------
# SCREENING
# -----------------------------------

class Screening(Base):
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(String, unique=True, index=True, nullable=False)
    document_id = Column(String, nullable=False, index=True)

    risk_score = Column(Float)
    risk_level = Column(String)

    face_match = Column(Boolean)
    tampering_detected = Column(Boolean)
    watchlist_match = Column(Boolean)

    created_at = Column(DateTime, default=datetime.utcnow)


# -----------------------------------
# AUDIT LOG
# -----------------------------------

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(String, nullable=False, index=True)

    document_hash = Column(String)
    blockchain_tx = Column(String)

    timestamp = Column(DateTime, default=datetime.utcnow)