from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
import hashlib

from app.database.database import get_db
from app.database.models import (
    Document,
    Screening,
    AuditLog,
)


router = APIRouter(
    prefix="/api/audit",
    tags=["Audit"]
)


# =========================================================
# 1. CREATE AUDIT RECORD
# =========================================================

@router.post("/{screening_id}")
def create_audit_record(
    screening_id: str,
    db: Session = Depends(get_db)
):
    # Find screening
    screening = (
        db.query(Screening)
        .filter(Screening.screening_id == screening_id)
        .first()
    )

    if not screening:
        raise HTTPException(
            status_code=404,
            detail="Screening not found"
        )

    # Find document
    document = (
        db.query(Document)
        .filter(Document.document_id == screening.document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    # Check whether file exists
    file_path = Path(str(document.file_path))

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Uploaded document file not found"
        )

    # -----------------------------------------------------
    # Generate SHA-256 document hash
    # -----------------------------------------------------

    sha256 = hashlib.sha256()

    with file_path.open("rb") as file:
        while chunk := file.read(8192):
            sha256.update(chunk)

    document_hash = sha256.hexdigest()

    # -----------------------------------------------------
    # Create audit record
    # -----------------------------------------------------

    audit = AuditLog(
        screening_id=screening.screening_id,
        document_hash=document_hash,
        blockchain_tx=None
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)

    return {
        "audit_id": audit.id,
        "screening_id": audit.screening_id,
        "document_hash": audit.document_hash,
        "blockchain_tx": audit.blockchain_tx,
        "status": "AUDIT_RECORDED",
        "timestamp": audit.timestamp
    }


# =========================================================
# 2. GET AUDIT RECORD
# =========================================================

@router.get("/{screening_id}")
def get_audit_record(
    screening_id: str,
    db: Session = Depends(get_db)
):
    audit = (
        db.query(AuditLog)
        .filter(AuditLog.screening_id == screening_id)
        .order_by(AuditLog.timestamp.desc())
        .first()
    )

    if not audit:
        raise HTTPException(
            status_code=404,
            detail="Audit record not found"
        )

    return {
        "audit_id": audit.id,
        "screening_id": audit.screening_id,
        "document_hash": audit.document_hash,
        "blockchain_tx": audit.blockchain_tx,
        "timestamp": audit.timestamp
    }