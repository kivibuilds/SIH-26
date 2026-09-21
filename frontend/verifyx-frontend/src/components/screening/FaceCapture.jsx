import { useEffect, useRef, useState } from 'react'
import { Camera, Square, Smartphone } from 'lucide-react'
import Button from '../ui/Button'

export default function FaceCapture({ file, onCapture, onClear }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [isLive, setIsLive] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => () => stopCamera(), [])

  const startCamera = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Live camera access requires HTTPS or localhost.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setIsLive(true)
    } catch (cameraError) {
      setError(cameraError.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'Unable to open the phone camera.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsLive(false)
  }

  const captureFrame = () => {
    const video = videoRef.current
    if (!video?.videoWidth) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      onCapture(new File([blob], `phone-selfie-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      stopCamera()
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden border border-console-border bg-black">
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${isLive ? '' : 'hidden'}`} />
        {!isLive && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-console-muted">
            <Smartphone className="h-6 w-6" />
            <span className="text-[11px]">Live phone preview is off</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isLive ? (
          <Button type="button" variant="primary" size="sm" icon={Camera} onClick={startCamera}>
            Start Live Camera
          </Button>
        ) : (
          <>
            <Button type="button" variant="primary" size="sm" icon={Camera} onClick={captureFrame}>
              Capture Face
            </Button>
            <Button type="button" variant="outline" size="sm" icon={Square} onClick={stopCamera}>
              Stop Camera
            </Button>
          </>
        )}
        {file && (
          <button type="button" className="text-[11px] text-console-muted underline" onClick={onClear}>
            Remove capture
          </button>
        )}
      </div>

      {file && <p className="text-[11px] text-emerald-400">Captured: {file.name}</p>}
      {error && <p className="text-[11px] text-rose-300">{error}</p>}
    </div>
  )
}
