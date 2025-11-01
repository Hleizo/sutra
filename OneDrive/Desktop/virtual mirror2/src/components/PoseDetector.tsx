import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Box } from '@mui/material';
import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

interface PoseDetectorProps {
  running: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  onResult?: (landmarks: any, confidence: number) => void;
  showVisualization?: boolean;
  mirror?: boolean;
}

// Helper function to map normalized landmark to canvas pixels with letterboxing
function mapPointToCanvas(
  landmark: { x: number; y: number },
  video: HTMLVideoElement,
  rect: DOMRect
): { x: number; y: number } {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  
  // Compute scale and offsets for object-fit: contain
  const scale = Math.min(rect.width / vw, rect.height / vh);
  const dx = (rect.width - vw * scale) / 2;
  const dy = (rect.height - vh * scale) / 2;
  
  // Map normalized coordinates [0..1] to canvas pixels
  const px = dx + landmark.x * vw * scale;
  const py = dy + landmark.y * vh * scale;
  
  return { x: px, y: py };
}

export const PoseDetector = ({
  running,
  videoRef,
  onResult,
  showVisualization = true,
  mirror = true,
}: PoseDetectorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize MediaPipe PoseLandmarker on mount
  useEffect(() => {
    let mounted = true;

    const initializeLandmarker = async () => {
      try {
        console.log('POSE: Initializing MediaPipe PoseLandmarker...');
        setLoading(true);

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );

        if (!mounted) return;

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (!mounted) {
          poseLandmarker.close();
          return;
        }

        landmarkerRef.current = poseLandmarker;
        setLoading(false);
        console.log('POSE: MediaPipe PoseLandmarker initialized successfully');
      } catch (err) {
        console.error('POSE ERROR: Failed to initialize:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load pose detection');
          setLoading(false);
        }
      }
    };

    initializeLandmarker();

    return () => {
      mounted = false;
      if (landmarkerRef.current) {
        console.log('POSE: Closing landmarker');
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // Control detection loop based on 'running' prop
  useEffect(() => {
    if (!running || loading || error || !landmarkerRef.current || !videoRef.current) {
      // Stop detection loop if not running or not ready
      if (rafIdRef.current !== null) {
        console.log('POSE: Stopping detection loop');
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    // Ensure video is playing before starting loop
    const ensureVideoPlaying = async () => {
      if (video.paused || video.readyState < 2) {
        try {
          await video.play();
          console.log('POSE: Video playback started');
        } catch (playError) {
          console.error('POSE: Failed to play video:', playError);
          setError('Failed to start video playback');
          return false;
        }
      }
      return true;
    };

    let firstFrameLogged = false;

    const detectPose = async () => {
      if (!running || !landmarkerRef.current || !videoRef.current) {
        rafIdRef.current = null;
        return;
      }

      const videoElement = videoRef.current;
      const canvasElement = canvas;

      // Ensure video has valid dimensions
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        rafIdRef.current = requestAnimationFrame(detectPose);
        return;
      }

      // Log video dimensions on first frame
      if (!firstFrameLogged) {
        console.log(
          `POSE: Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`
        );
        firstFrameLogged = true;
      }

      // Sync canvas to displayed video dimensions (HiDPI support)
      if (canvasElement) {
        const rect = videoElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Set CSS display size
        canvasElement.style.width = `${rect.width}px`;
        canvasElement.style.height = `${rect.height}px`;
        
        // Set device pixels for sharp rendering on HiDPI screens
        canvasElement.width = Math.round(rect.width * dpr);
        canvasElement.height = Math.round(rect.height * dpr);
      }

      try {
        const timestamp = performance.now();
        const result = landmarker.detectForVideo(videoElement, timestamp);

        // Check if pose was detected
        if (result.landmarks && result.landmarks.length > 0) {
          const landmarks = result.landmarks[0];
          const confidence = result.worldLandmarks?.[0]
            ? Math.min(
                ...result.worldLandmarks[0].map((lm: any) => lm.visibility || 0)
              )
            : 0.5;

          console.log(`POSE: Detected ${landmarks.length} landmarks`);

          // Notify parent with result
          if (onResult) {
            onResult(landmarks, confidence);
          }

          // Draw visualization if enabled
          if (showVisualization && canvasElement) {
            const ctx = canvasElement.getContext('2d');
            if (ctx) {
              const rect = videoElement.getBoundingClientRect();
              const dpr = window.devicePixelRatio || 1;
              
              // Clear canvas
              ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
              
              // Scale context for HiDPI
              ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
              
              // Apply mirror transform if enabled
              if (mirror) {
                ctx.translate(rect.width, 0);
                ctx.scale(-1, 1);
              }
              
              // Draw landmarks manually with proper coordinate mapping
              ctx.fillStyle = '#00FF00';
              ctx.strokeStyle = '#00FF00';
              ctx.lineWidth = 2;
              
              // Draw each landmark
              for (const landmark of landmarks) {
                const point = mapPointToCanvas(landmark, videoElement, rect);
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                ctx.fill();
              }
              
              // Draw connections
              const connections = PoseLandmarker.POSE_CONNECTIONS;
              for (const connection of connections) {
                const start = mapPointToCanvas(landmarks[connection.start], videoElement, rect);
                const end = mapPointToCanvas(landmarks[connection.end], videoElement, rect);
                
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
              }
            }
          }
        } else {
          console.log('POSE: No landmarks detected this frame');

          // Clear canvas if no pose detected
          if (showVisualization && canvasElement) {
            const ctx = canvasElement.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            }
          }
        }
      } catch (detectError) {
        console.error('POSE: Detection error:', detectError);
      }

      // Schedule next frame
      rafIdRef.current = requestAnimationFrame(detectPose);
    };

    // Start detection loop
    const startLoop = async () => {
      const videoPlaying = await ensureVideoPlaying();
      if (videoPlaying && running) {
        console.log('POSE: Starting detection loop');
        rafIdRef.current = requestAnimationFrame(detectPose);
      }
    };

    startLoop();

    // Cleanup: stop detection loop
    return () => {
      if (rafIdRef.current !== null) {
        console.log('POSE: Stopping detection loop (cleanup)');
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [running, loading, error, videoRef, onResult, showVisualization]);

  if (error) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(255, 0, 0, 0.1)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        Error loading pose detection: {error}
      </Box>
    );
  }

  if (!showVisualization) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    />
  );
};
