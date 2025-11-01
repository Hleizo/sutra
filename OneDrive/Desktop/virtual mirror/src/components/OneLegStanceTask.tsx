import React, { useEffect, useRef, useState, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import { Box, Button, Paper, Typography, LinearProgress, Alert, CircularProgress, Chip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import DownloadIcon from '@mui/icons-material/Download'
import AssessmentIcon from '@mui/icons-material/Assessment'
import AssistantController, { AssistantHandle } from './AssistantController'
import * as api from '../services/api'

type TaskStatus = 'idle' | 'ready' | 'detecting' | 'success' | 'failed'

const ARABIC_INSTRUCTION = 'وقف على رجل وحدة!'
const TASK_DURATION = 10 // seconds
const ANKLE_HEIGHT_THRESHOLD = 0.05 // minimum height difference to consider foot lifted (5% of frame height)

// MediaPipe Pose landmark indices
const LANDMARKS = {
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
}

// Helper function to get risk color
function getRiskColor(riskLevel: string): string {
  switch (riskLevel.toLowerCase()) {
    case 'high':
      return '#d32f2f' // red
    case 'medium':
      return '#f57c00' // orange
    case 'normal':
    case 'low':
      return '#388e3c' // green
    default:
      return '#757575' // gray
  }
}

// Helper function to get risk chip color
function getRiskChipColor(riskLevel: string): 'error' | 'warning' | 'success' | 'default' {
  switch (riskLevel.toLowerCase()) {
    case 'high':
      return 'error'
    case 'medium':
      return 'warning'
    case 'normal':
    case 'low':
      return 'success'
    default:
      return 'default'
  }
}

export default function OneLegStanceTask() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const taskStartTimeRef = useRef<number | null>(null)
  const assistantRef = useRef<AssistantHandle | null>(null)
  const recordedFramesRef = useRef<api.PoseFrame[]>([])
  const sessionIdRef = useRef<number | null>(null)

  const [isModelLoading, setIsModelLoading] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('idle')
  const [timeRemaining, setTimeRemaining] = useState(TASK_DURATION)
  const [audioPlayed, setAudioPlayed] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sessionResults, setSessionResults] = useState<api.SessionResponse | null>(null)
  const [apiConnected, setApiConnected] = useState(false)

  // Text-to-Speech for Arabic instruction using Cartoon Assistant
  const speakArabic = useCallback(async (text: string) => {
    if (assistantRef.current) {
      try {
        await assistantRef.current.speak(text, 'ar-SA')
      } catch (error) {
        console.error('Assistant speak error:', error)
      }
    } else {
      console.warn('Assistant not ready')
    }
  }, [])

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

  // Detect if one foot is off the ground
  const detectOneLegStance = useCallback((result: PoseLandmarkerResult): boolean => {
    if (!result.landmarks || result.landmarks.length === 0) return false

    const landmarks = result.landmarks[0]
    const leftAnkle = landmarks[LANDMARKS.LEFT_ANKLE]
    const rightAnkle = landmarks[LANDMARKS.RIGHT_ANKLE]
    const leftHip = landmarks[LANDMARKS.LEFT_HIP]
    const rightHip = landmarks[LANDMARKS.RIGHT_HIP]

    // Check if all required landmarks are visible
    if (
      !leftAnkle || !rightAnkle || !leftHip || !rightHip ||
      leftAnkle.visibility < 0.5 || rightAnkle.visibility < 0.5 ||
      leftHip.visibility < 0.5 || rightHip.visibility < 0.5
    ) {
      return false
    }

    // Calculate average hip height as reference
    const avgHipY = (leftHip.y + rightHip.y) / 2

    // Calculate height difference between ankles (relative to hip)
    const leftAnkleHeight = avgHipY - leftAnkle.y
    const rightAnkleHeight = avgHipY - rightAnkle.y
    const heightDiff = Math.abs(leftAnkleHeight - rightAnkleHeight)

    // One foot is off the ground if there's significant height difference
    return heightDiff > ANKLE_HEIGHT_THRESHOLD
  }, [])

  // Draw pose landmarks on canvas
  const drawPoseLandmarks = useCallback((result: PoseLandmarkerResult, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx || !result.landmarks || result.landmarks.length === 0) return

    const landmarks = result.landmarks[0]
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Draw ankle points with status indication
    const leftAnkle = landmarks[LANDMARKS.LEFT_ANKLE]
    const rightAnkle = landmarks[LANDMARKS.RIGHT_ANKLE]

    if (leftAnkle && leftAnkle.visibility > 0.5) {
      const x = leftAnkle.x * canvasWidth
      const y = leftAnkle.y * canvasHeight
      ctx.fillStyle = taskStatus === 'detecting' ? '#4CAF50' : '#FFC107'
      ctx.beginPath()
      ctx.arc(x, y, 12, 0, 2 * Math.PI)
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    if (rightAnkle && rightAnkle.visibility > 0.5) {
      const x = rightAnkle.x * canvasWidth
      const y = rightAnkle.y * canvasHeight
      ctx.fillStyle = taskStatus === 'detecting' ? '#4CAF50' : '#FFC107'
      ctx.beginPath()
      ctx.arc(x, y, 12, 0, 2 * Math.PI)
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // Draw simple skeleton for reference
    const drawConnection = (idx1: number, idx2: number, color: string) => {
      const lm1 = landmarks[idx1]
      const lm2 = landmarks[idx2]
      if (!lm1 || !lm2 || lm1.visibility < 0.5 || lm2.visibility < 0.5) return

      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(lm1.x * canvasWidth, lm1.y * canvasHeight)
      ctx.lineTo(lm2.x * canvasWidth, lm2.y * canvasHeight)
      ctx.stroke()
    }

    // Draw legs
    drawConnection(LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_ANKLE, 'rgba(255, 255, 255, 0.6)')
    drawConnection(LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_ANKLE, 'rgba(255, 255, 255, 0.6)')
  }, [taskStatus])

  // Record pose frame
  const recordPoseFrame = useCallback((result: PoseLandmarkerResult, timestamp: number) => {
    if (!result.landmarks || result.landmarks.length === 0) return

    const landmarks = result.landmarks[0]
    const frame: api.PoseFrame = {
      frame_number: recordedFramesRef.current.length,
      timestamp: timestamp / 1000, // Convert to seconds
      landmarks: landmarks.map(lm => ({
        x: lm.x,
        y: lm.y,
        z: lm.z || 0,
        visibility: lm.visibility || 1.0
      }))
    }

    recordedFramesRef.current.push(frame)
  }, [])

  // Process video frame
  const processFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const poseLandmarker = poseLandmarkerRef.current

    if (!video || !canvas || !poseLandmarker || !isCameraActive) {
      return
    }

    try {
      const now = performance.now()
      const result = poseLandmarker.detectForVideo(video, now)

      // Draw landmarks
      drawPoseLandmarks(result, canvas)

      // Record frames when detecting
      if (taskStatus === 'detecting' && taskStartTimeRef.current) {
        const relativeTimestamp = now - taskStartTimeRef.current
        recordPoseFrame(result, relativeTimestamp)
      }

      // Check for one-leg stance
      if (taskStatus === 'ready') {
        const isOneLeg = detectOneLegStance(result)
        if (isOneLeg) {
          // Start the task timer
          setTaskStatus('detecting')
          taskStartTimeRef.current = Date.now()
          recordedFramesRef.current = [] // Clear previous recordings
          
          // Start countdown timer
          timerIntervalRef.current = window.setInterval(() => {
            if (!taskStartTimeRef.current) return
            
            const elapsed = (Date.now() - taskStartTimeRef.current) / 1000
            const remaining = Math.max(0, TASK_DURATION - elapsed)
            setTimeRemaining(Math.ceil(remaining))

            if (remaining <= 0) {
              // Task completed successfully
              if (timerIntervalRef.current !== null) {
                clearInterval(timerIntervalRef.current)
                timerIntervalRef.current = null
              }
              setTaskStatus('success')
              // Send data to backend
              sendToBackend()
            }
          }, 100)
        }
      } else if (taskStatus === 'detecting') {
        // Check if they're still in one-leg stance
        const isOneLeg = detectOneLegStance(result)
        if (!isOneLeg) {
          // They lost the stance - task failed
          if (timerIntervalRef.current !== null) {
            clearInterval(timerIntervalRef.current)
            timerIntervalRef.current = null
          }
          setTaskStatus('failed')
        }
      }
    } catch (err) {
      console.warn('processFrame error:', err)
    }

    animationFrameRef.current = requestAnimationFrame(processFrame)
  }, [isCameraActive, taskStatus, detectOneLegStance, drawPoseLandmarks, recordPoseFrame])

  // Send recorded data to backend
  const sendToBackend = useCallback(async () => {
    if (recordedFramesRef.current.length === 0) {
      console.warn('No pose data to send')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Create session
      const session = await api.createSession('one_leg_stance')
      sessionIdRef.current = session.id

      // Process pose data
      const duration = TASK_DURATION
      const result = await api.processPoseData(
        session.id,
        recordedFramesRef.current,
        duration
      )

      console.log('Backend analysis complete:', result)

      // Get full results
      const fullResults = await api.getSessionResults(session.id)
      setSessionResults(fullResults)

      // Announce results via assistant
      if (assistantRef.current) {
        const riskLevel = fullResults.risk_level || 'unknown'
        const riskScore = fullResults.risk_score || 0
        const message = `Analysis complete. Risk level: ${riskLevel}. Risk score: ${riskScore.toFixed(0)}.`
        await assistantRef.current.speak(message, 'en-US')
      }

    } catch (err: any) {
      console.error('Failed to send data to backend:', err)
      setError(`Analysis failed: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  // Download PDF report
  const downloadPDFReport = useCallback(async () => {
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
      console.error('Failed to download report:', err)
      setError(`Failed to download report: ${err.message}`)
    }
  }, [])

  // Check API connection on mount
  useEffect(() => {
    api.checkApiHealth().then(setApiConnected)
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
  }, [])

  // Start camera
  const startCamera = useCallback(async () => {
    setError(null)
    stopCamera()

    await initializePoseLandmarker()

    if (!poseLandmarkerRef.current) {
      setError('Pose detection model failed to load.')
      return
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access is not supported in this browser.')
      return
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      videoRef.current.playsInline = true
      videoRef.current.muted = true

      await videoRef.current.play()

      const setCanvasSize = () => {
        const canvas = canvasRef.current
        const video = videoRef.current
        if (!canvas || !video) return
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
      }

      setCanvasSize()
      videoRef.current.addEventListener('loadedmetadata', setCanvasSize)

      setIsCameraActive(true)
      animationFrameRef.current = requestAnimationFrame(processFrame)
    } catch (err: any) {
      console.error('startCamera error', err)
      if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setError('Camera access denied. Please grant permission.')
      } else if (err && err.name === 'NotFoundError') {
        setError('No camera found.')
      } else {
        setError(String(err?.message || err))
      }
      stopCamera()
    }
  }, [stopCamera, initializePoseLandmarker, processFrame])

  // Start task
  const startTask = useCallback(() => {
    setTaskStatus('ready')
    setTimeRemaining(TASK_DURATION)
    taskStartTimeRef.current = null
    
    // Play Arabic instruction
    if (!audioPlayed) {
      speakArabic(ARABIC_INSTRUCTION)
      setAudioPlayed(true)
    }
  }, [speakArabic, audioPlayed])

  // Reset task
  const resetTask = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setTaskStatus('idle')
    setTimeRemaining(TASK_DURATION)
    setAudioPlayed(false)
    taskStartTimeRef.current = null
    recordedFramesRef.current = []
    setSessionResults(null)
    sessionIdRef.current = null
  }, [])

  // Initialize model on mount
  useEffect(() => {
    initializePoseLandmarker()
    
    // Load voices for TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
    }
  }, [initializePoseLandmarker])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [stopCamera])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Cartoon Assistant */}
      <AssistantController ref={assistantRef} size={180} position="bottom-right" />

      {/* Title and Instructions */}
      <Paper elevation={2} sx={{ p: 3, bgcolor: '#f5f5f5' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            One-Leg Stance Task
          </Typography>
          <Chip 
            label={apiConnected ? 'Backend Connected' : 'Backend Offline'} 
            color={apiConnected ? 'success' : 'error'} 
            size="small"
          />
        </Box>
        <Typography variant="h4" sx={{ fontFamily: 'Arial', direction: 'rtl', color: '#1976d2', mb: 2 }}>
          {ARABIC_INSTRUCTION}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Stand on one leg for 10 seconds. The timer will start automatically when you lift one foot off the ground.
        </Typography>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Model Loading */}
      {isModelLoading && (
        <Alert severity="info">Loading pose detection model...</Alert>
      )}

      {/* Task Status Display */}
      {taskStatus !== 'idle' && (
        <Paper elevation={3} sx={{ p: 3, bgcolor: taskStatus === 'success' ? '#e8f5e9' : taskStatus === 'failed' ? '#ffebee' : '#e3f2fd' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {taskStatus === 'ready' && (
              <>
                <Typography variant="h6" color="primary">
                  Get Ready! Lift one foot off the ground...
                </Typography>
              </>
            )}
            
            {taskStatus === 'detecting' && (
              <>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2' }}>
                  {timeRemaining}s
                </Typography>
                <Typography variant="h6">Hold the position!</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={((TASK_DURATION - timeRemaining) / TASK_DURATION) * 100}
                  sx={{ width: '100%', height: 10, borderRadius: 5 }}
                />
              </>
            )}

            {taskStatus === 'success' && (
              <>
                <CheckCircleIcon sx={{ fontSize: 80, color: '#4caf50' }} />
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                  Success!
                </Typography>
                <Typography variant="body1">
                  You completed the one-leg stance for 10 seconds!
                </Typography>
                {isProcessing && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2">Analyzing your performance...</Typography>
                  </Box>
                )}
              </>
            )}

            {taskStatus === 'failed' && (
              <>
                <CancelIcon sx={{ fontSize: 80, color: '#f44336' }} />
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#c62828' }}>
                  Task Failed
                </Typography>
                <Typography variant="body1">
                  You lost balance before completing 10 seconds. Try again!
                </Typography>
              </>
            )}
          </Box>
        </Paper>
      )}

      {/* Results Display */}
      {sessionResults && (
        <Paper elevation={3} sx={{ p: 3, bgcolor: '#f9fbe7' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <AssessmentIcon sx={{ fontSize: 40, color: '#1976d2' }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Assessment Results
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">Stability Score</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>
                {sessionResults.stability_score?.toFixed(1) || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Balance Score</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>
                {sessionResults.balance_score?.toFixed(1) || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Risk Score</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: getRiskColor(sessionResults.risk_level || 'unknown') }}>
                {sessionResults.risk_score?.toFixed(0) || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Risk Level</Typography>
              <Chip 
                label={sessionResults.risk_level || 'Unknown'}
                color={getRiskChipColor(sessionResults.risk_level || 'unknown')}
                sx={{ fontSize: '1.1rem', fontWeight: 600, mt: 1 }}
              />
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={downloadPDFReport}
            fullWidth
            size="large"
            sx={{ mt: 2 }}
          >
            Download PDF Report
          </Button>
        </Paper>
      )}

      {/* Video and Canvas */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ position: 'relative', display: 'inline-block', borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
          <video
            ref={videoRef}
            style={{ width: 640, maxWidth: '100%', background: '#000', display: 'block' }}
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
            aria-label="Pose overlay"
          />
        </Box>
      </Box>

      {/* Control Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        {!isCameraActive ? (
          <Button
            variant="contained"
            size="large"
            onClick={startCamera}
            disabled={isModelLoading}
          >
            Start Camera
          </Button>
        ) : (
          <>
            {taskStatus === 'idle' && (
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={startTask}
              >
                Begin Task
              </Button>
            )}
            
            {(taskStatus === 'success' || taskStatus === 'failed') && (
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={resetTask}
              >
                Try Again
              </Button>
            )}

            {taskStatus === 'ready' && (
              <Button
                variant="outlined"
                size="large"
                onClick={resetTask}
              >
                Cancel
              </Button>
            )}

            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                stopCamera()
                resetTask()
              }}
            >
              Stop Camera
            </Button>
          </>
        )}

        {/* Audio replay is now handled by the cartoon assistant's speaker button */}
      </Box>
    </Box>
  )
}
