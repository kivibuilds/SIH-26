import { useState, useEffect } from 'react'
import { Scan } from 'lucide-react'

export function DocumentPreview({
  file,
  screening,
  showControls = true,
  className = '',
}) {
  const [activeLayer, setActiveLayer] = useState('raw') // 'raw' | 'ocr' | 'forensics'
  const [objectUrl, setObjectUrl] = useState(null)

  useEffect(() => {
    if (file && file instanceof File && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setObjectUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setObjectUrl(null)
    }
  }, [file])

  const docType = screening?.documentType || 'Passport'
  const documentUrl = objectUrl || screening?.documentUrl
  const docNumber = screening?.documentNumber || 'X1234567'
  const travelerName = screening?.travelerName || 'Alex Rivera'
  const nationality = screening?.nationality || 'UTO (Utopia)'
  const findFieldValue = (term, fallback) => {
    const field = screening?.extractedFields?.find((item) => {
      const fieldName = item.key || item.label || ''
      return fieldName.toLowerCase().includes(term.toLowerCase())
    })
    return field?.value || fallback
  }
  const dob = findFieldValue('birth', '1991-08-14')
  const expiry = findFieldValue('expiry', '2031-05-09')
  const isHighRisk = screening?.decision === 'high_risk'
  const isReview = screening?.decision === 'review'

  return (
    <div className={`border border-console-border bg-console-panel flex flex-col ${className}`}>
      {/* Header / Layer Controls */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between border-b border-console-border px-3.5 py-2.5 bg-console-raised/60 text-xs">
          <div className="flex items-center gap-2">
            <Scan className="h-3.5 w-3.5 text-console-accent" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-console-text">
              Document Scan Inspector
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setActiveLayer('raw')}
              className={`px-2 py-1 border transition-colors cursor-pointer ${
                activeLayer === 'raw'
                  ? 'border-console-accent bg-console-accent/20 text-console-accent font-semibold'
                  : 'border-console-border text-console-muted hover:text-console-text'
              }`}
            >
              RAW SCAN
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('ocr')}
              className={`px-2 py-1 border transition-colors cursor-pointer ${
                activeLayer === 'ocr'
                  ? 'border-blue-500 bg-blue-950/60 text-blue-300 font-semibold'
                  : 'border-console-border text-console-muted hover:text-console-text'
              }`}
            >
              OCR ZONES
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('forensics')}
              className={`px-2 py-1 border transition-colors cursor-pointer ${
                activeLayer === 'forensics'
                  ? 'border-amber-500 bg-amber-950/60 text-amber-300 font-semibold'
                  : 'border-console-border text-console-muted hover:text-console-text'
              }`}
            >
              FORENSIC ELA
            </button>
          </div>
        </div>
      )}

      {/* Document Canvas Container */}
      <div className="relative flex-1 min-h-[300px] p-4 flex items-center justify-center bg-black/50 overflow-hidden select-none">
        {documentUrl ? (
          <div className="relative max-h-[420px] max-w-full">
            <img
              src={documentUrl}
              alt="Uploaded document scan"
              className="max-h-[400px] w-auto border border-console-border object-contain shadow-lg"
            />
            {activeLayer === 'ocr' && (
              <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 pointer-events-none flex items-center justify-center">
                <span className="bg-slate-900/90 text-blue-300 font-mono text-xs px-2 py-1 border border-blue-400">
                  OCR Text Fields Identified
                </span>
              </div>
            )}
            {activeLayer === 'forensics' && (
              <div className="absolute inset-0 bg-amber-500/10 border border-amber-400/80 pointer-events-none mix-blend-color-dodge flex items-center justify-center">
                <span className="bg-slate-900/90 text-amber-300 font-mono text-xs px-2 py-1 border border-amber-400">
                  Forensic ELA Check
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Synthetic Document Visualizer */
          <div className="relative w-full max-w-md border-2 border-slate-700 bg-slate-900 shadow-2xl p-4 font-mono text-slate-300 overflow-hidden">
            {/* Background Guilloche pattern overlay simulation */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(#c9a227 1px, transparent 1px), radial-gradient(#3d4756 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 8px 8px',
              }}
            />

            {/* Document Header */}
            <div className="relative flex items-center justify-between border-b border-slate-700 pb-2 mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/90 font-bold">
                  UTOPIA • SYNTHETIC TEMPLATE
                </p>
                <p className="text-[9px] uppercase tracking-wider text-slate-400">
                  {docType.toUpperCase()} / SAMPLE SPECIMEN
                </p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                CODE: UTO
              </span>
            </div>

            {/* Document Body: Photo + VIZ Fields */}
            <div className="relative grid grid-cols-3 gap-3 mb-3">
              {/* Synthetic Photo Box */}
              <div className="col-span-1 border border-slate-600 bg-slate-950 p-1 flex flex-col items-center justify-center min-h-[110px] relative">
                <div className="w-16 h-18 bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-[10px] relative overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-slate-700 mb-2 mt-2" />
                  <div className="absolute bottom-0 w-12 h-6 bg-slate-700 rounded-t-lg" />
                  {isHighRisk && activeLayer === 'forensics' && (
                    <div className="absolute inset-0 bg-rose-600/30 border-2 border-rose-500 flex items-center justify-center">
                      <span className="text-[8px] bg-rose-950 text-rose-300 px-1 font-bold">
                        MISMATCH
                      </span>
                    </div>
                  )}
                </div>
                <span className="mt-1 text-[8px] text-slate-400">SYNTHETIC PHOTO</span>
              </div>

              {/* Visible Fields */}
              <div className="col-span-2 space-y-1 text-[10px]">
                <div className={activeLayer === 'ocr' ? 'bg-blue-950/40 p-0.5 border border-blue-800/60' : ''}>
                  <span className="text-[8px] uppercase text-slate-400 block">Surname / Given Names</span>
                  <span className="font-bold text-slate-100">{travelerName}</span>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <div className={activeLayer === 'ocr' ? 'bg-blue-950/40 p-0.5 border border-blue-800/60' : ''}>
                    <span className="text-[8px] uppercase text-slate-400 block">Nationality</span>
                    <span className="font-semibold text-slate-200">{nationality}</span>
                  </div>
                  <div className={`p-0.5 ${isHighRisk && activeLayer !== 'raw' ? 'bg-rose-950/70 border border-rose-600 text-rose-300' : activeLayer === 'ocr' ? 'bg-blue-950/40 border border-blue-800/60' : ''}`}>
                    <span className="text-[8px] uppercase text-slate-400 block">Date of Birth</span>
                    <span className="font-bold text-slate-100">{dob}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <div className={activeLayer === 'ocr' ? 'bg-blue-950/40 p-0.5 border border-blue-800/60' : ''}>
                    <span className="text-[8px] uppercase text-slate-400 block">Document No.</span>
                    <span className="font-bold text-amber-300">{docNumber}</span>
                  </div>
                  <div className={`p-0.5 ${isReview && activeLayer !== 'raw' ? 'bg-amber-950/70 border border-amber-600 text-amber-300' : activeLayer === 'ocr' ? 'bg-blue-950/40 border border-blue-800/60' : ''}`}>
                    <span className="text-[8px] uppercase text-slate-400 block">Expiry Date</span>
                    <span className="font-bold text-slate-100">{expiry}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MRZ Strip */}
            <div className={`border-t-2 border-dashed border-slate-700 pt-2 font-mono text-[10px] tracking-widest leading-relaxed bg-black/60 p-1.5 ${
              activeLayer === 'ocr' ? 'border-blue-500 bg-blue-950/40' : activeLayer === 'forensics' && isHighRisk ? 'border-rose-500 bg-rose-950/40' : ''
            }`}>
              <p className="text-slate-300 break-all">
                P&lt;UTO{travelerName.replace(/\s+/g, '&lt;&lt;').toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
              </p>
              <p className="text-slate-300 break-all">
                {docNumber}&lt;1UTO{dob.replace(/-/g, '').slice(2)}4M{expiry.replace(/-/g, '').slice(2)}8&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;02
              </p>
            </div>

            {/* Forensic Heatmap Layer */}
            {activeLayer === 'forensics' && (
              <div className="absolute inset-0 bg-amber-500/10 mix-blend-screen pointer-events-none flex flex-col justify-between p-2">
                <div className="flex justify-between items-center text-[9px] bg-slate-950/90 text-amber-300 px-2 py-0.5 border border-amber-500/50">
                  <span>FORENSIC ANOMALY CHECK</span>
                  <span>{isHighRisk ? 'POSSIBLE ANOMALY DETECTED (87%)' : 'NORMAL (2%)'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer annotation */}
      <div className="border-t border-console-border px-3.5 py-2 bg-console-raised/30 flex items-center justify-between text-[10px] text-console-muted font-mono">
        <span>DEMO SPECIMEN</span>
        <span>SYNTHETIC TEMPLATE</span>
      </div>
    </div>
  )
}

export default DocumentPreview
