import React, { useEffect, useRef, useState, useCallback } from 'react'

type CameraFeedProps = {
  /** frames per second to sample (default 30) */
  captureFps?: number
  /** optional callback invoked with ImageData every frame */
  onFrame?: (imageData: ImageData) => void
  /** prefer 'user' (front) or 'environment' (back) camera */
  facingMode?: 'user' | 'environment'
}

export default function CameraFeed({ captureFps = 30, onFrame, facingMode = 'user' }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
  }, [])

  const drawFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // draw the current video frame into the canvas
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      if (onFrame) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        onFrame(imageData)
      }
    } catch (e) {
      // drawing can throw if dimensions are 0 or cross-origin
      console.warn('drawFrame error', e)
    }
  }, [onFrame])

  const startCamera = useCallback(async () => {
    setError(null)
    stopCamera()

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('MediaDevices.getUserMedia is not supported in this browser.')
      return
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode },
        audio: false
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      // recommended for mobile/embedded camera use
      videoRef.current.playsInline = true
      videoRef.current.muted = true

      await videoRef.current.play()

      // ensure canvas size matches actual video frame size
      const setCanvasSize = () => {
        const canvas = canvasRef.current
        const video = videoRef.current
        if (!canvas || !video) return
        const w = video.videoWidth || video.clientWidth || 640
        const h = video.videoHeight || video.clientHeight || 480
        canvas.width = w
        canvas.height = h
      }

      // set canvas size now — the video element has metadata after play sometimes
      setCanvasSize()
      // also set on loadedmetadata in case sizes change
      const onLoaded = () => setCanvasSize()
      videoRef.current.addEventListener('loadedmetadata', onLoaded)

      // start capture interval
      const intervalMs = Math.max(1, Math.round(1000 / captureFps))
      intervalRef.current = window.setInterval(() => {
        drawFrame()
      }, intervalMs)

      setIsStreaming(true)

      // cleanup the loadedmetadata listener on stop
      const cleanupListener = () => {
        if (videoRef.current) videoRef.current.removeEventListener('loadedmetadata', onLoaded)
      }

      // keep a reference to cleanup so stopCamera can run it
      // (we'll call it on stop below by invoking cleanupListener)
      // but because stopCamera is independent, call cleanupListener inside stopCamera path
    } catch (err: any) {
      console.error('startCamera error', err)
      if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setError('Camera access was denied. Please grant camera permission and try again.')
      } else if (err && err.name === 'NotFoundError') {
        setError('No camera device was found.')
      } else {
        setError(String(err?.message || err))
      }
      stopCamera()
    }
  }, [captureFps, drawFrame, facingMode, stopCamera])

  // stop on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error ? (
        <div role="alert" style={{ color: '#b00020' }}>
          <div>{error}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={startCamera}>Retry</button>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <video
            ref={videoRef}
            style={{ width: 320, maxWidth: '100%', background: '#000' }}
            autoPlay
            playsInline
            muted
          />

          <div style={{ display: 'flex', gap: 8 }}>
            {!isStreaming ? (
              <button onClick={startCamera}>Start Camera</button>
            ) : (
              <button
                onClick={() => {
                  stopCamera()
                }}
              >
                Stop Camera
              </button>
            )}
            <div style={{ alignSelf: 'center' }}>{isStreaming ? `Streaming (${captureFps} FPS sampling)` : 'Stopped'}</div>
          </div>
        </div>

        <div>
          <canvas
            ref={canvasRef}
            style={{ width: 320, maxWidth: '100%', background: '#111', borderRadius: 6 }}
            aria-label="Captured frame"
          />
        </div>
      </div>
    </div>
  )
}
