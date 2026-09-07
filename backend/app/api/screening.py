import uuid
import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import (
    Document,
    ExtractedData,
    Screening,
    AuditEvent,
    VerificationRecord,
)
from app.blockchain.blockchain_service import record_document
from app.services.screening_service import generate_screening_result


router = APIRouter(
    prefix="/api/screening",
    tags=["Screening"]
)


def _record_payload(screening_id, document, result):
    return {
        "screening_id": screening_id,
        "document": {
            "document_id": document.document_id,
            "filename": document.filename,
            "type": document.document_type,
        },
        **result,
    }


def _record_hash(payload):
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _file_hash(file_path):
    digest = hashlib.sha256()
    with open(file_path, "rb") as file:
        while chunk := file.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def _blockchain_response(record):
    return {
        "recorded": record.blockchain_status == "RECORDED",
        "status": record.blockchain_status,
        "hash": record.document_hash,
        "document_hash": record.document_hash,
        "result_hash": record.record_hash,
        "transaction_hash": record.blockchain_tx,
        "block_number": record.block_number,
    }


def _response(screening, document, payload, record):
    return {
        "screening_id": screening.screening_id,
        "document": {
            "document_id": document.document_id,
            "filename": document.filename,
            "type": document.document_type,
            "status": "ANALYZED",
        },
        **{key: value for key, value in payload.items() if key not in {"screening_id", "document"}},
        "blockchain": _blockchain_response(record),
        "created_at": screening.created_at,
    }


# =========================================================
# 1. ANALYZE DOCUMENT
# =========================================================

@router.post("/analyze/{document_id}")
def analyze_document(
    document_id: str,
    db: Session = Depends(get_db)
):
    # Find uploaded document
    document = (
        db.query(Document)
        .filter(Document.document_id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    # Generate screening ID
    screening_id = f"SCR-{uuid.uuid4().hex[:8].upper()}"

    # -----------------------------------------------------
    # Get screening result from service
    # -----------------------------------------------------

    result = generate_screening_result(document.file_path, document.document_type)

    # -----------------------------------------------------
    # Store extracted data
    # -----------------------------------------------------

    extracted_data = result.get("extracted_data") or {}
    name_value = (
        extracted_data.get("full_name")
        or extracted_data.get("name")
        or " ".join(
            filter(
                None,
                [
                    extracted_data.get("given_names"),
                    extracted_data.get("surname"),
                ],
            )
        )
        or None
    )

    extracted = ExtractedData(
        document_id=document.document_id,
        name=name_value,
        passport_number=extracted_data.get("passport_number"),
        nationality=extracted_data.get("nationality"),
        date_of_birth=extracted_data.get("date_of_birth"),
        gender=extracted_data.get("gender"),
        issue_date=extracted_data.get("issue_date"),
        expiry_date=extracted_data.get("expiry_date"),
        visa_number=extracted_data.get("visa_number"),
        visa_type=extracted_data.get("visa_type"),
        stay_duration=extracted_data.get("stay_duration"),
    )

    db.add(extracted)

    # -----------------------------------------------------
    # Store screening result
    # -----------------------------------------------------

    risk = result["risk"]
    face = result["face_verification"]
    tampering = result["tampering_analysis"]
    watchlist = result["watchlist"]

    screening = Screening(
        screening_id=screening_id,
        document_id=document.document_id,
        risk_score=risk["score"],
        risk_level=risk["level"],
        face_match=face["match"],
        tampering_detected=tampering["detected"],
        watchlist_match=watchlist["match"],
    )

    db.add(screening)

    payload = _record_payload(screening_id, document, result)
    document_hash = _file_hash(document.file_path)
    result_hash = _record_hash(payload)
    verification = VerificationRecord(
        screening_id=screening_id,
        result_payload=json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str),
        document_hash=document_hash,
        record_hash=result_hash,
        blockchain_status="PENDING",
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)

    try:
        blockchain = record_document(document_hash, screening_id)
        verification.blockchain_status = "RECORDED" if blockchain["status"] == 1 else "FAILED"
        verification.blockchain_tx = blockchain["transaction_hash"]
        verification.block_number = blockchain["block_number"]
    except Exception:
        verification.blockchain_status = "PENDING"
    db.commit()
    db.refresh(verification)

    db.add(AuditEvent(
        screening_id=screening_id,
        event_type="DOCUMENT_REGISTERED",
        status=verification.blockchain_status,
        transaction_hash=verification.blockchain_tx,
        details="Document hash registered during screening.",
    ))
    db.commit()

    return _response(screening, document, payload, verification)


# =========================================================
# 2. GET SINGLE SCREENING
# =========================================================

@router.get("/{screening_id}")
def get_screening(
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

    # Find extracted data
    extracted = (
        db.query(ExtractedData)
        .filter(
            ExtractedData.document_id == screening.document_id
        )
        .first()
    )

    # Find document
    document = (
        db.query(Document)
        .filter(
            Document.document_id == screening.document_id
        )
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    verification = (
        db.query(VerificationRecord)
        .filter(VerificationRecord.screening_id == screening_id)
        .first()
    )
    if not verification:
        raise HTTPException(status_code=404, detail="Verification record not found")

    payload = json.loads(verification.result_payload)
    return _response(screening, document, payload, verification)


