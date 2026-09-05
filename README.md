# VerifyX
### AI-Powered Identity & Document Verification Platform

> **Smart India Hackathon 2026**  
> **PS ID:** 26188-Al-Based Fake Identity & Document Screening System

VerifyX is an intelligent identity and document verification platform designed to detect fraudulent or tampered identity documents and verify the consistency of identity information across multiple sources.

It combines **AI-based document analysis, biometric verification, cross-document validation, risk assessment, and blockchain-backed auditability** into a unified screening workflow.

---

## 🚀 Key Features

- **OCR & Field Extraction** — Extract structured information from identity documents.
- **MRZ Verification** — Detect, parse, and validate Machine Readable Zones in passports.
- **Document Verification** — Supports Passport, Visa, Aadhaar analysis.
- **Tampering Detection** — Detect potential image, text, photo, and metadata anomalies.
- **Cross-Document Verification** — Compare identity information across submitted documents.
- **Face Verification** — Compare the document photograph with the submitted person's face.
- **Risk Assessment** — Combine verification signals into an overall screening result.
- **Blockchain Auditability** — Store verification hashes for tamper-evident records.
- **Explainable Results** — Provide evidence and indicators behind verification outcomes.

---

## 🔄 System Workflow

```text
Document Upload
      ↓
Preprocessing & OCR
      ↓
Document Classification
      ↓
Field / MRZ Validation
      ↓
Tampering Analysis
      ↓
Cross-Document Verification
      ↓
Face Verification
      ↓
Risk Assessment
      ↓
Blockchain Audit Record
      ↓
Final Screening Result
```

---

##  AI & Verification

### Document Analysis

- Image preprocessing
- OCR-based text extraction
- Structured field extraction
- Passport MRZ detection and parsing
- MRZ check-digit validation
- OCR ↔ MRZ consistency checking
- Tampering and manipulation analysis
- Metadata analysis
- Document-specific validation

### Supported Documents

| Document | Analysis |
|---|---|
| Passport | OCR + MRZ + field validation |
| Visa | Text extraction + field validation |
| Aadhaar | Text extraction + field validation |

---

## ⛓️ Blockchain

VerifyX uses blockchain to provide a tamper-evident record of verification results.

```text
Verification Result
        ↓
Generate Hash
        ↓
Store Hash on Blockchain
        ↓
Future Verification
        ↓
Recalculate & Compare
        ↓
Integrity Status
```

Local blockchain development uses **Hardhat**.

---

## 🛠️ Technology Stack

- **Frontend:** React, Vite, JavaScript
- **Backend:** Python, FastAPI
- **AI/Computer Vision:** Python, PaddleOCR, OpenCV, NumPy, Pillow
- **Face Verification:** Face embeddings and similarity matching
- **Blockchain:** Solidity, Hardhat, Web3
- **Database:** SQL

---

## 📊 Verification Output

VerifyX produces structured evidence for the verification pipeline:

```json
{
  "ocr": {},
  "mrz": {},
  "consistency": {},
  "tampering": {},
  "metadata": {}
}
```

The final screening decision combines AI evidence with biometric and cross-document verification results.

---

## 🎯 Objective

To provide a **reliable, explainable, and scalable identity verification system** capable of detecting document manipulation, validating identity information, comparing multiple documents, and maintaining tamper-evident verification records.

---

## 👥 Team

Developed by the **VerifyX Team** for Smart India Hackathon 2026.

---

### VerifyX

**Verify Identity. Detect Fraud. Build Trust.**
