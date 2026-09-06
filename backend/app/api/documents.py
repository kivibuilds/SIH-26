from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import uuid

from app.database.database import get_db
from app.database.models import Document


router = APIRouter(
    prefix="/api/documents",
    tags=["Documents"]
)


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    db: Session = Depends(get_db)
):
    # Basic file validation
    allowed_types = {
        "image/jpeg",
        "image/png",
        "application/pdf"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use JPG, PNG, or PDF."
        )

    # Generate document ID
    document_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"

    # Get the original filename safely
    original_filename = file.filename or "uploaded_file"

    # Save file
    file_extension = Path(original_filename).suffix.lower()
    saved_filename = f"{document_id}{file_extension}"
    file_path = UPLOAD_DIR / saved_filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Save information in database
    document = Document(
        document_id=document_id,
        document_type=document_type.upper(),
        filename=original_filename,
        file_path=str(file_path),
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return {
        "document_id": document.document_id,
        "document_type": document.document_type,
        "filename": document.filename,
        "status": "UPLOADED"
    }


@router.get("/{document_id}/file")
def get_document_file(
    document_id: str,
    db: Session = Depends(get_db),
):
    document = (
        db.query(Document)
        .filter(Document.document_id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded document file not found")

    return FileResponse(file_path, filename=document.filename)