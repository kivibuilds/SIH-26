# AI Identity Screening Backend

FastAPI backend for document upload, OCR/MRZ extraction, document parsing, validation, passport/visa stamp screening, tampering analysis, risk scoring, and audit hashing.

## Local setup

Use Python 3.11 or newer. From this directory:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Tesseract OCR must also be installed on the machine. The application checks the default Windows path:

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

## API flow

1. `POST /api/documents/upload` with multipart fields `file` and `document_type`.
2. `POST /api/screening/analyze/{document_id}` with an optional `face_file` multipart field. On a phone, the frontend opens the front-facing camera through the browser capture input.
3. `GET /api/screening/{screening_id}`.
4. `POST /api/audit/{screening_id}` to create a legacy local SHA-256 audit record.
5. `GET /api/audit/{screening_id}/verify` to verify the persisted result hash against SQLite and, when connected, the blockchain.

Supported document types are `PASSPORT`, `VISA`, and `AADHAAR`.

## Passport and visa stamp screening

Passport and visa analysis adds a `stamp_analysis` object to the existing screening response. It uses PIL/NumPy image heuristics to find likely ink-rich connected regions, reuses the existing image metadata inspection, and attempts OCR on each region through the existing Tesseract helper. Results include normalized bounding boxes, OCR uncertainty, image-quality signals, explainable anomaly indicators, and limitations.

Example shape:

```json
{
	"stamp_analysis": {
		"status": "REVIEW_REQUIRED",
		"stamp_regions": [{
			"region_id": "STAMP-01",
			"bounding_box": {"x": 0.12, "y": 0.25, "width": 0.24, "height": 0.18},
			"detection_method": "chromatic_or_dark_ink_contour",
			"detection_confidence": 0.78,
			"confidence_meaning": "Support from color/shape/spatial heuristics, not forgery probability."
		}],
		"ocr_findings": [],
		"anomalies": [],
		"image_quality": {},
		"indicators": [],
		"limitations": []
	}
}
```

`REVIEW_REQUIRED` means that a visual signal was found, not that a stamp is forged. `NOT_DETECTED` and `INSUFFICIENT_EVIDENCE` are used when no reliable region is found or image quality is inadequate. Missing EXIF data is not treated as suspicious, and no passport/visa country format is hardcoded. The analysis is best-effort for uploaded images; unreadable OCR, scans, compression, rotation, and lighting can reduce reliability.

OCR reporting separates `tokens_detected`/`tokens_requiring_review` from `structured_fields_detected`/`structured_fields_requiring_review`. A high token count is not a high field count. Passport MRZ reporting uses `VALID`, `INVALID`, `NOT_FOUND`, or `UNREADABLE`; a missing or unreadable MRZ is never displayed as valid or assigned a format by default.

## Demo scope

Watchlist matching is a placeholder. Face capture is supported, but biometric matching requires the optional `face_recognition` package; without it, the screening result explicitly reports `NOT_PERFORMED`. Screening automatically persists the complete result, generates a canonical SHA-256 hash, and records it on the configured blockchain. If the blockchain is unavailable, the result remains queryable with `blockchain.status=PENDING` and can be retried by an operational workflow.

Never commit `.env`, private keys, virtual environments, uploaded documents, databases, OCR model files, or generated caches.
