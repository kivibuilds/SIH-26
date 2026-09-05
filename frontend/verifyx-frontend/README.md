# VerifyX

> **AI-Assisted Identity & Document Screening System**
>
> *Hackathon prototype • Synthetic data only • Not an operational government system*

---

## 1. Overview

**VerifyX** is a prototype identity and document screening console designed for officers. It provides an end-to-end simulated screening workflow covering document ingestion, multi-stage automated verification pipeline, risk scoring, forensic error-level analysis (ELA), biometric matching, and audit logging.

---

## 2. Key Features

- **Officer Authentication Console:** Mock session-based login with synthetic credentials (`OFF-1042` / `verifyx`).
- **Operational Dashboard:** Real-time screening KPIs, throughput telemetry, and active inspection queue.
- **Document Ingestion:** Drag-and-drop file upload (JPG, PNG, PDF) with client-side preview, validation, and synthetic prototype presets.
- **8-Stage Screening Pipeline:** Real-time modular execution:
  1. Document Received
  2. Image Preprocessing
  3. OCR Extraction
  4. MRZ Verification
  5. Document Validation
  6. Tampering Analysis
  7. Face Verification
  8. Risk Assessment
- **Consolidated Risk Assessment:** Multi-tier risk gauge (Clear / Needs Review / High Risk) with recommended officer actions.
- **Detailed Forensic Analysis:**
  - Extracted field schema with source tagging (MRZ, VIZ, CHIP) and confidence scoring
  - ICAO Doc 9303 MRZ checksum validation
  - Forensic text manipulation & photo substitution indicators
  - Biometric face similarity vector comparison
  - Simulated alert watchlist query
  - Cryptographic audit receipt
- **Screening History Ledger:** Searchable and filterable archive with status and document type filters.
- **Operational Analytics:** Restrained Recharts telemetry visualizing volume trends, posture ratios, and top anomaly categories.

---

## 3. Technology Stack

- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS (Dark Operations Console theme)
- **Routing:** React Router v7
- **Charts:** Recharts
- **Icons:** Lucide React
- **HTTP Client:** Axios (with mock layer toggle `VITE_USE_MOCK=true`)

---

## 4. Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm

### Installation

```bash
# Install dependencies
npm install
```

### Development Server

```bash
# Start Vite development server
npm run dev
```

### Production Build

```bash
# Compile optimized production bundle
npm run build

# Preview production build
npm run preview
```

---

## 5. Synthetic Demo Test Cases

| Case ID | Document | Subject | Risk Score | Posture | Key Characteristics |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VX-1043** | Passport | Alex Rivera | **12 / 100** | `CLEAR` | Valid ICAO checksums, 99.2% OCR confidence, 96.4% biometric match. |
| **VX-1042** | Visa | Jordan Blake | **47 / 100** | `NEEDS REVIEW` | MRZ date format variance from visual zone, minor typography anomaly. |
| **VX-1041** | Passport | Morgan Lee | **87 / 100** | `HIGH RISK` | Critical DOB mismatch, MRZ check digit failure, text manipulation detected, face mismatch. |

---

## 6. Architecture & Data Contracts

All API interactions route through `src/services/api.js`. When `VITE_USE_MOCK=true` (default), requests are resolved by `src/services/mock/handlers.js` with simulated network latency. When transitioning to a production backend, set `VITE_USE_MOCK=false` and provide `VITE_API_BASE_URL`.
