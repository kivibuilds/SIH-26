from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pathlib import Path
import hashlib
from typing import cast

from app.database.database import get_db
from app.database.models import Document, Screening, AuditLog, AuditEvent, VerificationRecord
from app.blockchain.blockchain_service import (
    blockchain_status,
    get_document,
    revoke_document,
    verify_document,
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


@router.get("/{screening_id}/verify")
def verify_record_integrity(
    screening_id: str,
    db: Session = Depends(get_db)
):
    record = (
        db.query(VerificationRecord)
        .filter(VerificationRecord.screening_id == screening_id)
        .first()
    )

    if not record:
        raise HTTPException(status_code=404, detail="Verification record not found")

    recalculated_hash = hashlib.sha256(
        record.result_payload.encode("utf-8")
    ).hexdigest()
    local_match = recalculated_hash == record.record_hash
    chain_record = None
    blockchain_match = None
    is_recorded = cast(str, record.blockchain_status) == "RECORDED"

    try:
        if is_recorded and bool(blockchain_status()["connected"]):
            chain_record = get_document(screening_id)
            blockchain_match = chain_record["document_hash"] == record.document_hash
    except Exception:
        blockchain_match = False

    return {
        "screening_id": screening_id,
        "integrity_valid": local_match and (blockchain_match is not False),
        "local_hash": record.record_hash,
        "recalculated_hash": recalculated_hash,
        "document_hash": record.document_hash,
        "blockchain_status": record.blockchain_status,
        "transaction_hash": record.blockchain_tx,
        "block_number": record.block_number,
        "blockchain_match": blockchain_match,
        "blockchain_record": chain_record,
    }


@router.post("/{screening_id}/verify-upload")
def verify_uploaded_document(
    screening_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    record = (
        db.query(VerificationRecord)
        .filter(VerificationRecord.screening_id == screening_id)
        .first()
    )
    if not record:
        return {
            "screening_id": screening_id,
            "status": "NOT_FOUND",
            "verified": False,
        }

    uploaded_hash = hashlib.sha256()
    while chunk := file.file.read(1024 * 1024):
        uploaded_hash.update(chunk)
    uploaded_hash = uploaded_hash.hexdigest()

    chain_hash = None
    verification_transaction = None
    is_recorded = cast(str, record.blockchain_status) == "RECORDED"
    try:
        if is_recorded and bool(blockchain_status()["connected"]):
            chain_hash = get_document(screening_id)["document_hash"]
    except Exception:
        pass

    expected_hash = chain_hash or record.document_hash
    verified = uploaded_hash == expected_hash
    if verified and is_recorded:
        try:
            verification_transaction = verify_document(screening_id, uploaded_hash)
            record.blockchain_verify_tx = verification_transaction["transaction_hash"]
        except Exception:
            verification_transaction = None

    db.add(AuditEvent(
        screening_id=screening_id,
        event_type="DOCUMENT_VERIFIED" if verified else "DOCUMENT_TAMPERED",
        status="VERIFIED" if verified else "TAMPERED",
        transaction_hash=(
            verification_transaction["transaction_hash"]
            if verification_transaction is not None
            else None
        ),
        details="Re-uploaded document hash comparison.",
    ))
    db.commit()
    return {
        "screening_id": screening_id,
        "status": "VERIFIED" if verified else "TAMPERED",
        "verified": verified,
        "uploaded_hash": uploaded_hash,
        "expected_hash": expected_hash,
        "blockchain_match": chain_hash is None or uploaded_hash == chain_hash,
        "blockchain_status": record.blockchain_status,
        "transaction_hash": record.blockchain_tx,
        "verification_transaction_hash": record.blockchain_verify_tx,
    }


@router.post("/{screening_id}/revoke")
def revoke_record(
    screening_id: str,
    db: Session = Depends(get_db),
):
    record = (
        db.query(VerificationRecord)
        .filter(VerificationRecord.screening_id == screening_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Verification record not found")

    transaction = revoke_document(screening_id)
    setattr(record, "blockchain_status", "REVOKED")
    setattr(record, "blockchain_revoke_tx", transaction["transaction_hash"])
    db.add(AuditEvent(
        screening_id=screening_id,
        event_type="DOCUMENT_REVOKED",
        status="REVOKED",
        transaction_hash=transaction["transaction_hash"],
        details="Verification record revoked by authorized blockchain account.",
    ))
    db.commit()
    return {
        "screening_id": screening_id,
        "status": "REVOKED",
        "transaction_hash": transaction["transaction_hash"],
        "block_number": transaction["block_number"],
    }


@router.get("/{screening_id}/events")
def get_audit_events(
    screening_id: str,
    db: Session = Depends(get_db),
):
    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.screening_id == screening_id)
        .order_by(AuditEvent.timestamp.asc())
        .all()
    )
    return [
        {
            "event_type": event.event_type,
            "status": event.status,
            "transaction_hash": event.transaction_hash,
            "details": event.details,
            "timestamp": event.timestamp,
        }
        for event in events
    ]