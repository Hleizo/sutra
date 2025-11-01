import { useEffect, useRef, useState } from 'react';
import { Container, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

const PoseSmokeTest = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string>('');
  const [landmarkCount, setLandmarkCount] = useState<number>(0);

  useEffect(() => {
    let isActive = true;

    const initializePoseDetection = async () => {
      try {
        console.log('SMOKE TEST: Loading MediaPipe WASM...');
        setStatus('Loading MediaPipe WASM...');
        
        // Load WASM from CDN
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );
        
        console.log('SMOKE TEST: Creating PoseLandmarker...');
        setStatus('Loading pose model...');
        
        // Create pose landmarker
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        
        if (!isActive) {
          landmarker.close();
          return;
        }
        
        landmarkerRef.current = landmarker;
        console.log('SMOKE TEST: Model loaded successfully');
        setStatus('Getting webcam access...');
        
        // Get webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user', 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 },
            aspectRatio: { ideal: 16/9 }
          },
          audio: false,
        });
        
        if (!isActive) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.autoplay = true;
          
          await videoRef.current.play();
          console.log('SMOKE TEST: Video playing');
          setStatus('Running pose detection...');
          
          // Start detection loop
          detectLoop();
        }
      } catch (err) {
        console.error('SMOKE TEST ERROR:', err);
        setError(`Initialization failed: ${err instanceof Error ? err.message : String(err)}`);
        setStatus('Error');
      }
    };

    const detectLoop = () => {
      if (!isActive || !videoRef.current || !canvasRef.current || !landmarkerRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      // Sync canvas size with video
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          console.log(`SMOKE TEST: Canvas sized to ${video.videoWidth}x${video.videoHeight}`);
        }

        // Detect pose
        const startTimeMs = performance.now();
        const results = landmarker.detectForVideo(video, startTimeMs);

        // Draw results
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            console.log(`SMOKE TEST: Detected ${landmarks.length} landmarks`);
            setLandmarkCount(landmarks.length);
            
            // Draw landmarks
            const drawingUtils = new DrawingUtils(ctx);
            drawingUtils.drawLandmarks(landmarks, {
              radius: 2,
              color: '#00FF00',
              fillColor: '#FF0000',
            });
            
            // Draw connectors
            drawingUtils.drawConnectors(
              landmarks,
              PoseLandmarker.POSE_CONNECTIONS,
              { color: '#00FF00', lineWidth: 2 }
            );
          } else {
            console.log('SMOKE TEST: No landmarks detected this frame');
            setLandmarkCount(0);
          }
        }
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(detectLoop);
    };

    initializePoseDetection();

    // Cleanup
    return () => {
      isActive = false;
      
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Pose Detection Smoke Test
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Status: {status}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {!error && status === 'Initializing...' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CircularProgress size={20} />
          <Typography>Loading MediaPipe...</Typography>
        </Box>
      )}
      
      <Box sx={{ position: 'relative', width: '100%', maxWidth: 640, mx: 'auto' }}>
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            transform: 'scaleX(-1)', // Mirror effect
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'scaleX(-1)', // Mirror effect
          }}
        />
      </Box>
      
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="body2">
          <strong>Landmarks detected:</strong> {landmarkCount > 0 ? landmarkCount : 'None'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Expected: 33 landmarks when pose is detected
        </Typography>
      </Box>
    </Container>
  );
};

export default PoseSmokeTest;
