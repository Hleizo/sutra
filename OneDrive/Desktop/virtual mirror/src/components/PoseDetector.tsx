import React, { useEffect, useRef, useState, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver, PoseLandmarkerResult, DrawingUtils } from '@mediapipe/tasks-vision'

type PoseDetectorProps = {
  /** frames per second to process pose detection (default 30) */
  processFps?: number
  /** prefer 'user' (front) or 'environment' (back) camera */
  facingMode?: 'user' | 'environment'
}

// MediaPipe Pose landmark indices for key joints
const LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
}

// Color palette for different joint types
const COLORS = {
  shoulder: '#FF6B6B', // red
  elbow: '#4ECDC4',    // teal
  wrist: '#45B7D1',    // blue
  hip: '#FFA07A',      // light salmon
  knee: '#98D8C8',     // mint
  ankle: '#F7DC6F',    // yellow
}

export default function PoseDetector({ processFps = 30, facingMode = 'user' }: PoseDetectorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastProcessTimeRef = useRef<number>(0)

  const [isStreaming, setIsStreaming] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fps, setFps] = useState<number>(0)

  // Initialize MediaPipe Pose Landmarker
  const initializePoseLandmarker = useCallback(async () => {
    if (poseLandmarkerRef.current) return

    try {
      setIsModelLoading(true)
      setError(null)

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      )

      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      poseLandmarkerRef.current = poseLandmarker
      setIsModelLoading(false)
    } catch (err: any) {
      console.error('Failed to initialize PoseLandmarker:', err)
      setError(`Failed to load pose detection model: ${err?.message || err}`)
      setIsModelLoading(false)
    }
  }, [])

  // Draw skeleton overlay
  const drawPoseLandmarks = useCallback((result: PoseLandmarkerResult, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx || !result.landmarks || result.landmarks.length === 0) return

    const landmarks = result.landmarks[0]
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Helper to draw a landmark point
    const drawLandmark = (index: number, color: string, radius = 8) => {
      const landmark = landmarks[index]
      if (!landmark || landmark.visibility < 0.5) return

      const x = landmark.x * canvasWidth
      const y = landmark.y * canvasHeight

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fill()

      // Add white border for better visibility
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Helper to draw a connection line
    const drawConnection = (index1: number, index2: number, color: string, lineWidth = 4) => {
      const landmark1 = landmarks[index1]
      const landmark2 = landmarks[index2]
      if (!landmark1 || !landmark2 || landmark1.visibility < 0.5 || landmark2.visibility < 0.5) return

      const x1 = landmark1.x * canvasWidth
      const y1 = landmark1.y * canvasHeight
      const x2 = landmark2.x * canvasWidth
      const y2 = landmark2.y * canvasHeight

      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    // Draw connections (skeleton lines)
    // Torso
    drawConnection(LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER, COLORS.shoulder, 5)
    drawConnection(LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, COLORS.hip, 4)
    drawConnection(LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, COLORS.hip, 4)
    drawConnection(LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP, COLORS.hip, 5)

    // Left arm
    drawConnection(LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW, COLORS.elbow, 4)
    drawConnection(LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST, COLORS.wrist, 4)

    // Right arm
    drawConnection(LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW, COLORS.elbow, 4)
    drawConnection(LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST, COLORS.wrist, 4)

    // Left leg
    drawConnection(LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, COLORS.knee, 4)
    drawConnection(LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, COLORS.ankle, 4)

    // Right leg
    drawConnection(LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, COLORS.knee, 4)
    drawConnection(LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE, COLORS.ankle, 4)

    // Draw key joint points with color coding
    drawLandmark(LANDMARKS.LEFT_SHOULDER, COLORS.shoulder, 10)
    drawLandmark(LANDMARKS.RIGHT_SHOULDER, COLORS.shoulder, 10)
    drawLandmark(LANDMARKS.LEFT_ELBOW, COLORS.elbow, 8)
    drawLandmark(LANDMARKS.RIGHT_ELBOW, COLORS.elbow, 8)
    drawLandmark(LANDMARKS.LEFT_WRIST, COLORS.wrist, 7)
    drawLandmark(LANDMARKS.RIGHT_WRIST, COLORS.wrist, 7)
    drawLandmark(LANDMARKS.LEFT_HIP, COLORS.hip, 9)
    drawLandmark(LANDMARKS.RIGHT_HIP, COLORS.hip, 9)
    drawLandmark(LANDMARKS.LEFT_KNEE, COLORS.knee, 8)
    drawLandmark(LANDMARKS.RIGHT_KNEE, COLORS.knee, 8)
    drawLandmark(LANDMARKS.LEFT_ANKLE, COLORS.ankle, 7)
    drawLandmark(LANDMARKS.RIGHT_ANKLE, COLORS.ankle, 7)
  }, [])

  // Process video frame
  const processFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const poseLandmarker = poseLandmarkerRef.current

    if (!video || !canvas || !poseLandmarker || !isStreaming) {
      return
    }

    const now = performance.now()
    const intervalMs = 1000 / processFps
    const elapsed = now - lastProcessTimeRef.current

    if (elapsed < intervalMs) {
      // Not time yet, schedule next frame
      animationFrameRef.current = requestAnimationFrame(processFrame)
      return
    }

    lastProcessTimeRef.current = now

    try {
      // Detect pose
      const result = poseLandmarker.detectForVideo(video, now)

      // Draw skeleton overlay
      if (result) {
        drawPoseLandmarks(result, canvas)
      }

      // Update FPS counter
      setFps(Math.round(1000 / elapsed))
    } catch (err) {
      console.warn('processFrame error:', err)
    }

    // Continue processing
    animationFrameRef.current = requestAnimationFrame(processFrame)
  }, [isStreaming, processFps, drawPoseLandmarks])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
    setFps(0)
  }, [])

  // Start camera
  const startCamera = useCallback(async () => {
    setError(null)
    stopCamera()

    // Ensure model is loaded
    await initializePoseLandmarker()

    if (!poseLandmarkerRef.current) {
      setError('Pose detection model failed to load.')
      return
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('MediaDevices.getUserMedia is not supported in this browser.')
      return
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      videoRef.current.playsInline = true
      videoRef.current.muted = true

      await videoRef.current.play()

      // Set canvas size to match video
      const setCanvasSize = () => {
        const canvas = canvasRef.current
        const video = videoRef.current
        if (!canvas || !video) return
        const w = video.videoWidth || 640
        const h = video.videoHeight || 480
        canvas.width = w
        canvas.height = h
      }

      setCanvasSize()
      videoRef.current.addEventListener('loadedmetadata', setCanvasSize)

      setIsStreaming(true)
      lastProcessTimeRef.current = performance.now()

      // Start processing frames
      animationFrameRef.current = requestAnimationFrame(processFrame)
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
  }, [facingMode, stopCamera, initializePoseLandmarker, processFrame])

  // Initialize model on mount
  useEffect(() => {
    initializePoseLandmarker()
  }, [initializePoseLandmarker])

  // Stop on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error ? (
        <div role="alert" style={{ color: '#b00020', padding: 12, background: '#ffebee', borderRadius: 4 }}>
          <div style={{ fontWeight: 600 }}>{error}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={startCamera}>Retry</button>
          </div>
        </div>
      ) : null}

      {isModelLoading ? (
        <div style={{ padding: 12, background: '#e3f2fd', borderRadius: 4, color: '#1976d2' }}>
          Loading pose detection model...
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <video
            ref={videoRef}
            style={{ width: 640, maxWidth: '100%', background: '#000', borderRadius: 8, display: 'block' }}
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
            aria-label="Pose skeleton overlay"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {!isStreaming ? (
          <button
            onClick={startCamera}
            disabled={isModelLoading}
            style={{ padding: '8px 16px', fontSize: 14, cursor: isModelLoading ? 'not-allowed' : 'pointer' }}
          >
            Start Pose Detection
          </button>
        ) : (
          <button onClick={stopCamera} style={{ padding: '8px 16px', fontSize: 14 }}>
            Stop
          </button>
        )}
        <div style={{ fontSize: 14, color: '#666' }}>
          {isStreaming ? `Running at ${fps} FPS` : 'Stopped'}
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#666', padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Joint Color Legend:</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: COLORS.shoulder, borderRadius: '50%', display: 'inline-block' }}></span>
            Shoulder
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: COLORS.elbow, borderRadius: '50%', display: 'inline-block' }}></span>
            Elbow
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: COLORS.knee, borderRadius: '50%', display: 'inline-block' }}></span>
            Knee
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: COLORS.ankle, borderRadius: '50%', display: 'inline-block' }}></span>
            Ankle
          </span>
        </div>
      </div>
    </div>
  )
}
