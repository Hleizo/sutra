import React, { useEffect, useRef, useState } from 'react'
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { Box, Button, Paper, Typography, Alert } from '@mui/material'

/**
 * ULTIMATE SIMPLE TEST - Just show skeleton, that's it
 */
export default function UltimatePoseTest() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [status, setStatus] = useState('Ready')
  const [isRunning, setIsRunning] = useState(false)

  const start = async () => {
    try {
      setStatus('Loading model...')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      )
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
      setStatus('Model loaded! Starting camera...')

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setStatus('Camera started! Processing...')
        setIsRunning(true)
        
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth || 640
          canvasRef.current.height = videoRef.current.videoHeight || 480
        }
        
        const processFrame = () => {
          const video = videoRef.current
          const canvas = canvasRef.current
          const landmarker = poseLandmarkerRef.current
          
          if (!video || !canvas || !landmarker) return

          const result = landmarker.detectForVideo(video, performance.now())
          const ctx = canvas.getContext('2d')
          
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            
            if (result.landmarks && result.landmarks[0]) {
              const landmarks = result.landmarks[0]
              
              // Draw green dots
              ctx.fillStyle = '#00ff00'
              for (const lm of landmarks) {
                if (lm && lm.visibility > 0.3) {
                  ctx.beginPath()
                  ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI)
                  ctx.fill()
                }
              }
              
              // Draw connections
              ctx.strokeStyle = '#00ff00'
              ctx.lineWidth = 2
              const draw = (i1: number, i2: number) => {
                const lm1 = landmarks[i1]
                const lm2 = landmarks[i2]
                if (lm1 && lm2 && lm1.visibility > 0.3 && lm2.visibility > 0.3) {
                  ctx.beginPath()
                  ctx.moveTo(lm1.x * canvas.width, lm1.y * canvas.height)
                  ctx.lineTo(lm2.x * canvas.width, lm2.y * canvas.height)
                  ctx.stroke()
                }
              }
              
              draw(11, 12); draw(11, 23); draw(12, 24); draw(23, 24)
              draw(11, 13); draw(13, 15); draw(12, 14); draw(14, 16)
              draw(23, 25); draw(25, 27); draw(24, 26); draw(26, 28)
              
              setStatus(`✅ Pose detected! (${landmarks.filter(l => l && l.visibility > 0.3).length} visible joints)`)
            }
          }
          
          animationFrameRef.current = requestAnimationFrame(processFrame)
        }
        
        processFrame()
      }
    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`)
    }
  }

  const stop = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
    }
    setIsRunning(false)
    setStatus('Stopped')
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom>🚀 Ultimate Pose Test</Typography>
        <Typography sx={{ mb: 2, fontSize: '1.1rem', fontWeight: 'bold' }}>{status}</Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant="contained" onClick={start} disabled={isRunning}>
            START
          </Button>
          <Button variant="outlined" onClick={stop} disabled={!isRunning}>
            STOP
          </Button>
        </Box>
      </Paper>

      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          style={{ width: 640, maxWidth: '100%', background: '#000', display: 'block', transform: 'scaleX(-1)' }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: 'scaleX(-1)' }}
        />
      </Box>
    </Box>
  )
}
