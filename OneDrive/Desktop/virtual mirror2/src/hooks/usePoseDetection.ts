/**
 * Custom React Hook for MediaPipe Pose Detection
 * Encapsulates initialization, processing loop, and cleanup logic
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface JointAngles {
  leftShoulder: number;
  rightShoulder: number;
  leftElbow: number;
  rightElbow: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
}

export interface PoseDetectionOptions {
  modelAssetPath?: string;
  runningMode?: 'IMAGE' | 'VIDEO';
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
  numPoses?: number;
  delegate?: 'CPU' | 'GPU';
  enableFps?: boolean;
}

export interface PoseDetectionResult {
  landmarks: NormalizedLandmark[][];
  worldLandmarks: NormalizedLandmark[][];
  angles: JointAngles | null;
  timestamp: number;
}

export interface UsePoseDetectionReturn {
  isReady: boolean;
  isProcessing: boolean;
  error: string | null;
  lastResult: PoseDetectionResult | null;
  fps: number;
  startDetection: (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => void;
  stopDetection: () => void;
  reset: () => void;
}

const DEFAULT_OPTIONS: PoseDetectionOptions = {
  modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  runningMode: 'VIDEO',
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  numPoses: 1,
  delegate: 'GPU',
  enableFps: true
};

/**
 * Calculate angle between three 3D points
 */
function calculateAngle3D(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark
): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * Extract joint angles from pose landmarks
 */
function extractJointAngles(landmarks: NormalizedLandmark[]): JointAngles {
  // MediaPipe Pose landmark indices
  const indices = {
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
    RIGHT_ANKLE: 28
  };

  return {
    leftShoulder: calculateAngle3D(
      landmarks[indices.LEFT_ELBOW],
      landmarks[indices.LEFT_SHOULDER],
      landmarks[indices.LEFT_HIP]
    ),
    rightShoulder: calculateAngle3D(
      landmarks[indices.RIGHT_ELBOW],
      landmarks[indices.RIGHT_SHOULDER],
      landmarks[indices.RIGHT_HIP]
    ),
    leftElbow: calculateAngle3D(
      landmarks[indices.LEFT_SHOULDER],
      landmarks[indices.LEFT_ELBOW],
      landmarks[indices.LEFT_WRIST]
    ),
    rightElbow: calculateAngle3D(
      landmarks[indices.RIGHT_SHOULDER],
      landmarks[indices.RIGHT_ELBOW],
      landmarks[indices.RIGHT_WRIST]
    ),
    leftHip: calculateAngle3D(
      landmarks[indices.LEFT_SHOULDER],
      landmarks[indices.LEFT_HIP],
      landmarks[indices.LEFT_KNEE]
    ),
    rightHip: calculateAngle3D(
      landmarks[indices.RIGHT_SHOULDER],
      landmarks[indices.RIGHT_HIP],
      landmarks[indices.RIGHT_KNEE]
    ),
    leftKnee: calculateAngle3D(
      landmarks[indices.LEFT_HIP],
      landmarks[indices.LEFT_KNEE],
      landmarks[indices.LEFT_ANKLE]
    ),
    rightKnee: calculateAngle3D(
      landmarks[indices.RIGHT_HIP],
      landmarks[indices.RIGHT_KNEE],
      landmarks[indices.RIGHT_ANKLE]
    )
  };
}

/**
 * Custom hook for pose detection with MediaPipe
 */
export function usePoseDetection(
  options: PoseDetectionOptions = {},
  onPoseDetected?: (result: PoseDetectionResult) => void
): UsePoseDetectionReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // State
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PoseDetectionResult | null>(null);
  const [fps, setFps] = useState(0);

  // Refs
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const fpsCalculatorRef = useRef<{
    lastTime: number;
    frames: number;
  }>({ lastTime: performance.now(), frames: 0 });

  /**
   * Initialize MediaPipe Pose Landmarker
   */
  useEffect(() => {
    let mounted = true;

    const initializePoseLandmarker = async () => {
      try {
        console.log('Initializing MediaPipe Pose Landmarker...');
        
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (!mounted) return;

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: mergedOptions.modelAssetPath!,
            delegate: mergedOptions.delegate
          },
          runningMode: mergedOptions.runningMode!,
          numPoses: mergedOptions.numPoses!,
          minPoseDetectionConfidence: mergedOptions.minPoseDetectionConfidence!,
          minPosePresenceConfidence: mergedOptions.minPosePresenceConfidence!,
          minTrackingConfidence: mergedOptions.minTrackingConfidence!
        });

        if (!mounted) {
          poseLandmarker.close();
          return;
        }

        poseLandmarkerRef.current = poseLandmarker;
        setIsReady(true);
        setError(null);
        console.log('Pose Landmarker initialized successfully');
      } catch (err) {
        console.error('Failed to initialize Pose Landmarker:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize pose detection');
          setIsReady(false);
        }
      }
    };

    initializePoseLandmarker();

    return () => {
      mounted = false;
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
    };
  }, [mergedOptions.modelAssetPath, mergedOptions.delegate, mergedOptions.runningMode]);

  /**
   * Calculate FPS
   */
  const updateFps = useCallback(() => {
    if (!mergedOptions.enableFps) return;

    const now = performance.now();
    fpsCalculatorRef.current.frames++;

    if (now >= fpsCalculatorRef.current.lastTime + 1000) {
      const currentFps = Math.round(
        (fpsCalculatorRef.current.frames * 1000) / (now - fpsCalculatorRef.current.lastTime)
      );
      setFps(currentFps);
      fpsCalculatorRef.current.lastTime = now;
      fpsCalculatorRef.current.frames = 0;
    }
  }, [mergedOptions.enableFps]);

  /**
   * Process video frame for pose detection
   */
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !poseLandmarker || !isProcessing) {
      return;
    }

    // Only process if video time has changed
    if (video.currentTime === lastVideoTimeRef.current) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastVideoTimeRef.current = video.currentTime;

    try {
      const startTimeMs = performance.now();
      const results = poseLandmarker.detectForVideo(video, startTimeMs);

      // Update FPS
      updateFps();

      // Draw results on canvas
      const canvasCtx = canvas.getContext('2d');
      if (canvasCtx) {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.landmarks && results.landmarks.length > 0) {
          const drawingUtils = new DrawingUtils(canvasCtx);

          // Draw landmarks and connectors
          for (const landmarks of results.landmarks) {
            drawingUtils.drawLandmarks(landmarks, {
              radius: 2,
              color: '#00FF00',
              fillColor: '#FF0000'
            });
            drawingUtils.drawConnectors(
              landmarks,
              PoseLandmarker.POSE_CONNECTIONS,
              { color: '#00FF00', lineWidth: 2 }
            );
          }
        }

        canvasCtx.restore();
      }

      // Extract joint angles
      let angles: JointAngles | null = null;
      if (results.landmarks && results.landmarks.length > 0) {
        angles = extractJointAngles(results.landmarks[0]);
      }

      // Create result object
      const result: PoseDetectionResult = {
        landmarks: results.landmarks,
        worldLandmarks: results.worldLandmarks,
        angles,
        timestamp: startTimeMs
      };

      setLastResult(result);

      // Call callback if provided
      if (onPoseDetected && angles) {
        onPoseDetected(result);
      }
    } catch (err) {
      console.error('Error processing frame:', err);
      setError(err instanceof Error ? err.message : 'Error processing frame');
    }

    // Continue processing loop
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isProcessing, onPoseDetected, updateFps]);

  /**
   * Start pose detection
   */
  const startDetection = useCallback(
    (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => {
      if (!isReady) {
        console.warn('Pose detector not ready yet');
        return;
      }

      if (isProcessing) {
        console.warn('Detection already running');
        return;
      }

      videoRef.current = videoElement;
      canvasRef.current = canvasElement;
      lastVideoTimeRef.current = -1;

      // Set canvas size to match video
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;

      setIsProcessing(true);
      setError(null);

      console.log('Starting pose detection...');
    },
    [isReady, isProcessing]
  );

  /**
   * Stop pose detection
   */
  const stopDetection = useCallback(() => {
    console.log('Stopping pose detection...');
    
    setIsProcessing(false);

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    videoRef.current = null;
    canvasRef.current = null;
    lastVideoTimeRef.current = -1;
  }, []);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    stopDetection();
    setLastResult(null);
    setError(null);
    setFps(0);
    fpsCalculatorRef.current = { lastTime: performance.now(), frames: 0 };
  }, [stopDetection]);

  /**
   * Start processing loop when isProcessing becomes true
   */
  useEffect(() => {
    if (isProcessing) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isProcessing, processFrame]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopDetection();
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
    };
  }, [stopDetection]);

  return {
    isReady,
    isProcessing,
    error,
    lastResult,
    fps,
    startDetection,
    stopDetection,
    reset
  };
}

export default usePoseDetection;
