# AI Identity Screening Backend

FastAPI backend for document upload, OCR/MRZ extraction, document parsing, validation, tampering analysis, risk scoring, and audit hashing.

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
2. `POST /api/screening/analyze/{document_id}`.
3. `GET /api/screening/{screening_id}`.
4. `POST /api/audit/{screening_id}` to create a legacy local SHA-256 audit record.
5. `GET /api/audit/{screening_id}/verify` to verify the persisted result hash against SQLite and, when connected, the blockchain.

Supported document types are `PASSPORT`, `VISA`, and `AADHAAR`.

## Demo scope

Face verification and watchlist matching are placeholders. Screening automatically persists the complete result, generates a canonical SHA-256 hash, and records it on the configured blockchain. If the blockchain is unavailable, the result remains queryable with `blockchain.status=PENDING` and can be retried by an operational workflow.

Never commit `.env`, private keys, virtual environments, uploaded documents, databases, OCR model files, or generated caches.
