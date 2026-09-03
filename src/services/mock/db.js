import { SCREENING_DECISION, SCREENING_STATUS, SEVERITY, FIELD_SOURCES } from '../../constants/screeningStatus'

export const MOCK_OFFICER = {
  id: 'OFF-1042',
  displayName: 'Insp. S. Vance',
  unit: 'Screening Unit 4 (Demo)',
  shift: 'Alpha (06:00 - 18:00)',
  role: 'Screening Officer',
  station: 'Workstation 04',
}

const INITIAL_SCREENINGS = [
  {
    id: 'VX-1043',
    travelerRef: 'TRV-88219',
    travelerName: 'Alex Rivera',
    documentType: 'Passport',
    documentNumber: 'X1234567',
    nationality: 'UTO (Utopia)',
    createdAt: '2026-09-02T01:42:15Z',
    officerId: 'OFF-1042',
    officerName: 'Insp. S. Vance',
    status: SCREENING_STATUS.COMPLETE,
    decision: SCREENING_DECISION.CLEAR,
    overallScore: 12,
    summary: 'No significant anomalies detected. Standard document layout, optical characters, and machine-readable zone verified.',
    recommendedAction: 'Standard clearance. No secondary verification required.',
    checks: {
      docValidation: {
        passed: true,
        status: 'VALID',
        label: 'Document Validated',
        officerNote: 'Format, required fields, and expiration dates are valid.',
      },
      mrzVerification: {
        passed: true,
        status: 'VALID',
        label: 'MRZ Verified',
        officerNote: 'Machine-readable zone checksums match document data.',
      },
      tamperingAnalysis: {
        passed: true,
        status: 'CLEARED',
        label: 'No Significant Tampering Indicator',
        officerNote: 'No signs of font alteration or photo modification detected.',
      },
      faceVerification: {
        passed: true,
        status: 'MATCH',
        label: 'Face Match (96.4% Similarity)',
        officerNote: 'Presented face matches document photo with high confidence.',
      },
      watchlistCheck: {
        passed: true,
        status: 'NO_MATCH',
        label: 'No Watchlist Match (Simulated)',
        officerNote: 'No matches found in simulated alert registry.',
      },
    },
    metrics: {
      ocrConfidence: 99.2,
      mrzChecksumValid: true,
      faceMatchScore: 96.4,
      tamperingScore: 2.1,
      processingDurationSec: 3.2,
    },
    audit: {
      status: 'Recorded',
      txRef: '0x7a91a92bf01e7428c42eb9104fa2',
      timestamp: '02 Sep 2026, 01:42:18 UTC',
      hash: 'sha256:4f8a2b1c90e5436d7a8e2f9104b2a6c8e3d5a1f79b0c2e4d6a8b1c3e5f7a9b0c',
      blockNumber: 4892014,
    },
    extractedFields: [
      { key: 'Document Number', value: 'X1234567', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Full Name', value: 'Alex Rivera', confidence: 0.98, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Date of Birth', value: '1991-08-14', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Nationality', value: 'UTO', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Issue Date', value: '2021-05-10', confidence: 0.97, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Expiry Date', value: '2031-05-09', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Issuing Authority', value: 'UTOPIA DEPT OF STATE', confidence: 0.96, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Gender', value: 'M', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
    ],
    findings: [
      {
        code: 'FND-101',
        severity: SEVERITY.INFO,
        title: 'Standard Features Validated',
        detail: 'Document format, machine-readable lines, and facial similarity match expected baseline values.',
      },
    ],
    ocrAnalysis: {
      confidence: 99.2,
      fieldsDetected: 18,
      fieldsRequiringReview: 0,
      charQualityScore: 98.8,
      engineVersion: 'v4.1-neural-ocr (demo)',
    },
    mrzVerification: {
      format: 'ICAO 9303 Type 3 (2x44)',
      rawLine1: 'P<UTORIVERA<<ALEX<<<<<<<<<<<<<<<<<<<<<<<<<<<',
      rawLine2: 'X1234567<1UTO9108144M3105098<<<<<<<<<<<<<<02',
      checkDigits: 'VALID',
      ocrConsistency: 'VALID',
      compositeCheckDigit: 'VALID',
    },
    documentValidation: {
      requiredFieldsPresent: '100%',
      dateValidity: 'VALID',
      formatConsistency: 'VALID',
      crossFieldConsistency: 'VALID',
      templateMatchScore: '98.5%',
    },
    forensics: {
      tamperingConfidence: 2,
      anomalyConfidence: 1,
      photoAnomaly: 'NONE',
      textManipulation: 'NOT DETECTED',
      metadataAnomaly: 'NONE',
      elaResult: 'NORMAL',
    },
    faceVerification: {
      docPhotoDetected: true,
      presentedFaceDetected: true,
      similarityScore: 96.4,
      threshold: 85.0,
      confidence: 99.1,
      status: 'MATCH',
    },
    watchlist: {
      status: 'CLEAR',
      match: false,
      database: 'Simulated Watchlist (Prototype Index)',
      notes: 'No matches against synthetic alert database.',
    },
  },
  {
    id: 'VX-1042',
    travelerRef: 'TRV-74012',
    travelerName: 'Jordan Blake',
    documentType: 'Visa',
    documentNumber: 'V4892019',
    nationality: 'CAN (Canada)',
    createdAt: '2026-09-02T00:58:30Z',
    officerId: 'OFF-1042',
    officerName: 'Insp. S. Vance',
    status: SCREENING_STATUS.COMPLETE,
    decision: SCREENING_DECISION.REVIEW,
    overallScore: 47,
    summary: 'Document contains field inconsistencies requiring officer review. Expiration date format in the machine-readable zone differs from the visual inspection zone.',
    recommendedAction: 'Review flagged visual inspection zone dates against standard issuing authority template.',
    checks: {
      docValidation: {
        passed: false,
        status: 'NEEDS_REVIEW',
        label: 'Document Validation (Flagged)',
        officerNote: 'Visual zone date format requires officer review.',
      },
      mrzVerification: {
        passed: false,
        status: 'INCONSISTENT',
        label: 'MRZ Inconsistency',
        officerNote: 'Machine-readable zone date does not match the visible date.',
      },
      tamperingAnalysis: {
        passed: true,
        status: 'MINOR_ANOMALY',
        label: 'Possible Document Anomaly',
        officerNote: 'Minor spacing variance detected in visa stamp area.',
      },
      faceVerification: {
        passed: true,
        status: 'MATCH',
        label: 'Face Match (89.1% Similarity)',
        officerNote: 'Presented face matches document photo within acceptable threshold.',
      },
      watchlistCheck: {
        passed: true,
        status: 'NO_MATCH',
        label: 'No Watchlist Match (Simulated)',
        officerNote: 'No matches found in simulated alert registry.',
      },
    },
    metrics: {
      ocrConfidence: 92.4,
      mrzChecksumValid: true,
      faceMatchScore: 89.1,
      tamperingScore: 34.0,
      processingDurationSec: 4.1,
    },
    audit: {
      status: 'Recorded',
      txRef: '0x3c81e90af23d8819b1104e819a',
      timestamp: '02 Sep 2026, 00:58:35 UTC',
      hash: 'sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      blockNumber: 4891980,
    },
    extractedFields: [
      { key: 'Document Number', value: 'V4892019', confidence: 0.96, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Full Name', value: 'Jordan Blake', confidence: 0.94, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Date of Birth', value: '1987-11-23', confidence: 0.98, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Nationality', value: 'CAN', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Issue Date', value: '2024-09-14', confidence: 0.91, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Expiry Date', value: '2027-09-14', confidence: 0.72, source: FIELD_SOURCES.VIZ, status: 'review' },
      { key: 'Visa Class', value: 'B1/B2 TOURIST/BUSINESS', confidence: 0.88, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Entries', value: 'MULTIPLE (M)', confidence: 0.95, source: FIELD_SOURCES.VIZ, status: 'valid' },
    ],
    findings: [
      {
        code: 'FND-402',
        severity: SEVERITY.MEDIUM,
        title: 'MRZ Inconsistency',
        detail: 'Machine-readable zone date does not match the visible document date (Visual: 14/09/2027 vs MRZ: 270914). Check digit is valid but requires manual comparison.',
      },
      {
        code: 'FND-318',
        severity: SEVERITY.MEDIUM,
        title: 'Date Field Requires Review',
        detail: 'Expiry date lettering shows minor spacing irregularity compared to standard template.',
      },
      {
        code: 'FND-109',
        severity: SEVERITY.LOW,
        title: 'Possible Document Anomaly',
        detail: 'Minor typeface variance detected in visa stamp area.',
      },
    ],
    ocrAnalysis: {
      confidence: 92.4,
      fieldsDetected: 14,
      fieldsRequiringReview: 2,
      charQualityScore: 89.6,
      engineVersion: 'v4.1-neural-ocr (demo)',
    },
    mrzVerification: {
      format: 'ICAO 9303 Type 2 (2x36)',
      rawLine1: 'V<CANBLAKE<<JORDAN<<<<<<<<<<<<<<<<<<',
      rawLine2: 'V4892019<7CAN8711234M2709142<<<<<<04',
      checkDigits: 'VALID',
      ocrConsistency: 'MISMATCH',
      compositeCheckDigit: 'VALID',
    },
    documentValidation: {
      requiredFieldsPresent: '100%',
      dateValidity: 'NEEDS_REVIEW',
      formatConsistency: 'VALID',
      crossFieldConsistency: 'DISCREPANCY_DETECTED',
      templateMatchScore: '86.2%',
    },
    forensics: {
      tamperingConfidence: 34,
      anomalyConfidence: 38,
      photoAnomaly: 'NONE',
      textManipulation: 'POSSIBLE_INCONSISTENCY',
      metadataAnomaly: 'SLIGHT_COMPRESSION_NOISE',
      elaResult: 'SUSPICIOUS_SPACING_LOCALIZED',
    },
    faceVerification: {
      docPhotoDetected: true,
      presentedFaceDetected: true,
      similarityScore: 89.1,
      threshold: 85.0,
      confidence: 94.2,
      status: 'MATCH',
    },
    watchlist: {
      status: 'CLEAR',
      match: false,
      database: 'Simulated Watchlist',
      notes: 'No matches against synthetic alert database.',
    },
  },
  {
    id: 'VX-1041',
    travelerRef: 'TRV-99304',
    travelerName: 'Morgan Lee',
    documentType: 'Passport',
    documentNumber: 'P9876543',
    nationality: 'UTO (Utopia)',
    createdAt: '2026-09-01T23:15:00Z',
    officerId: 'OFF-1042',
    officerName: 'Insp. S. Vance',
    status: SCREENING_STATUS.COMPLETE,
    decision: SCREENING_DECISION.HIGH_RISK,
    overallScore: 87,
    summary: 'High risk profile detected. Multiple critical anomalies across MRZ, visual zone, and facial verification.',
    recommendedAction: 'Perform secondary identity verification and manual document inspection.',
    checks: {
      docValidation: {
        passed: false,
        status: 'FAILED',
        label: 'Document Validation (Failed)',
        officerNote: 'Critical date discrepancies across fields.',
      },
      mrzVerification: {
        passed: false,
        status: 'FAILED',
        label: 'MRZ Inconsistency',
        officerNote: 'Check digit calculation failure in machine-readable zone.',
      },
      tamperingAnalysis: {
        passed: false,
        status: 'ANOMALY_DETECTED',
        label: 'Possible Text Manipulation',
        officerNote: 'Tampering confidence: 87% in numeric text.',
      },
      faceVerification: {
        passed: false,
        status: 'MISMATCH',
        label: 'Face Mismatch',
        officerNote: 'Presented face does not match document photo (34.2% similarity).',
      },
      watchlistCheck: {
        passed: true,
        status: 'NO_MATCH',
        label: 'No Watchlist Match (Simulated)',
        officerNote: 'No matches found in simulated alert registry.',
      },
    },
    metrics: {
      ocrConfidence: 74.6,
      mrzChecksumValid: false,
      faceMatchScore: 34.2,
      tamperingScore: 87.0,
      processingDurationSec: 5.6,
    },
    audit: {
      status: 'Recorded',
      txRef: '0x99a4f210d76bc912384a5198e0',
      timestamp: '01 Sep 2026, 23:15:06 UTC',
      hash: 'sha256:9f8e7d6c5b4a3928172635445362718293049586716253443526172839405162',
      blockNumber: 4891822,
    },
    extractedFields: [
      { key: 'Document Number', value: 'P9876543', confidence: 0.88, source: FIELD_SOURCES.VIZ, status: 'review' },
      { key: 'Full Name', value: 'Morgan Lee', confidence: 0.92, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Date of Birth', value: '1985-04-12', confidence: 0.65, source: FIELD_SOURCES.VIZ, status: 'invalid' },
      { key: 'MRZ Date of Birth', value: '1988-04-12', confidence: 0.94, source: FIELD_SOURCES.MRZ, status: 'invalid' },
      { key: 'Nationality', value: 'UTO', confidence: 0.97, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Issue Date', value: '2022-01-15', confidence: 0.82, source: FIELD_SOURCES.VIZ, status: 'review' },
      { key: 'Expiry Date', value: '2032-01-14', confidence: 0.79, source: FIELD_SOURCES.VIZ, status: 'review' },
    ],
    findings: [
      {
        code: 'FND-801',
        severity: SEVERITY.CRITICAL,
        title: 'Date of Birth Mismatch',
        detail: 'Date of birth in visible text (1985-04-12) does not match the machine-readable zone (1988-04-12). Possible printed text alteration.',
      },
      {
        code: 'FND-704',
        severity: SEVERITY.HIGH,
        title: 'MRZ Inconsistency',
        detail: 'Machine-readable zone check digit mismatch. Calculated check digit (7) does not match recorded byte (3).',
      },
      {
        code: 'FND-622',
        severity: SEVERITY.HIGH,
        title: 'Possible Text Manipulation',
        detail: 'Tampering confidence: 87%. Possible text manipulation detected in numeric font alignment and background pattern.',
      },
      {
        code: 'FND-905',
        severity: SEVERITY.CRITICAL,
        title: 'Face Mismatch',
        detail: 'Face verification mismatch. Presented face similarity score of 34.2% is well below the 85.0% threshold.',
      },
    ],
    ocrAnalysis: {
      confidence: 74.6,
      fieldsDetected: 15,
      fieldsRequiringReview: 5,
      charQualityScore: 71.3,
      engineVersion: 'v4.1-neural-ocr (demo)',
    },
    mrzVerification: {
      format: 'ICAO 9303 Type 3 (2x44)',
      rawLine1: 'P<UTOLEE<<MORGAN<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
      rawLine2: 'P9876543<3UTO8804128F3201147<<<<<<<<<<<<<<08',
      checkDigits: 'INVALID',
      ocrConsistency: 'MISMATCH',
      compositeCheckDigit: 'INVALID',
    },
    documentValidation: {
      requiredFieldsPresent: '100%',
      dateValidity: 'INVALID',
      formatConsistency: 'MISMATCH',
      crossFieldConsistency: 'CRITICAL_DISCREPANCY',
      templateMatchScore: '64.1%',
    },
    forensics: {
      tamperingConfidence: 87,
      anomalyConfidence: 89,
      photoAnomaly: 'POSSIBLE_REPLACEMENT',
      textManipulation: 'DETECTED',
      metadataAnomaly: 'HEADER_MISMATCH',
      elaResult: 'SUSPICIOUS_HIGH_FREQUENCY_RESIDUALS',
    },
    faceVerification: {
      docPhotoDetected: true,
      presentedFaceDetected: true,
      similarityScore: 34.2,
      threshold: 85.0,
      confidence: 96.5,
      status: 'MISMATCH',
    },
    watchlist: {
      status: 'CLEAR',
      match: false,
      database: 'Simulated Watchlist',
      notes: 'No matches against synthetic alert database.',
    },
  },
  {
    id: 'VX-1040',
    travelerRef: 'TRV-61942',
    travelerName: 'Elena Rostova',
    documentType: 'National ID',
    documentNumber: 'ID-449102',
    nationality: 'EST (Estonia)',
    createdAt: '2026-09-01T21:40:00Z',
    officerId: 'OFF-1042',
    officerName: 'Insp. S. Vance',
    status: SCREENING_STATUS.COMPLETE,
    decision: SCREENING_DECISION.CLEAR,
    overallScore: 8,
    summary: 'All synthetic chip and visual security markings verified with zero variance.',
    recommendedAction: 'Standard clearance.',
    checks: {
      docValidation: { passed: true, status: 'VALID', label: 'Document Validated', officerNote: 'Valid card format and issue parameters.' },
      mrzVerification: { passed: true, status: 'VALID', label: 'MRZ Verified', officerNote: 'Check digits match card holder data.' },
      tamperingAnalysis: { passed: true, status: 'CLEARED', label: 'No Tampering Indicator', officerNote: 'No text anomalies found.' },
      faceVerification: { passed: true, status: 'MATCH', label: 'Face Match (98.1% Similarity)', officerNote: 'High confidence biometric match.' },
      watchlistCheck: { passed: true, status: 'NO_MATCH', label: 'No Watchlist Match (Simulated)', officerNote: 'Clear in synthetic registry.' },
    },
    metrics: { ocrConfidence: 99.7, mrzChecksumValid: true, faceMatchScore: 98.1, tamperingScore: 1.2, processingDurationSec: 2.9 },
    audit: { status: 'Recorded', txRef: '0x12a8f9001b92c478a84', timestamp: '01 Sep 2026, 21:40:04 UTC', hash: 'sha256:7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b', blockNumber: 4891690 },
    extractedFields: [
      { key: 'Document Number', value: 'ID-449102', confidence: 0.99, source: FIELD_SOURCES.CHIP, status: 'valid' },
      { key: 'Full Name', value: 'Elena Rostova', confidence: 0.99, source: FIELD_SOURCES.CHIP, status: 'valid' },
      { key: 'Date of Birth', value: '1994-03-29', confidence: 0.99, source: FIELD_SOURCES.CHIP, status: 'valid' },
      { key: 'Nationality', value: 'EST', confidence: 0.99, source: FIELD_SOURCES.CHIP, status: 'valid' },
      { key: 'Expiry Date', value: '2029-03-28', confidence: 0.99, source: FIELD_SOURCES.CHIP, status: 'valid' },
    ],
    findings: [],
    ocrAnalysis: { confidence: 99.7, fieldsDetected: 12, fieldsRequiringReview: 0, charQualityScore: 99.4, engineVersion: 'v4.1-neural-ocr (demo)' },
    mrzVerification: { format: 'ICAO 9303 Type 1 (3x30)', rawLine1: 'I<ESTID449102<<<<<<<<<<<<<<<<<', rawLine2: '9403294F2903287EST<<<<<<<<<<<2', rawLine3: 'ROSTOVA<<ELENA<<<<<<<<<<<<<<<<', checkDigits: 'VALID', ocrConsistency: 'VALID', compositeCheckDigit: 'VALID' },
    documentValidation: { requiredFieldsPresent: '100%', dateValidity: 'VALID', formatConsistency: 'VALID', crossFieldConsistency: 'VALID', templateMatchScore: '99.2%' },
    forensics: { tamperingConfidence: 1, anomalyConfidence: 1, photoAnomaly: 'NONE', textManipulation: 'NOT DETECTED', metadataAnomaly: 'NONE', elaResult: 'NORMAL' },
    faceVerification: { docPhotoDetected: true, presentedFaceDetected: true, similarityScore: 98.1, threshold: 85.0, confidence: 99.8, status: 'MATCH' },
    watchlist: { status: 'CLEAR', match: false, database: 'Simulated Watchlist', notes: 'Clear.' },
  },
  {
    id: 'VX-1039',
    travelerRef: 'TRV-44109',
    travelerName: 'David Chen',
    documentType: 'Driving Licence',
    documentNumber: 'DL-8830192',
    nationality: 'AUS (Australia)',
    createdAt: '2026-09-01T19:22:00Z',
    officerId: 'OFF-1042',
    officerName: 'Insp. S. Vance',
    status: SCREENING_STATUS.COMPLETE,
    decision: SCREENING_DECISION.CLEAR,
    overallScore: 15,
    summary: 'Licence barcode and visible details verified with no anomalies detected.',
    recommendedAction: 'Standard clearance.',
    checks: {
      docValidation: { passed: true, status: 'VALID', label: 'Document Validated', officerNote: 'Standard layout verified.' },
      mrzVerification: { passed: true, status: 'VALID', label: 'Barcode Verified', officerNote: 'PDF417 barcode payload matches card text.' },
      tamperingAnalysis: { passed: true, status: 'CLEARED', label: 'No Tampering Indicator', officerNote: 'Clean typography alignment.' },
      faceVerification: { passed: true, status: 'MATCH', label: 'Face Match (94.8% Similarity)', officerNote: 'Face matches licence photo.' },
      watchlistCheck: { passed: true, status: 'NO_MATCH', label: 'No Watchlist Match (Simulated)', officerNote: 'Clear in synthetic registry.' },
    },
    metrics: { ocrConfidence: 98.4, mrzChecksumValid: true, faceMatchScore: 94.8, tamperingScore: 3.5, processingDurationSec: 3.0 },
    audit: { status: 'Recorded', txRef: '0x88910029b47e23180c', timestamp: '01 Sep 2026, 19:22:05 UTC', hash: 'sha256:5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b', blockNumber: 4891540 },
    extractedFields: [
      { key: 'Licence Number', value: 'DL-8830192', confidence: 0.98, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Full Name', value: 'David Chen', confidence: 0.99, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Date of Birth', value: '1982-12-05', confidence: 0.97, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Jurisdiction', value: 'NSW, Australia', confidence: 0.98, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Expiry Date', value: '2028-12-04', confidence: 0.98, source: FIELD_SOURCES.VIZ, status: 'valid' },
    ],
    findings: [],
    ocrAnalysis: { confidence: 98.4, fieldsDetected: 10, fieldsRequiringReview: 0, charQualityScore: 97.9, engineVersion: 'v4.1-neural-ocr (demo)' },
    mrzVerification: { format: 'AAMVA DL/ID Standard PDF417', rawLine1: '@\n\nANSI 636000010002DL00410278ZW03190038DLDAQDL8830192', rawLine2: 'DCSCHEN,DAVID,19821205', checkDigits: 'VALID', ocrConsistency: 'VALID', compositeCheckDigit: 'VALID' },
    documentValidation: { requiredFieldsPresent: '100%', dateValidity: 'VALID', formatConsistency: 'VALID', crossFieldConsistency: 'VALID', templateMatchScore: '97.4%' },
    forensics: { tamperingConfidence: 3, anomalyConfidence: 2, photoAnomaly: 'NONE', textManipulation: 'NOT DETECTED', metadataAnomaly: 'NONE', elaResult: 'NORMAL' },
    faceVerification: { docPhotoDetected: true, presentedFaceDetected: true, similarityScore: 94.8, threshold: 85.0, confidence: 97.5, status: 'MATCH' },
    watchlist: { status: 'CLEAR', match: false, database: 'Simulated Watchlist', notes: 'Clear.' },
  },
  {
    id: 'VX-1038',
    travelerRef: 'TRV-33921',
    travelerName: 'Marcus Vance',
    documentType: 'Passport',
    documentNumber: 'P1029384',
    nationality: 'GBR (United Kingdom)',
    createdAt: '2026-09-01T16:10:00Z',
    officerId: 'OFF-1042',
    officerName: 'Insp. S. Vance',
    status: SCREENING_STATUS.COMPLETE,
    decision: SCREENING_DECISION.REVIEW,
    overallScore: 52,
    summary: 'Font spacing anomaly detected in the bearer surname field. Requires visual magnification.',
    recommendedAction: 'Manual inspection of personal details page.',
    checks: {
      docValidation: { passed: true, status: 'VALID', label: 'Document Validated', officerNote: 'Fields and dates present.' },
      mrzVerification: { passed: true, status: 'VALID', label: 'MRZ Verified', officerNote: 'Check digits are mathematically valid.' },
      tamperingAnalysis: { passed: false, status: 'FLAGGED', label: 'Font Spacing Anomaly', officerNote: 'Possible text variance in surname line.' },
      faceVerification: { passed: true, status: 'MATCH', label: 'Face Match (91.2% Similarity)', officerNote: 'Presented face matches document photo.' },
      watchlistCheck: { passed: true, status: 'NO_MATCH', label: 'No Watchlist Match (Simulated)', officerNote: 'No alert matches.' },
    },
    metrics: { ocrConfidence: 91.0, mrzChecksumValid: true, faceMatchScore: 91.2, tamperingScore: 48.0, processingDurationSec: 4.2 },
    audit: { status: 'Recorded', txRef: '0x4481029e77103a89bc', timestamp: '01 Sep 2026, 16:10:05 UTC', hash: 'sha256:2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c', blockNumber: 4891410 },
    extractedFields: [
      { key: 'Document Number', value: 'P1029384', confidence: 0.98, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Full Name', value: 'Marcus Vance', confidence: 0.82, source: FIELD_SOURCES.VIZ, status: 'review' },
      { key: 'Date of Birth', value: '1979-06-18', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Nationality', value: 'GBR', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Expiry Date', value: '2029-06-17', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
    ],
    findings: [
      {
        code: 'FND-512',
        severity: SEVERITY.MEDIUM,
        title: 'Font Spacing Irregularity',
        detail: 'Character baseline in surname field deviates slightly from standard font template.',
      },
    ],
    ocrAnalysis: { confidence: 91.0, fieldsDetected: 16, fieldsRequiringReview: 1, charQualityScore: 88.5, engineVersion: 'v4.1-neural-ocr (demo)' },
    mrzVerification: { format: 'ICAO 9303 Type 3 (2x44)', rawLine1: 'P<GBRVANCE<<MARCUS<<<<<<<<<<<<<<<<<<<<<<<<<<', rawLine2: 'P1029384<2GBR7906184M2906176<<<<<<<<<<<<<<06', checkDigits: 'VALID', ocrConsistency: 'VALID', compositeCheckDigit: 'VALID' },
    documentValidation: { requiredFieldsPresent: '100%', dateValidity: 'VALID', formatConsistency: 'VALID', crossFieldConsistency: 'VALID', templateMatchScore: '89.1%' },
    forensics: { tamperingConfidence: 48, anomalyConfidence: 45, photoAnomaly: 'NONE', textManipulation: 'POSSIBLE_INCONSISTENCY', metadataAnomaly: 'NONE', elaResult: 'MINOR_GRADIENT_DRIFT' },
    faceVerification: { docPhotoDetected: true, presentedFaceDetected: true, similarityScore: 91.2, threshold: 85.0, confidence: 95.0, status: 'MATCH' },
    watchlist: { status: 'CLEAR', match: false, database: 'Simulated Watchlist', notes: 'Clear.' },
  },
  {
    id: 'VX-1037',
    travelerRef: 'TRV-21008',
    travelerName: 'Aisha Al-Mansoor',
    documentType: 'Permit',
    documentNumber: 'WP-992014',
    nationality: 'ARE (United Arab Emirates)',
    createdAt: '2026-09-01T14:05:00Z',
    officerId: 'OFF-1042',
    officerName: 'Insp. S. Vance',
    status: SCREENING_STATUS.COMPLETE,
    decision: SCREENING_DECISION.CLEAR,
    overallScore: 18,
    summary: 'Work permit format and digital code verified.',
    recommendedAction: 'Standard clearance.',
    checks: {
      docValidation: { passed: true, status: 'VALID', label: 'Document Validated', officerNote: 'Fields and dates valid.' },
      mrzVerification: { passed: true, status: 'VALID', label: 'Barcode Verified', officerNote: 'Data matrix barcode matches text.' },
      tamperingAnalysis: { passed: true, status: 'CLEARED', label: 'No Tampering Indicator', officerNote: 'Clean background and typography.' },
      faceVerification: { passed: true, status: 'MATCH', label: 'Face Match (95.0% Similarity)', officerNote: 'Biometric match.' },
      watchlistCheck: { passed: true, status: 'NO_MATCH', label: 'No Watchlist Match (Simulated)', officerNote: 'Clear in synthetic registry.' },
    },
    metrics: { ocrConfidence: 97.9, mrzChecksumValid: true, faceMatchScore: 95.0, tamperingScore: 4.1, processingDurationSec: 3.1 },
    audit: { status: 'Recorded', txRef: '0x9920148abce1144081', timestamp: '01 Sep 2026, 14:05:04 UTC', hash: 'sha256:3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d', blockNumber: 4891280 },
    extractedFields: [
      { key: 'Permit ID', value: 'WP-992014', confidence: 0.98, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Full Name', value: 'Aisha Al-Mansoor', confidence: 0.97, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Date of Birth', value: '1990-09-12', confidence: 0.99, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Permit Type', value: 'Specialist Skilled Worker', confidence: 0.96, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Expiry Date', value: '2027-09-11', confidence: 0.98, source: FIELD_SOURCES.VIZ, status: 'valid' },
    ],
    findings: [],
    ocrAnalysis: { confidence: 97.9, fieldsDetected: 11, fieldsRequiringReview: 0, charQualityScore: 98.1, engineVersion: 'v4.1-neural-ocr (demo)' },
    mrzVerification: { format: '2D Barcode (DataMatrix)', rawLine1: 'WP992014;ARE;19900912;AISHA;AL-MANSOOR;EXP20270911', checkDigits: 'VALID', ocrConsistency: 'VALID', compositeCheckDigit: 'VALID' },
    documentValidation: { requiredFieldsPresent: '100%', dateValidity: 'VALID', formatConsistency: 'VALID', crossFieldConsistency: 'VALID', templateMatchScore: '96.8%' },
    forensics: { tamperingConfidence: 4, anomalyConfidence: 3, photoAnomaly: 'NONE', textManipulation: 'NOT DETECTED', metadataAnomaly: 'NONE', elaResult: 'NORMAL' },
    faceVerification: { docPhotoDetected: true, presentedFaceDetected: true, similarityScore: 95.0, threshold: 85.0, confidence: 98.2, status: 'MATCH' },
    watchlist: { status: 'CLEAR', match: false, database: 'Simulated Watchlist', notes: 'Clear.' },
  },
  {
    id: 'VX-1036',
    travelerRef: 'TRV-10948',
    travelerName: "Samuel O'Connor",
    documentType: 'Visa',
    documentNumber: 'V9102834',
    nationality: 'IRL (Ireland)',
    createdAt: '2026-09-01T11:30:00Z',
    officerId: 'OFF-1042',
    officerName: 'Insp. S. Vance',
    status: SCREENING_STATUS.COMPLETE,
    decision: SCREENING_DECISION.HIGH_RISK,
    overallScore: 91,
    summary: 'High risk alert. Altered expiration date and multiple tamper indicators detected in document layer.',
    recommendedAction: 'Secondary inspection and manual document review required.',
    checks: {
      docValidation: { passed: false, status: 'FAILED', label: 'Document Validation (Failed)', officerNote: 'Expiration date discrepancy.' },
      mrzVerification: { passed: false, status: 'FAILED', label: 'MRZ Check Digit Mismatch', officerNote: 'Line 2 checksum mismatch.' },
      tamperingAnalysis: { passed: false, status: 'HIGH_TAMPER', label: 'Possible Text Tampering Detected', officerNote: 'Tampering confidence: 91% in date field.' },
      faceVerification: { passed: true, status: 'MATCH', label: 'Face Match (88.4% Similarity)', officerNote: 'Face matches document photo.' },
      watchlistCheck: { passed: false, status: 'FLAGGED', label: 'Simulated Watchlist Flag', officerNote: 'Synthetic alert record matched.' },
    },
    metrics: { ocrConfidence: 78.2, mrzChecksumValid: false, faceMatchScore: 88.4, tamperingScore: 91.0, processingDurationSec: 5.8 },
    audit: { status: 'Recorded', txRef: '0x1036a992bc4491028e', timestamp: '01 Sep 2026, 11:30:06 UTC', hash: 'sha256:4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e', blockNumber: 4891150 },
    extractedFields: [
      { key: 'Document Number', value: 'V9102834', confidence: 0.81, source: FIELD_SOURCES.VIZ, status: 'review' },
      { key: 'Full Name', value: "Samuel O'Connor", confidence: 0.94, source: FIELD_SOURCES.VIZ, status: 'valid' },
      { key: 'Date of Birth', value: '1975-02-14', confidence: 0.92, source: FIELD_SOURCES.MRZ, status: 'valid' },
      { key: 'Expiry Date', value: '2028-08-30', confidence: 0.54, source: FIELD_SOURCES.VIZ, status: 'invalid' },
    ],
    findings: [
      {
        code: 'FND-819',
        severity: SEVERITY.CRITICAL,
        title: 'Altered Expiration Date',
        detail: 'Expiry year shows pixel disruption consistent with possible digit modification from 2023 to 2028.',
      },
      {
        code: 'FND-733',
        severity: SEVERITY.HIGH,
        title: 'MRZ Checksum Failure',
        detail: 'Machine-readable zone expiration check digit does not calculate to recorded value.',
      },
    ],
    ocrAnalysis: { confidence: 78.2, fieldsDetected: 13, fieldsRequiringReview: 4, charQualityScore: 74.0, engineVersion: 'v4.1-neural-ocr (demo)' },
    mrzVerification: { format: 'ICAO 9303 Type 2 (2x36)', rawLine1: 'V<IRLOCONNOR<<SAMUEL<<<<<<<<<<<<<<<<', rawLine2: 'V9102834<8IRL7502142M2808308<<<<<<09', checkDigits: 'INVALID', ocrConsistency: 'MISMATCH', compositeCheckDigit: 'INVALID' },
    documentValidation: { requiredFieldsPresent: '100%', dateValidity: 'INVALID', formatConsistency: 'MISMATCH', crossFieldConsistency: 'CRITICAL_DISCREPANCY', templateMatchScore: '59.8%' },
    forensics: { tamperingConfidence: 91, anomalyConfidence: 93, photoAnomaly: 'NONE', textManipulation: 'DETECTED', metadataAnomaly: 'LAYER_ANOMALY', elaResult: 'SUSPICIOUS_HIGH_FREQUENCY_RESIDUALS' },
    faceVerification: { docPhotoDetected: true, presentedFaceDetected: true, similarityScore: 88.4, threshold: 85.0, confidence: 92.1, status: 'MATCH' },
    watchlist: { status: 'FLAGGED', match: true, database: 'Simulated Watchlist', notes: 'Simulated alert flag: Document ID reported in synthetic test reference index.' },
  },
]

// Synthetic active pipeline items for the operational dashboard section
export const MOCK_ACTIVE_SCREENINGS = [
  {
    id: 'VX-1047',
    travelerName: 'Carlos Mendez',
    documentType: 'Passport',
    stage: 'MRZ Verification',
    stageNumber: 4,
    status: 'PROCESSING',
    score: null,
    startedAt: '1 min ago',
  },
  {
    id: 'VX-1046',
    travelerName: 'Sophia Lin',
    documentType: 'Visa',
    stage: 'Risk Assessment',
    stageNumber: 8,
    status: 'NEEDS REVIEW',
    score: 47,
    startedAt: '3 mins ago',
  },
  {
    id: 'VX-1045',
    travelerName: 'Liam Andersen',
    documentType: 'Passport',
    stage: 'Completed',
    stageNumber: 8,
    status: 'CLEAR',
    score: 18,
    startedAt: '5 mins ago',
  },
]

const DB_STORAGE_KEY = 'verifyx_screenings_store'

function loadScreenings() {
  try {
    const raw = sessionStorage.getItem(DB_STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    console.warn('Could not read from sessionStorage:', e)
  }
  return [...INITIAL_SCREENINGS]
}

function saveScreenings(screenings) {
  try {
    sessionStorage.setItem(DB_STORAGE_KEY, JSON.stringify(screenings))
  } catch (e) {
    console.warn('Could not write to sessionStorage:', e)
  }
}

let screeningsDb = loadScreenings()

export const db = {
  getOfficer() {
    return MOCK_OFFICER
  },

  getAllScreenings() {
    return screeningsDb
  },

  getScreeningById(id) {
    return screeningsDb.find((s) => s.id === id) || null
  },

  createScreening({ travelerRef, documentType, travelerName = 'Synthetic Traveler' }) {
    const nextNum = 1044 + Math.floor(Math.random() * 500)
    const newId = `VX-${nextNum}`
    const nowIso = new Date().toISOString()

    const newRecord = {
      id: newId,
      travelerRef: travelerRef || `TRV-${Math.floor(10000 + Math.random() * 90000)}`,
      travelerName: travelerName || 'Synthetic Subject',
      documentType: documentType || 'Passport',
      documentNumber: `D${Math.floor(1000000 + Math.random() * 9000000)}`,
      nationality: 'UTO (Utopia)',
      createdAt: nowIso,
      officerId: MOCK_OFFICER.id,
      officerName: MOCK_OFFICER.displayName,
      status: SCREENING_STATUS.PROCESSING,
      decision: SCREENING_DECISION.CLEAR,
      overallScore: 16,
      summary: 'Automated screening completed. No primary anomaly flags detected.',
      recommendedAction: 'Standard clearance. No secondary inspection needed.',
      checks: {
        docValidation: { passed: true, status: 'VALID', label: 'Document Validated', officerNote: 'Format and dates are valid.' },
        mrzVerification: { passed: true, status: 'VALID', label: 'MRZ Verified', officerNote: 'Machine-readable lines match visible text.' },
        tamperingAnalysis: { passed: true, status: 'CLEARED', label: 'No Significant Tampering Indicator', officerNote: 'No text or photo alterations found.' },
        faceVerification: { passed: true, status: 'MATCH', label: 'Face Match (95.2% Similarity)', officerNote: 'Presented face matches document photo.' },
        watchlistCheck: { passed: true, status: 'NO_MATCH', label: 'No Watchlist Match (Simulated)', officerNote: 'No flags in simulated alert registry.' },
      },
      metrics: {
        ocrConfidence: 98.9,
        mrzChecksumValid: true,
        faceMatchScore: 95.2,
        tamperingScore: 3.8,
        processingDurationSec: 3.4,
      },
      audit: {
        status: 'Recorded',
        txRef: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
        timestamp: new Date().toUTCString(),
        hash: `sha256:${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`,
        blockNumber: 4892100 + Math.floor(Math.random() * 100),
      },
      extractedFields: [
        { key: 'Document Number', value: `D${Math.floor(1000000 + Math.random() * 9000000)}`, confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
        { key: 'Full Name', value: travelerName || 'Synthetic Subject', confidence: 0.98, source: FIELD_SOURCES.VIZ, status: 'valid' },
        { key: 'Date of Birth', value: '1992-06-19', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
        { key: 'Nationality', value: 'UTO', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
        { key: 'Issue Date', value: '2023-01-10', confidence: 0.97, source: FIELD_SOURCES.VIZ, status: 'valid' },
        { key: 'Expiry Date', value: '2033-01-09', confidence: 0.99, source: FIELD_SOURCES.MRZ, status: 'valid' },
      ],
      findings: [
        {
          code: 'FND-100',
          severity: SEVERITY.INFO,
          title: 'Automated Ingestion Validated',
          detail: 'Synthetic document payload checked against template specifications.',
        },
      ],
      ocrAnalysis: { confidence: 98.9, fieldsDetected: 14, fieldsRequiringReview: 0, charQualityScore: 98.2, engineVersion: 'v4.1-neural-ocr (demo)' },
      mrzVerification: {
        format: 'ICAO 9303 Compliant',
        rawLine1: 'P<UTOSUBJECT<<SYNTHETIC<<<<<<<<<<<<<<<<<<<<<',
        rawLine2: 'D1029384<2UTO9206194M3301096<<<<<<<<<<<<<<02',
        checkDigits: 'VALID',
        ocrConsistency: 'VALID',
        compositeCheckDigit: 'VALID',
      },
      documentValidation: { requiredFieldsPresent: '100%', dateValidity: 'VALID', formatConsistency: 'VALID', crossFieldConsistency: 'VALID', templateMatchScore: '97.8%' },
      forensics: { tamperingConfidence: 4, anomalyConfidence: 3, photoAnomaly: 'NONE', textManipulation: 'NOT DETECTED', metadataAnomaly: 'NONE', elaResult: 'NORMAL' },
      faceVerification: { docPhotoDetected: true, presentedFaceDetected: true, similarityScore: 95.2, threshold: 85.0, confidence: 98.0, status: 'MATCH' },
      watchlist: { status: 'CLEAR', match: false, database: 'Simulated Watchlist', notes: 'Clear.' },
    }

    screeningsDb = [newRecord, ...screeningsDb]
    saveScreenings(screeningsDb)
    return newRecord
  },

  updateScreeningStatus(id, status, updates = {}) {
    const idx = screeningsDb.findIndex((s) => s.id === id)
    if (idx !== -1) {
      screeningsDb[idx] = { ...screeningsDb[idx], status, ...updates }
      saveScreenings(screeningsDb)
      return screeningsDb[idx]
    }
    return null
  },

  getDashboardMetrics() {
    const total = 1284 + screeningsDb.length - INITIAL_SCREENINGS.length
    const cleared = 963 + screeningsDb.filter((s) => s.decision === SCREENING_DECISION.CLEAR).length - INITIAL_SCREENINGS.filter((s) => s.decision === SCREENING_DECISION.CLEAR).length
    const review = 235 + screeningsDb.filter((s) => s.decision === SCREENING_DECISION.REVIEW).length - INITIAL_SCREENINGS.filter((s) => s.decision === SCREENING_DECISION.REVIEW).length
    const highRisk = 86 + screeningsDb.filter((s) => s.decision === SCREENING_DECISION.HIGH_RISK).length - INITIAL_SCREENINGS.filter((s) => s.decision === SCREENING_DECISION.HIGH_RISK).length

    return {
      kpis: {
        totalScreenings: total,
        cleared: cleared,
        needsReview: review,
        highRisk: highRisk,
      },
      activeScreenings: MOCK_ACTIVE_SCREENINGS,
      recentQueue: screeningsDb.slice(0, 7),
    }
  },

  getAnalyticsData(range = '7d') {
    return {
      overview: {
        total: 1284,
        cleared: 963,
        needsReview: 235,
        highRisk: 86,
        avgProcessingTimeSec: 3.4,
        passRate: 75.0,
      },
      decisionDistribution: [
        { name: 'Cleared', count: 963, percentage: 75.0, color: '#3d9b6e' },
        { name: 'Needs Review', count: 235, percentage: 18.3, color: '#c9a227' },
        { name: 'High Risk', count: 86, percentage: 6.7, color: '#c44c3a' },
      ],
      timeline: [
        { date: '26 Aug', total: 172, cleared: 134, review: 28, highRisk: 10 },
        { date: '27 Aug', total: 189, cleared: 145, review: 32, highRisk: 12 },
        { date: '28 Aug', total: 165, cleared: 128, review: 27, highRisk: 10 },
        { id: '29 Aug', date: '29 Aug', total: 198, cleared: 151, review: 36, highRisk: 11 },
        { date: '30 Aug', total: 204, cleared: 156, review: 35, highRisk: 13 },
        { date: '31 Aug', total: 178, cleared: 130, review: 34, highRisk: 14 },
        { date: '01 Sep', total: 178, cleared: 119, review: 43, highRisk: 16 },
      ],
      docTypeBreakdown: [
        { type: 'Passport', count: 712, share: 55.5 },
        { type: 'Visa', count: 320, share: 24.9 },
        { type: 'National ID', count: 148, share: 11.5 },
        { type: 'Driving Licence', count: 68, share: 5.3 },
        { type: 'Permit', count: 36, share: 2.8 },
      ],
      topFindings: [
        { code: 'FND-402', title: 'MRZ inconsistency', count: 94, severity: SEVERITY.MEDIUM },
        { code: 'FND-318', title: 'Date field format anomaly', count: 78, severity: SEVERITY.MEDIUM },
        { code: 'FND-622', title: 'Possible text manipulation', count: 42, severity: SEVERITY.HIGH },
        { code: 'FND-905', title: 'Face verification mismatch', count: 31, severity: SEVERITY.CRITICAL },
        { code: 'FND-801', title: 'Date of birth mismatch', count: 24, severity: SEVERITY.CRITICAL },
      ],
    }
  },
}

export default db
