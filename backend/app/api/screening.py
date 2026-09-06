from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.database.database import get_db
from app.database.models import (
    Document,
    ExtractedData,
    Screening,
)

from app.services.screening_service import generate_screening_result


router = APIRouter(
    prefix="/api/screening",
    tags=["Screening"]
)


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

    # -----------------------------------------------------
    # Return screening result
    # -----------------------------------------------------

    return {
        "screening_id": screening_id,

        "document": {
            "type": document.document_type,
            "status": "ANALYZED"
        },

        "extracted_data": result["extracted_data"],

        "mrz_verification": result["mrz_verification"],

        "document_validation": result["document_validation"],

        "tampering_analysis": result["tampering_analysis"],

        "face_verification": result["face_verification"],

        "watchlist": result["watchlist"],

        "risk": result["risk"],

        "blockchain": {
            "recorded": False,
            "hash": None
        }
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

    return {
        "screening_id": screening.screening_id,

        "document": {
            "document_id": document.document_id if document else None,
            "type": document.document_type if document else None,
            "filename": document.filename if document else None,
            "status": "ANALYZED"
        },

        "extracted_data": {
            "name": extracted.name if extracted else None,
            "passport_number": (
                extracted.passport_number
                if extracted else None
            ),
            "nationality": (
                extracted.nationality
                if extracted else None
            ),
            "date_of_birth": (
                extracted.date_of_birth
                if extracted else None
            ),
            "gender": (
                extracted.gender
                if extracted else None
            ),
            "expiry_date": (
                extracted.expiry_date
                if extracted else None
            )
        },

        "risk": {
            "score": screening.risk_score,
            "level": screening.risk_level
        },

        "face_verification": {
            "match": screening.face_match
        },

        "tampering_analysis": {
            "detected": screening.tampering_detected
        },

        "watchlist": {
            "match": screening.watchlist_match
        },

        "created_at": screening.created_at
    }


