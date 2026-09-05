export const SCREENING_DECISION = {
  CLEAR: 'clear',
  REVIEW: 'review',
  HIGH_RISK: 'high_risk',
}

export const SCREENING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  FAILED: 'failed',
}

export const STEP_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  FAILED: 'failed',
}

export const SEVERITY = {
  INFO: 'info',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
}

export const DOCUMENT_TYPES = [
  'Passport',
  'Visa',
  'National ID',
  'Driving Licence',
  'Permit',
]

export const PIPELINE_STEPS = [
  { id: 'doc_received', label: 'Document Received', description: 'Document image loaded and prepared for analysis' },
  { id: 'image_preprocess', label: 'Image Preprocessing', description: 'Image enhancement, deskew, and contrast adjustment' },
  { id: 'ocr_extraction', label: 'OCR Extraction', description: 'Extract text from visible document fields' },
  { id: 'mrz_verify', label: 'MRZ Verification', description: 'Verify machine-readable zone format and check digits' },
  { id: 'doc_validation', label: 'Document Validation', description: 'Check required fields, expiration dates, and consistency' },
  { id: 'tampering_analysis', label: 'Tampering Analysis', description: 'Check font alignment and look for possible text alterations' },
  { id: 'face_verify', label: 'Face Verification', description: 'Compare document photo with presented face sample' },
  { id: 'risk_assessment', label: 'Risk Assessment', description: 'Calculate consolidated risk score and generate recommendations' },
]

export const FIELD_SOURCES = {
  MRZ: 'MRZ',
  VIZ: 'VIZ',
  CHIP: 'CHIP',
}
