import { useState, useRef } from 'react'
import {
  UploadCloud,
  X,
  AlertCircle,
  FileCheck,
  Sparkles,
} from 'lucide-react'
import Button from '../ui/Button'

export function UploadDropzone({
  file,
  onFileSelect,
  onFileRemove,
  onSelectSample,
  loading = false,
  error = null,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  const MAX_SIZE_BYTES = 15 * 1024 * 1024 // 15MB

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
  }

  const processFile = (selectedFile) => {
    if (!ALLOWED_TYPES.includes(selectedFile.type) && !selectedFile.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) {
      onFileSelect(null, 'Unsupported file format. Please provide a JPG, PNG, or PDF document scan.')
      return
    }

    if (selectedFile.size > MAX_SIZE_BYTES) {
      onFileSelect(null, 'File size exceeds maximum limit of 15MB.')
      return
    }

    onFileSelect(selectedFile, null)
  }

  const samples = [
    { label: 'Sample 1: Clear Passport (Alex Rivera)', docType: 'Passport', ref: 'TRV-88219', name: 'Alex Rivera' },
    { label: 'Sample 2: Review Visa (Jordan Blake)', docType: 'Visa', ref: 'TRV-74012', name: 'Jordan Blake' },
    { label: 'Sample 3: High Risk Passport (Morgan Lee)', docType: 'Passport', ref: 'TRV-99304', name: 'Morgan Lee' },
  ]

  return (
    <div className="space-y-4">
      {/* Main Drop Area */}
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center border-2 border-dashed p-8 text-center transition-colors cursor-pointer select-none ${
            isDragging
              ? 'border-console-accent bg-console-accent/10'
              : 'border-console-border hover:border-console-accent/60 bg-console-panel/60 hover:bg-console-raised/40'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="flex h-12 w-12 items-center justify-center border border-console-border bg-console-raised text-console-muted group-hover:text-console-accent group-hover:border-console-accent/40 transition-colors mb-3">
            <UploadCloud className="h-6 w-6" />
          </div>

          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-console-text">
            Drop document scan here or click to browse
          </p>
          <p className="mt-1 text-[11px] text-console-muted">
            Supports high-resolution JPG, PNG, or PDF document scans (max 15MB)
          </p>

          <div className="mt-3 flex items-center gap-2 text-[10px] text-console-muted/80 font-mono">
            <span>• ICAO DOC 9303</span>
            <span>• MRZ READABLE</span>
            <span>• SYNTHETIC DATA ONLY</span>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="border border-console-border bg-console-raised p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center border border-emerald-800/80 bg-emerald-950/40 text-emerald-400 shrink-0">
              <FileCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-console-text truncate">
                {file.name}
              </span>
              <span className="font-mono text-[10px] text-console-muted">
                {(file.size / 1024).toFixed(1)} KB • {file.type || 'Document Scan'}
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            icon={X}
            onClick={onFileRemove}
            disabled={loading}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
          >
            Remove
          </Button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 border border-rose-800/80 bg-rose-950/40 p-2.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Synthetic Demo Presets */}
      {onSelectSample && !file && (
        <div className="border border-console-border bg-console-panel/40 p-3">
          <div className="flex items-center gap-2 mb-2 text-[11px] font-mono uppercase tracking-wider text-console-accent">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Load Synthetic Prototype Sample:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {samples.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectSample(s)}
                className="text-left px-2.5 py-2 border border-console-border bg-console-raised hover:border-console-accent/60 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
              >
                <p className="font-semibold text-console-text truncate">{s.docType} ({s.name})</p>
                <p className="font-mono text-[10px] text-console-muted">{s.ref}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadDropzone
