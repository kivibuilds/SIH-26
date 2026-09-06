from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import Screening


router = APIRouter(
    prefix="/api",
    tags=["Screening History"]
)


@router.get("/screenings")
def get_all_screenings(
    db: Session = Depends(get_db)
):
    screenings = (
        db.query(Screening)
        .order_by(Screening.created_at.desc())
        .all()
    )

    return [
        {
            "screening_id": screening.screening_id,
            "document_id": screening.document_id,
            "risk_score": screening.risk_score,
            "risk_level": screening.risk_level,
            "face_match": screening.face_match,
            "tampering_detected": screening.tampering_detected,
            "watchlist_match": screening.watchlist_match,
            "created_at": screening.created_at
        }
        for screening in screenings
    ]