import React, { useEffect, useRef, useState } from 'react'
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { Box, Button, Paper, Typography, Alert } from '@mui/material'

/**
 * Minimal pose detection test - helps diagnose if MediaPipe is working at all
 */
export default function PoseTest() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [log, setLog] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [poseCount, setPoseCount] = useState(0)

  const addLog = (message: string) => {
    console.log(message)
    setLog(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const initModel = async () => {
    try {
      addLog('🔄 Loading MediaPipe Vision tasks...')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      )
      addLog('✅ Vision tasks loaded')

      addLog('🔄 Creating PoseLandmarker...')
      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      poseLandmarkerRef.current = poseLandmarker
      addLog('✅ PoseLandmarker ready!')
      return true
    } catch (err: any) {
      addLog(`❌ Model error: ${err.message}`)
      return false
    }
  }

  const startCamera = async () => {
    try {
      addLog('🔄 Requesting camera...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false
      })
      addLog('✅ Camera granted')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        addLog('✅ Video playing')

        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth || 640
          canvasRef.current.height = videoRef.current.videoHeight || 480
          addLog(`✅ Canvas: ${canvasRef.current.width}x${canvasRef.current.height}`)
        }

        return true
      }
    } catch (err: any) {
      addLog(`❌ Camera error: ${err.message}`)
      return false
    }
  }

  const processFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const poseLandmarker = poseLandmarkerRef.current

    if (!video || !canvas || !poseLandmarker || !isRunning) {
      return
    }

    try {
      const result = poseLandmarker.detectForVideo(video, performance.now())
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (result.landmarks && result.landmarks.length > 0) {
          setPoseCount(prev => prev + 1)
          
          // Draw all landmarks as green dots
          const landmarks = result.landmarks[0]
          ctx.fillStyle = '#00ff00'
          for (const lm of landmarks) {
            const x = lm.x * canvas.width
            const y = lm.y * canvas.height
            ctx.beginPath()
            ctx.arc(x, y, 5, 0, 2 * Math.PI)
            ctx.fill()
          }

          // Draw connections
          ctx.strokeStyle = '#00ff00'
          ctx.lineWidth = 2
          const drawLine = (i1: number, i2: number) => {
            const lm1 = landmarks[i1]
            const lm2 = landmarks[i2]
            if (lm1 && lm2) {
              ctx.beginPath()
              ctx.moveTo(lm1.x * canvas.width, lm1.y * canvas.height)
              ctx.lineTo(lm2.x * canvas.width, lm2.y * canvas.height)
              ctx.stroke()
            }
          }

          // Body
          drawLine(11, 12) // shoulders
          drawLine(11, 23) // left torso
          drawLine(12, 24) // right torso
          drawLine(23, 24) // hips
          
          // Arms
          drawLine(11, 13) // left upper arm
          drawLine(13, 15) // left lower arm
          drawLine(12, 14) // right upper arm
          drawLine(14, 16) // right lower arm
          
          // Legs
          drawLine(23, 25) // left upper leg
          drawLine(25, 27) // left lower leg
          drawLine(24, 26) // right upper leg
          drawLine(26, 28) // right lower leg
        }
      }
    } catch (err) {
      console.warn('Frame error:', err)
    }

    animationFrameRef.current = requestAnimationFrame(processFrame)
  }

  const start = async () => {
    setLog([])
    setPoseCount(0)
    addLog('🚀 Starting test...')
    
    const modelOk = await initModel()
    if (!modelOk) return

    const cameraOk = await startCamera()
    if (!cameraOk) return

    setIsRunning(true)
    addLog('🎬 Detection loop started')
  }

  useEffect(() => {
    if (isRunning) {
      animationFrameRef.current = requestAnimationFrame(processFrame)
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isRunning])

  const stop = () => {
    setIsRunning(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    addLog('⏹️ Stopped')
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>🧪 MediaPipe Pose Test</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          This minimal test checks if MediaPipe can detect your pose at all.
        </Typography>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={start} disabled={isRunning}>
            Start Test
          </Button>
          <Button variant="outlined" onClick={stop} disabled={!isRunning}>
            Stop
          </Button>
        </Box>

        {poseCount > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            ✅ Pose detected! Frames with pose: {poseCount}
          </Alert>
        )}
      </Paper>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom>📋 Log</Typography>
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem', maxHeight: 400, overflow: 'auto' }}>
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </Box>
          </Paper>
        </Box>

        <Box sx={{ position: 'relative' }}>
          <video
            ref={videoRef}
            style={{
              width: 640,
              maxWidth: '100%',
              background: '#000',
              display: 'block',
              transform: 'scaleX(-1)'
            }}
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
              transform: 'scaleX(-1)'
            }}
          />
        </Box>
      </Box>
    </Box>
  )
}
