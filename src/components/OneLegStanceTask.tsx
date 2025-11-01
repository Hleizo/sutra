import React, { useRef, useState } from 'react'
import { PoseLandmarker, FilesetResolver, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import { Box, Button, Paper, Typography, Alert, Chip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import * as api from '../services/api'

const TASK_DURATION = 10 // seconds
const ANKLE_HEIGHT_THRESHOLD = 0.01 // 1% of frame height

const LANDMARKS = {
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
}

type TaskStatus = 'idle' | 'ready' | 'detecting' | 'success' | 'failed'

export default function OneLegStanceTask() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const taskStartTimeRef = useRef<number | null>(null)
  const recordedFramesRef = useRef<api.PoseFrame[]>([])
  const sessionIdRef = useRef<number | null>(null)

  const [status, setStatus] = useState('Click Start Camera')
  const [isRunning, setIsRunning] = useState(false)
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('idle')
  const [timeRemaining, setTimeRemaining] = useState(TASK_DURATION)
  const [sessionResults, setSessionResults] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

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
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setStatus('✅ Camera active - Click "Begin Task" to start')
        setIsRunning(true)
        
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth || 640
          canvasRef.current.height = videoRef.current.videoHeight || 480
        }
        
        const detectOneLegStance = (landmarks: any[]): boolean => {
          const leftAnkle = landmarks[LANDMARKS.LEFT_ANKLE]
          const rightAnkle = landmarks[LANDMARKS.RIGHT_ANKLE]
          const leftHip = landmarks[LANDMARKS.LEFT_HIP]
          const rightHip = landmarks[LANDMARKS.RIGHT_HIP]

          if (!leftAnkle || !rightAnkle || !leftHip || !rightHip ||
              leftAnkle.visibility < 0.1 || rightAnkle.visibility < 0.1 ||
              leftHip.visibility < 0.1 || rightHip.visibility < 0.1) {
            return false
          }

          const avgHipY = (leftHip.y + rightHip.y) / 2
          const leftAnkleHeight = avgHipY - leftAnkle.y
          const rightAnkleHeight = avgHipY - rightAnkle.y
          const heightDiff = Math.abs(leftAnkleHeight - rightAnkleHeight)

          return heightDiff > ANKLE_HEIGHT_THRESHOLD
        }

        const sendToBackend = async () => {
          setIsProcessing(true)
          try {
            const session = await api.createSession('one_leg_stance')
            sessionIdRef.current = session.id

            await api.processPoseData(session.id, recordedFramesRef.current, TASK_DURATION)
            const fullResults = await api.getSessionResults(session.id)
            setSessionResults(fullResults)
          } catch (err: any) {
            console.error('Backend error:', err)
          } finally {
            setIsProcessing(false)
          }
        }
        
        const processFrame = () => {
          const video = videoRef.current
          const canvas = canvasRef.current
          const landmarker = poseLandmarkerRef.current
          
          if (!video || !canvas || !landmarker || !isRunning) return

          const result = landmarker.detectForVideo(video, performance.now())
          const ctx = canvas.getContext('2d')
          
          if (ctx && result.landmarks && result.landmarks[0]) {
            const landmarks = result.landmarks[0]
            
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            
            // Draw green skeleton
            ctx.fillStyle = '#00ff00'
            for (const lm of landmarks) {
              if (lm && lm.visibility > 0.3) {
                ctx.beginPath()
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI)
                ctx.fill()
              }
            }
            
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
            
            // Check for one-leg stance if in ready mode
            if (taskStatus === 'ready') {
              if (detectOneLegStance(landmarks)) {
                console.log('🎯 ONE LEG STANCE DETECTED!')
                setTaskStatus('detecting')
                taskStartTimeRef.current = Date.now()
                recordedFramesRef.current = []
                
                // Start countdown
                timerIntervalRef.current = window.setInterval(() => {
                  if (!taskStartTimeRef.current) return
                  const elapsed = (Date.now() - taskStartTimeRef.current) / 1000
                  const remaining = Math.max(0, TASK_DURATION - elapsed)
                  setTimeRemaining(Math.ceil(remaining))

                  if (remaining <= 0) {
                    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
                    setTaskStatus('success')
                    sendToBackend()
                  }
                }, 100)
              }
            } else if (taskStatus === 'detecting') {
              // Record frames
              recordedFramesRef.current.push({
                frame_number: recordedFramesRef.current.length,
                timestamp: (Date.now() - taskStartTimeRef.current!) / 1000,
                landmarks: landmarks.map(lm => ({
                  x: lm.x,
                  y: lm.y,
                  z: lm.z || 0,
                  visibility: lm.visibility || 1.0
                }))
              })
              
              // Check if still in stance
              if (!detectOneLegStance(landmarks)) {
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
                setTaskStatus('failed')
              }
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

  const downloadPDF = async () => {
    if (!sessionIdRef.current) return
    try {
      const blob = await api.downloadReport(sessionIdRef.current, false)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `session_${sessionIdRef.current}_report.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Download error:', err)
    }
  }

  const stop = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
    }
    setIsRunning(false)
    setTaskStatus('idle')
    setStatus('Stopped')
  }

  const beginTask = () => {
    setTaskStatus('ready')
    setTimeRemaining(TASK_DURATION)
    taskStartTimeRef.current = null
    setStatus('🦵 Lift one foot off the ground to start timer!')
  }

  const resetTask = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    setTaskStatus('idle')
    setTimeRemaining(TASK_DURATION)
    taskStartTimeRef.current = null
    recordedFramesRef.current = []
    setSessionResults(null)
    sessionIdRef.current = null
    setStatus('✅ Camera active - Click "Begin Task" to start')
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom>One-Leg Stance Task</Typography>
        <Typography sx={{ mb: 2, fontSize: '1.1rem', fontWeight: 'bold' }}>{status}</Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          {!isRunning ? (
            <Button variant="contained" onClick={start}>Start Camera</Button>
          ) : (
            <>
              {taskStatus === 'idle' && (
                <Button variant="contained" color="primary" onClick={beginTask}>Begin Task</Button>
              )}
              {(taskStatus === 'success' || taskStatus === 'failed') && (
                <Button variant="contained" onClick={resetTask}>Try Again</Button>
              )}
              {taskStatus === 'ready' && (
                <Button variant="outlined" onClick={resetTask}>Cancel</Button>
              )}
              <Button variant="outlined" onClick={stop}>Stop Camera</Button>
            </>
          )}
        </Box>
      </Paper>

      {taskStatus === 'ready' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          ⬆️ LIFT ONE FOOT OFF THE GROUND - Timer will start automatically!
        </Alert>
      )}

      {taskStatus === 'detecting' && (
        <Paper elevation={3} sx={{ p: 3, mb: 2, bgcolor: '#e3f2fd' }}>
          <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2', textAlign: 'center' }}>
            {timeRemaining}s
          </Typography>
          <Typography variant="h6" sx={{ textAlign: 'center' }}>Hold the position!</Typography>
        </Paper>
      )}

      {taskStatus === 'success' && (
        <Paper elevation={3} sx={{ p: 3, mb: 2, bgcolor: '#e8f5e9' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: '#4caf50' }} />
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#2e7d32' }}>Success!</Typography>
            <Typography>You completed the one-leg stance for 10 seconds!</Typography>
            {isProcessing && <Typography sx={{ mt: 2 }}>Analyzing...</Typography>}
          </Box>
        </Paper>
      )}

      {taskStatus === 'failed' && (
        <Paper elevation={3} sx={{ p: 3, mb: 2, bgcolor: '#ffebee' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CancelIcon sx={{ fontSize: 80, color: '#f44336' }} />
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#c62828' }}>Task Failed</Typography>
            <Typography>You lost balance. Try again!</Typography>
          </Box>
        </Paper>
      )}

      {sessionResults && (
        <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Assessment Results</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="body2">Risk Score</Typography>
              <Typography variant="h5">{sessionResults.risk_score?.toFixed(0) || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="body2">Risk Level</Typography>
              <Chip label={sessionResults.risk_level || 'Unknown'} color="primary" />
            </Box>
          </Box>
          <Button variant="contained" onClick={downloadPDF} fullWidth>Download PDF Report</Button>
        </Paper>
      )}

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
