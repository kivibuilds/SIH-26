import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FilePlus,
  Play,
  ArrowLeft,
  FileText,
  User,
  Hash,
  Sparkles,
  Info,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { createScreening, uploadDocument } from '../services/api'
import { ROUTES } from '../constants/routes'
import { DOCUMENT_TYPES } from '../constants/screeningStatus'
import PageHeader from '../components/layout/PageHeader'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import UploadDropzone from '../components/screening/UploadDropzone'
import DocumentPreview from '../components/screening/DocumentPreview'

export function NewScreeningPage() {
  const navigate = useNavigate()

  const [documentType, setDocumentType] = useState('Passport')
  const [travelerRef, setTravelerRef] = useState('')
  const [travelerName, setTravelerName] = useState('')
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const handleFileSelect = (selectedFile, errorMsg) => {
    setFile(selectedFile)
    setFileError(errorMsg)
    setSubmitError(null)
  }

  const handleFileRemove = () => {
    setFile(null)
    setFileError(null)
  }

  const handleSelectSample = (sample) => {
    setDocumentType(sample.docType)
    setTravelerRef(sample.ref)
    setTravelerName(sample.name)
    const syntheticFile = new File(
      ['synthetic-binary-payload'],
      `${sample.docType.toLowerCase()}_${sample.ref.toLowerCase()}.png`,
      { type: 'image/png' }
    )
    setFile(syntheticFile)
    setFileError(null)
    setSubmitError(null)
  }

  const handleStartScreening = async (e) => {
    e.preventDefault()
    setSubmitError(null)

    if (!file) {
      setFileError('Please select or drop a document scan to proceed.')
      return
    }

    try {
      setIsSubmitting(true)

      // 1. Create screening record
      const screening = await createScreening({
        travelerRef: travelerRef || `TRV-${Math.floor(10000 + Math.random() * 90000)}`,
        travelerName: travelerName || 'Synthetic Subject',
        documentType,
      })

      // 2. Upload file payload
      await uploadDocument(screening.id, file)

      // 3. Navigate to status pipeline
      navigate(ROUTES.SCREENING_STATUS(screening.id))
    } catch (err) {
      console.error('Failed to initiate screening:', err)
      setSubmitError(err.message || 'Failed to initiate screening pipeline.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Identity Screening"
        subtitle="Submit a document for identity and authenticity screening"
        backUrl={ROUTES.DASHBOARD}
        backLabel="Return to Dashboard"
      />

      {/* 3-Step Officer Workflow Indicator */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-console-border bg-console-panel p-3 text-xs font-mono">
        <div className="flex items-center gap-2.5 p-2 bg-console-raised border border-console-border/80">
          <span className="flex h-5 w-5 items-center justify-center bg-console-accent text-slate-950 font-bold text-[11px]">
            1
          </span>
          <span className="font-semibold text-console-text uppercase">Select Document</span>
        </div>
        <div className="flex items-center gap-2.5 p-2 bg-console-raised border border-console-border/80">
          <span className="flex h-5 w-5 items-center justify-center bg-console-accent text-slate-950 font-bold text-[11px]">
            2
          </span>
          <span className="font-semibold text-console-text uppercase">Review Preview</span>
        </div>
        <div className="flex items-center gap-2.5 p-2 bg-console-raised border border-console-border/80">
          <span className="flex h-5 w-5 items-center justify-center bg-console-accent text-slate-950 font-bold text-[11px]">
            3
          </span>
          <span className="font-semibold text-console-text uppercase">Start Screening</span>
        </div>
      </div>

      {submitError && (
        <div className="border border-rose-800/80 bg-rose-950/40 p-3 text-xs text-rose-300">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Ingestion Parameters */}
        <div className="lg:col-span-7 space-y-5">
          <Panel
            title="Step 1 • Document Type &amp; Traveler Reference"
            subtitle="Synthetic traveler identifiers"
          >
            <div className="space-y-4">
              {/* Document Type Selector */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-console-muted mb-1.5">
                  Document Type Specification
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DOCUMENT_TYPES.map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setDocumentType(dt)}
                      className={`px-3 py-2 text-xs font-mono font-medium border text-left transition-colors cursor-pointer ${
                        documentType === dt
                          ? 'border-console-accent bg-console-accent/15 text-console-accent font-semibold'
                          : 'border-console-border bg-console-raised text-console-text hover:bg-slate-800'
                      }`}
                    >
                      {dt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="travelerRef"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-console-muted mb-1.5"
                  >
                    Traveler Reference (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-console-muted">
                      <Hash className="h-3.5 w-3.5" />
                    </div>
                    <input
                      id="travelerRef"
                      type="text"
                      value={travelerRef}
                      onChange={(e) => setTravelerRef(e.target.value)}
                      placeholder="e.g. TRV-88219"
                      className="w-full bg-console-raised border border-console-border px-3.5 py-2 pl-9 text-xs font-mono text-console-text placeholder:text-console-muted/60 focus:border-console-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="travelerName"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-console-muted mb-1.5"
                  >
                    Subject Name (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-console-muted">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <input
                      id="travelerName"
                      type="text"
                      value={travelerName}
                      onChange={(e) => setTravelerName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full bg-console-raised border border-console-border px-3.5 py-2 pl-9 text-xs font-mono text-console-text placeholder:text-console-muted/60 focus:border-console-accent focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          {/* Upload Dropzone */}
          <Panel
            title="Step 2 • Document Scan Ingest"
            subtitle="Upload front personal details page"
          >
            <UploadDropzone
              file={file}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              onSelectSample={handleSelectSample}
              loading={isSubmitting}
              error={fileError}
            />
          </Panel>

          {/* Screening Submission Trigger */}
          <div className="flex items-center justify-between border border-console-border bg-console-panel p-4">
            <div className="flex items-center gap-2 text-xs text-console-muted">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Inspection engine ready</span>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              icon={Play}
              onClick={handleStartScreening}
              disabled={!file}
              className="text-xs tracking-wider"
            >
              Start Screening Pipeline
            </Button>
          </div>
        </div>

        {/* Right Column: Ingestion Preview & Guidelines */}
        <div className="lg:col-span-5 space-y-5">
          <Panel
            title="Step 3 • Document Preview"
            subtitle="Active scan frame preview"
          >
            <DocumentPreview
              file={file}
              screening={{
                documentType,
                travelerName: travelerName || 'Synthetic Subject',
                travelerRef: travelerRef || 'TRV-88219',
              }}
              showControls={false}
            />
          </Panel>

          {/* Prototype Guidance Box */}
          <div className="border border-console-border bg-console-panel p-4 space-y-2.5 text-xs text-console-muted">
            <div className="flex items-center gap-2 text-console-text font-semibold uppercase text-[11px] font-mono">
              <Info className="h-3.5 w-3.5 text-console-accent" />
              <span>Officer Guidance</span>
            </div>
            <p className="leading-relaxed">
              When started, VerifyX checks visible document fields, validates machine-readable zone checksums, checks for potential printed text alterations, and compares photo similarity.
            </p>
            <div className="border-t border-console-border/70 pt-2 text-[10px] font-mono text-console-muted/80">
              SYNTHETIC DATA: All specimen scans are processed in-browser for demonstration purposes.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewScreeningPage
