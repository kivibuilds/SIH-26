import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, ShieldCheck, Sparkles, UploadCloud, UserRound } from 'lucide-react'
import Panel from '../ui/Panel'
import Button from '../ui/Button'
import StatusChip from '../ui/StatusChip'

export function FaceVerificationPanel({
  documentFile,
  selfieFile,
  travelerName = 'Subject',
  onSelfieSelect,
  onUseSample = null,
  similarity = 96.4,
}) {
  const [documentPreview, setDocumentPreview] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (documentFile && documentFile instanceof File && documentFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(documentFile)
      setDocumentPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setDocumentPreview(null)
    return undefined
  }, [documentFile])

  useEffect(() => {
    if (selfieFile && selfieFile instanceof File && selfieFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selfieFile)
      setSelfiePreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setSelfiePreview(null)
    return undefined
  }, [selfieFile])

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0]
    if (selected) {
      onSelfieSelect?.(selected, null)
    }
  }

  const status = similarity >= 85 ? 'MATCH' : similarity >= 70 ? 'REVIEW' : 'MISMATCH'

  return (
    <Panel
      title="Face Verification"
      subtitle="Document portrait vs presented live face sample"
      action={
        <div className="flex items-center gap-2">
          <StatusChip status={status} size="xs" />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-console-border bg-console-raised/40 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-console-muted font-mono">
              <UserRound className="h-3.5 w-3.5 text-console-accent" />
              <span>Document photo</span>
            </div>

            <div className="flex h-40 items-center justify-center overflow-hidden border border-console-border bg-black/50">
              {documentPreview ? (
                <img src={documentPreview} alt="Document portrait" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-console-muted text-center px-4">
                  <UserRound className="h-8 w-8" />
                  <span className="text-[10px] uppercase tracking-[0.15em]">No document image</span>
                </div>
              )}
            </div>
          </div>

          <div className="border border-console-border bg-console-raised/40 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-console-muted font-mono">
              <Camera className="h-3.5 w-3.5 text-console-accent" />
              <span>Live face sample</span>
            </div>

            <div className="flex h-40 items-center justify-center overflow-hidden border border-console-border bg-black/50">
              {selfiePreview ? (
                <img src={selfiePreview} alt="Selfie preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-console-muted text-center px-4">
                  <Camera className="h-8 w-8" />
                  <span className="text-[10px] uppercase tracking-[0.15em]">Upload selfie</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={UploadCloud}
            onClick={() => inputRef.current?.click()}
          >
            Upload selfie
          </Button>
          {onUseSample && (
            <Button type="button" variant="outline" size="sm" icon={Sparkles} onClick={onUseSample}>
              Load sample face
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="border border-console-border bg-console-panel p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-console-muted">
            <span>Biometric similarity</span>
            <span className="text-console-text font-bold text-sm">{similarity.toFixed(1)}%</span>
          </div>

          <div className="h-2 w-full bg-slate-800 overflow-hidden border border-console-border">
            <div
              className={`h-full ${status === 'MISMATCH' ? 'bg-rose-500' : status === 'REVIEW' ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, Math.max(0, similarity))}%` }}
            />
          </div>

          <div className="flex items-start gap-2 text-[11px] text-console-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
            <p>
              {status === 'MATCH'
                ? `Face geometry, eye spacing, and skin tone alignment are within the acceptance threshold for ${travelerName}.`
                : status === 'REVIEW'
                  ? 'Face similarity is close to threshold but should be reviewed by an officer before final clearance.'
                  : 'Face mismatch detected. A secondary manual review is recommended before issuing a decision.'}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}

export default FaceVerificationPanel
