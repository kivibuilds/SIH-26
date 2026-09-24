from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
import hashlib
import json
import uuid

from app.database.database import get_db
from app.database.models import (
    Document,
    ExtractedData,
    Screening,
    AuditEvent,
    VerificationRecord,
)

from app.services.screening_service import generate_screening_result
from app.blockchain.blockchain_service import record_document


router = APIRouter(
    prefix="/api/screening",
    tags=["Screening"]
)


def _file_hash(file_path):
    digest = hashlib.sha256()
    with Path(file_path).open("rb") as file:
        while chunk := file.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def _record_hash(payload):
    canonical = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _apply_blockchain_result(record, transaction):
    if transaction.get("status") != 1:
        record.blockchain_status = "FAILED"
        record.blockchain_error = "Blockchain transaction receipt reported failure."
        return
    record.blockchain_status = "CONFIRMED"
    record.blockchain_error = None
    record.blockchain_tx = transaction["transaction_hash"]
    record.block_number = transaction["block_number"]


def _document_identity(document_type, extracted_data):
    extracted_data = extracted_data or {}
    for key in ("passport_number", "visa_number", "aadhaar_number", "document_number"):
        value = extracted_data.get(key)
        if value:
            return document_type, key, str(value).strip().upper()
    return None


def _find_prior_record(db, document_type, extracted_data, document_hash=None):
    if document_hash:
        exact_match = (
            db.query(VerificationRecord)
            .filter(
                VerificationRecord.document_hash == document_hash,
                VerificationRecord.blockchain_status.in_(("CONFIRMED", "REUSED")),
            )
            .order_by(VerificationRecord.created_at.desc())
            .first()
        )
        if exact_match:
            return exact_match
    identity = _document_identity(document_type, extracted_data)
    if not identity:
        return None
    records = (
        db.query(VerificationRecord)
        .filter(
            VerificationRecord.document_type == document_type,
            VerificationRecord.blockchain_status.in_(("CONFIRMED", "REUSED")),
        )
        .order_by(VerificationRecord.created_at.desc())
        .all()
    )
    for record in records:
        try:
            payload = json.loads(record.result_payload)
        except (TypeError, json.JSONDecodeError):
            continue
        if _document_identity(document_type, payload.get("extracted_data")) == identity:
            return record
    return None


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

    # Save to database
    db.commit()

    # Persist a tamper-evident result and register the uploaded file hash.
    # Blockchain outages leave the record pending so the audit retry endpoint
    # can complete registration later without losing the local evidence.
    document_hash = _file_hash(document.file_path)
    prior_record = _find_prior_record(db, document.document_type, extracted_data, document_hash)
    same_content = prior_record is not None and prior_record.document_hash == document_hash
    changed_content = prior_record is not None and prior_record.document_hash != document_hash
    integrity = {
        "status": "UNCHANGED" if same_content else "MISMATCH" if changed_content else "NEW",
        "same_document": prior_record is not None,
        "hash_changed": changed_content,
        "uploaded_hash": document_hash,
        "registered_hash": prior_record.document_hash if prior_record else document_hash,
        "reference_screening_id": prior_record.screening_id if prior_record else None,
        "change_reasons": [],
    }
    if changed_content:
        tamper_details = tampering.get("details", {})
        metadata = tamper_details.get("metadata", {})
        prior_screening = (
            db.query(Screening)
            .filter(Screening.screening_id == prior_record.screening_id)
            .first()
        )
        prior_document = (
            db.query(Document)
            .filter(Document.document_id == prior_screening.document_id)
            .first()
            if prior_screening
            else None
        )
        if prior_document and Path(prior_document.file_path).exists():
            from app.services.tampering_service import compare_document_files
            pixel_comparison = compare_document_files(prior_document.file_path, document.file_path)
            integrity["pixel_comparison"] = pixel_comparison
            if pixel_comparison.get("comparison") == "PIXELS_CHANGED":
                integrity["change_reasons"].append(
                    "Pixel changes detected: "
                    f"{pixel_comparison['changed_pixels']} pixels "
                    f"({pixel_comparison['changed_pixel_percentage']}%) changed "
                    f"inside region {pixel_comparison['changed_region']}."
                )
            elif pixel_comparison.get("comparison") == "DIMENSIONS_CHANGED":
                integrity["change_reasons"].append("Image dimensions changed.")
        if tampering.get("detected"):
            integrity["change_reasons"].extend(tampering.get("indicators", []))
        if metadata.get("editing_software_detected"):
            integrity["change_reasons"].append("Editing software metadata changed or was added.")
        if not integrity["change_reasons"]:
            integrity["change_reasons"].append(
                "The file bytes changed, but the forensic analyzer could not localize the change."
            )
        result["risk"]["reasons"].append(
            "Document hash mismatch: the same document identity was uploaded with different file bytes."
        )
        result["risk"]["score"] = max(result["risk"]["score"], 90)
        result["risk"]["level"] = "HIGH"
    result["document_integrity"] = integrity
    result_payload = json.dumps(result, sort_keys=True, default=str)

    verification_record = VerificationRecord(
        screening_id=screening_id,
        document_type=document.document_type,
        result_payload=result_payload,
        document_hash=document_hash,
        record_hash=_record_hash(result),
        risk_score=risk["score"],
        risk_level=risk["level"],
        mrz_status=result["mrz_verification"].get("status"),
        tampering_detected=tampering.get("detected"),
        tampering_confidence=tampering.get("confidence"),
        blockchain_status="MISMATCH" if changed_content else "PENDING",
    )

    if same_content:
        verification_record.blockchain_status = "REUSED"
        verification_record.blockchain_tx = prior_record.blockchain_tx
        verification_record.block_number = prior_record.block_number
        verification_record.blockchain_error = (
            f"Exact file hash already registered by screening {prior_record.screening_id}."
        )
    elif not changed_content:
        try:
            _apply_blockchain_result(verification_record, record_document(document_hash, screening_id))
        except Exception as error:
            verification_record.blockchain_error = str(error)[:1000]

    db.add(verification_record)
    db.add(AuditEvent(
        screening_id=screening_id,
        event_type="DOCUMENT_REGISTERED",
        status=verification_record.blockchain_status,
        transaction_hash=verification_record.blockchain_tx,
        details=(
            "Document hash mismatch against the prior screening. "
            + " ".join(integrity["change_reasons"])
            if changed_content
            else verification_record.blockchain_error or "Document hash registered on blockchain."
        ),
    ))
    db.commit()

    # -----------------------------------------------------
    # Return screening result
    # -----------------------------------------------------

    return {
        "screening_id": screening_id,

        "document": {
            "document_id": document.document_id,
            "filename": document.filename,
            "type": document.document_type,
            "status": "ANALYZED"
        },

        "extracted_data": result["extracted_data"],

        "ocr_analysis": result["ocr_analysis"],

        "mrz_verification": result["mrz_verification"],

        "document_validation": result["document_validation"],

        "tampering_analysis": result["tampering_analysis"],

        "stamp_analysis": result["stamp_analysis"],

        "face_verification": result["face_verification"],

        "watchlist": result["watchlist"],

        "risk": result["risk"],

        "blockchain": {
            "recorded": verification_record.blockchain_status in ("CONFIRMED", "REUSED"),
            "status": verification_record.blockchain_status,
            "hash": document_hash,
            "transaction_hash": verification_record.blockchain_tx,
            "block_number": verification_record.block_number,
            "error": verification_record.blockchain_error,
        },
        "document_integrity": integrity,
    }


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

    verification_record = (
        db.query(VerificationRecord)
        .filter(VerificationRecord.screening_id == screening.screening_id)
        .first()
    )

    result = generate_screening_result(document.file_path, document.document_type)
    screening.risk_score = result["risk"]["score"]
    screening.risk_level = result["risk"]["level"]
    screening.face_match = result["face_verification"]["match"]
    screening.tampering_detected = result["tampering_analysis"]["detected"]
    screening.watchlist_match = result["watchlist"]["match"]
    db.commit()

    return {
        "screening_id": screening.screening_id,

        "document": {
            "document_id": document.document_id if document else None,
            "type": document.document_type if document else None,
            "filename": document.filename if document else None,
            "status": "ANALYZED"
        },

        "extracted_data": result["extracted_data"],
        "ocr_analysis": result["ocr_analysis"],
        "mrz_verification": result["mrz_verification"],
        "document_validation": result["document_validation"],
        "tampering_analysis": result["tampering_analysis"],
        "stamp_analysis": result["stamp_analysis"],
        "face_verification": result["face_verification"],
        "watchlist": result["watchlist"],
        "document_integrity": (
            json.loads(verification_record.result_payload).get("document_integrity", {})
            if verification_record
            else {}
        ),
        "risk": result["risk"],
        "blockchain": {
            "recorded": bool(verification_record and verification_record.blockchain_status in ("CONFIRMED", "REUSED")),
            "status": verification_record.blockchain_status if verification_record else "PENDING",
            "hash": verification_record.document_hash if verification_record else None,
            "transaction_hash": verification_record.blockchain_tx if verification_record else None,
            "block_number": verification_record.block_number if verification_record else None,
            "error": verification_record.blockchain_error if verification_record else "Verification record not created.",
        },
        "created_at": screening.created_at
    }


