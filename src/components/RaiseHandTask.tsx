import React, { useRef, useState } from 'react'
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { Box, Button, Paper, Typography, Alert, Chip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import * as api from '../services/api'

const TASK_DURATION = 10 // seconds

// MediaPipe Pose Landmarks
const LANDMARKS = {
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
}

type TaskStatus = 'idle' | 'ready' | 'detecting' | 'success' | 'failed'

export default function RaiseHandTask() {
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
  const [debugInfo, setDebugInfo] = useState({
    leftWristY: 0,
    rightWristY: 0,
    leftShoulderY: 0,
    rightShoulderY: 0,
    handRaised: false,
  })

  const start = async () => {
    try {
      setStatus('Loading model...')
      console.log('🔵 Starting RaiseHandTask...')
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      )
      console.log('✅ Vision tasks loaded')
      
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
      console.log('✅ PoseLandmarker created')
      
      setStatus('Model loaded! Starting camera...')

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      console.log('✅ Camera stream obtained')
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        console.log('✅ Video playing')
        
        setStatus('✅ Camera active - Click "Begin Task" to start')
        setIsRunning(true)
        
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth || 640
          canvasRef.current.height = videoRef.current.videoHeight || 480
          console.log(`✅ Canvas size: ${canvasRef.current.width}x${canvasRef.current.height}`)
        }
        
        // Detection function: Check if EITHER hand is raised above shoulder
        const detectHandRaised = (landmarks: any[]): boolean => {
          const leftWrist = landmarks[LANDMARKS.LEFT_WRIST]
          const rightWrist = landmarks[LANDMARKS.RIGHT_WRIST]
          const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER]
          const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]

          // Check visibility
          if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) {
            return false
          }
          
          if (leftWrist.visibility < 0.3 || rightWrist.visibility < 0.3 ||
              leftShoulder.visibility < 0.3 || rightShoulder.visibility < 0.3) {
            return false
          }

          // Y coordinate: smaller = higher on screen
          // Hand is raised if wrist Y < shoulder Y (wrist is above shoulder)
          const leftHandRaised = leftWrist.y < leftShoulder.y
          const rightHandRaised = rightWrist.y < rightShoulder.y
          
          const isRaised = leftHandRaised || rightHandRaised
          
          // Update debug info
          setDebugInfo({
            leftWristY: leftWrist.y,
            rightWristY: rightWrist.y,
            leftShoulderY: leftShoulder.y,
            rightShoulderY: rightShoulder.y,
            handRaised: isRaised,
          })
          
          return isRaised
        }

        // Send data to backend
        const sendToBackend = async () => {
          setIsProcessing(true)
          try {
            console.log('📤 Sending data to backend...')
            const session = await api.createSession('raise_hand')
            sessionIdRef.current = session.id
            console.log(`✅ Session created: ${session.id}`)

            await api.processPoseData(session.id, recordedFramesRef.current, TASK_DURATION)
            console.log('✅ Pose data processed')
            
            const fullResults = await api.getSessionResults(session.id)
            console.log('✅ Results retrieved:', fullResults)
            setSessionResults(fullResults)
          } catch (err: any) {
            console.error('❌ Backend error:', err)
            setStatus(`Backend error: ${err.message}`)
          } finally {
            setIsProcessing(false)
          }
        }
        
        // Main processing loop
        const processFrame = () => {
          const video = videoRef.current
          const canvas = canvasRef.current
          const landmarker = poseLandmarkerRef.current
          
          if (!video || !canvas || !landmarker || !isRunning) {
            return
          }

          try {
            const result = landmarker.detectForVideo(video, performance.now())
            const ctx = canvas.getContext('2d')
            
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              
              if (result.landmarks && result.landmarks[0]) {
                const landmarks = result.landmarks[0]
                
                // Draw ALL landmarks as BIG GREEN DOTS
                ctx.fillStyle = '#00ff00'
                for (let i = 0; i < landmarks.length; i++) {
                  const lm = landmarks[i]
                  if (lm && lm.visibility > 0.3) {
                    const x = lm.x * canvas.width
                    const y = lm.y * canvas.height
                    ctx.beginPath()
                    ctx.arc(x, y, 6, 0, 2 * Math.PI)
                    ctx.fill()
                  }
                }
                
                // Draw skeleton connections
                ctx.strokeStyle = '#00ff00'
                ctx.lineWidth = 3
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
                
                // Body connections
                draw(11, 12) // shoulders
                draw(11, 23) // left torso
                draw(12, 24) // right torso
                draw(23, 24) // hips
                draw(11, 13) // left upper arm
                draw(13, 15) // left lower arm
                draw(12, 14) // right upper arm
                draw(14, 16) // right lower arm
                draw(23, 25) // left upper leg
                draw(25, 27) // left lower leg
                draw(24, 26) // right upper leg
                draw(26, 28) // right lower leg
                
                // HIGHLIGHT WRISTS AND SHOULDERS IN RED
                ctx.fillStyle = '#ff0000'
                const highlightLandmarks = [
                  LANDMARKS.LEFT_WRIST,
                  LANDMARKS.RIGHT_WRIST,
                  LANDMARKS.LEFT_SHOULDER,
                  LANDMARKS.RIGHT_SHOULDER,
                ]
                for (const idx of highlightLandmarks) {
                  const lm = landmarks[idx]
                  if (lm && lm.visibility > 0.3) {
                    ctx.beginPath()
                    ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 10, 0, 2 * Math.PI)
                    ctx.fill()
                  }
                }
                
                // Check for hand raised if in ready mode
                if (taskStatus === 'ready') {
                  if (detectHandRaised(landmarks)) {
                    console.log('🎯 HAND RAISED DETECTED! Starting timer...')
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
                        console.log('✅ Task completed!')
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
                  
                  // Check if hand is still raised
                  if (!detectHandRaised(landmarks)) {
                    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
                    console.log('❌ Hand lowered - task failed')
                    setTaskStatus('failed')
                  }
                }
              } else {
                // No pose detected
                console.log('⚠️ No pose detected in frame')
              }
            }
          } catch (err) {
            console.error('❌ processFrame error:', err)
          }
          
          animationFrameRef.current = requestAnimationFrame(processFrame)
        }
        
        console.log('🔄 Starting processFrame loop...')
        processFrame()
      }
    } catch (err: any) {
      console.error('❌ start() error:', err)
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
    console.log('⏹️ Stopping...')
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
    console.log('▶️ Beginning task...')
    setTaskStatus('ready')
    setTimeRemaining(TASK_DURATION)
    taskStartTimeRef.current = null
    setStatus('🙌 Raise your hand above your shoulder to start timer!')
  }

  const resetTask = () => {
    console.log('🔄 Resetting task...')
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
        <Typography variant="h5" gutterBottom>🙌 Raise Hand Above Shoulder Task</Typography>
        <Typography sx={{ mb: 2, fontSize: '1.1rem', fontWeight: 'bold' }}>{status}</Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          {!isRunning ? (
            <Button variant="contained" onClick={start} size="large">Start Camera</Button>
          ) : (
            <>
              {taskStatus === 'idle' && (
                <Button variant="contained" color="primary" onClick={beginTask} size="large">Begin Task</Button>
              )}
              {(taskStatus === 'success' || taskStatus === 'failed') && (
                <Button variant="contained" onClick={resetTask} size="large">Try Again</Button>
              )}
              {taskStatus === 'ready' && (
                <Button variant="outlined" onClick={resetTask} size="large">Cancel</Button>
              )}
              <Button variant="outlined" onClick={stop} size="large">Stop Camera</Button>
            </>
          )}
        </Box>
        
        {/* Debug Info */}
        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="caption" component="div">
            <strong>Debug Info:</strong>
          </Typography>
          <Typography variant="caption" component="div">
            Left Wrist Y: {debugInfo.leftWristY.toFixed(3)} | Left Shoulder Y: {debugInfo.leftShoulderY.toFixed(3)}
          </Typography>
          <Typography variant="caption" component="div">
            Right Wrist Y: {debugInfo.rightWristY.toFixed(3)} | Right Shoulder Y: {debugInfo.rightShoulderY.toFixed(3)}
          </Typography>
          <Typography variant="caption" component="div">
            Hand Raised: {debugInfo.handRaised ? '✅ YES' : '❌ NO'}
          </Typography>
          <Typography variant="caption" component="div" sx={{ mt: 1, fontStyle: 'italic' }}>
            Note: Smaller Y = higher on screen. Wrist Y should be LESS than Shoulder Y when hand is raised.
          </Typography>
        </Box>
      </Paper>

      {taskStatus === 'ready' && (
        <Alert severity="info" sx={{ mb: 2, fontSize: '1.2rem' }}>
          🙌 RAISE YOUR HAND ABOVE YOUR SHOULDER - Timer will start automatically!
          <br />
          <Typography variant="body2" sx={{ mt: 1 }}>
            {debugInfo.handRaised ? '✅ HAND DETECTED! TIMER STARTING...' : '❌ Raise hand higher!'}
          </Typography>
        </Alert>
      )}

      {taskStatus === 'detecting' && (
        <Paper elevation={3} sx={{ p: 3, mb: 2, bgcolor: '#e3f2fd' }}>
          <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2', textAlign: 'center' }}>
            {timeRemaining}s
          </Typography>
          <Typography variant="h6" sx={{ textAlign: 'center' }}>Keep your hand raised!</Typography>
        </Paper>
      )}

      {taskStatus === 'success' && (
        <Paper elevation={3} sx={{ p: 3, mb: 2, bgcolor: '#e8f5e9' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: '#4caf50' }} />
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#2e7d32' }}>Success!</Typography>
            <Typography>You kept your hand raised for 10 seconds!</Typography>
            {isProcessing && <Typography sx={{ mt: 2 }}>Analyzing...</Typography>}
          </Box>
        </Paper>
      )}

      {taskStatus === 'failed' && (
        <Paper elevation={3} sx={{ p: 3, mb: 2, bgcolor: '#ffebee' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CancelIcon sx={{ fontSize: 80, color: '#f44336' }} />
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#c62828' }}>Task Failed</Typography>
            <Typography>You lowered your hand too early. Try again!</Typography>
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
