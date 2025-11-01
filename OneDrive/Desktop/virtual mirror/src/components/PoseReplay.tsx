import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Slider,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Replay as ReplayIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';

interface PoseReplayProps {
  poseData: Array<{
    frame_number: number;
    timestamp: number;
    landmarks: Array<{
      x: number;
      y: number;
      z: number;
      visibility: number;
    }>;
  }>;
  width?: number;
  height?: number;
  onComplete?: () => void;
}

const PoseReplay: React.FC<PoseReplayProps> = ({
  poseData,
  width = 640,
  height = 480,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [progress, setProgress] = useState(0);

  // MediaPipe pose connections for drawing skeleton
  const POSE_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
    [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
    [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
    [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
    [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
  ];

  useEffect(() => {
    if (!poseData || poseData.length === 0) return;

    if (isPlaying) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  const startAnimation = () => {
    if (!poseData || poseData.length === 0) return;
    
    startTimeRef.current = performance.now();
    const startFrameIndex = currentFrame;
    
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      // Calculate elapsed time with playback speed
      const elapsedMs = (currentTime - startTimeRef.current) * playbackSpeed;
      
      // Find which frame to display based on elapsed time
      const startTimestamp = poseData[startFrameIndex].timestamp;
      let frameIndex = startFrameIndex;
      
      for (let i = startFrameIndex; i < poseData.length; i++) {
        const frameTimestamp = poseData[i].timestamp - startTimestamp;
        if (frameTimestamp <= elapsedMs) {
          frameIndex = i;
        } else {
          break;
        }
      }

      // Draw the frame
      drawFrame(frameIndex);
      setCurrentFrame(frameIndex);
      setProgress((frameIndex / (poseData.length - 1)) * 100);

      // Continue animation or complete
      if (frameIndex < poseData.length - 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        if (onComplete) onComplete();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    startTimeRef.current = undefined;
  };

  const drawFrame = (frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const frame = poseData[frameIndex];
    if (!frame || !frame.landmarks) return;

    // Convert landmarks to the format expected by drawing
    const landmarks = frame.landmarks.map(lm => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility,
    }));

    // Draw connections (skeleton lines)
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    
    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      
      if (start && end && 
          start.visibility > 0.5 && 
          end.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.stroke();
      }
    });

    // Draw landmarks (joints)
    landmarks.forEach((landmark, idx) => {
      if (landmark.visibility > 0.5) {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        // Different colors for different body parts
        if (idx < 11) {
          ctx.fillStyle = '#FF0000'; // Head/face - red
        } else if (idx < 17) {
          ctx.fillStyle = '#00FF00'; // Arms - green
        } else if (idx < 23) {
          ctx.fillStyle = '#FFFF00'; // Hands - yellow
        } else {
          ctx.fillStyle = '#0000FF'; // Legs - blue
        }
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw white outline
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Draw frame info
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.fillText(`Frame: ${frame.frame_number}`, 10, 20);
    ctx.fillText(`Time: ${(frame.timestamp / 1000).toFixed(2)}s`, 10, 40);
    ctx.fillText(`Speed: ${playbackSpeed}x`, 10, 60);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
    setProgress(0);
    drawFrame(0);
  };

  const handleRestart = () => {
    setCurrentFrame(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  const handleSliderChange = (_event: Event, value: number | number[]) => {
    const frameIndex = Math.floor(((value as number) / 100) * (poseData.length - 1));
    setCurrentFrame(frameIndex);
    setProgress(value as number);
    drawFrame(frameIndex);
  };

  // Draw initial frame
  useEffect(() => {
    if (poseData && poseData.length > 0) {
      drawFrame(0);
    }
  }, [poseData]);

  if (!poseData || poseData.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No pose data available for replay
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2, bgcolor: '#000' }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            backgroundColor: '#1a1a1a',
          }}
        />
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        {/* Progress bar */}
        <Box sx={{ mb: 2 }}>
          <Slider
            value={progress}
            onChange={handleSliderChange}
            disabled={isPlaying}
            sx={{ width: '100%' }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Frame {currentFrame + 1} / {poseData.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(poseData[currentFrame]?.timestamp / 1000).toFixed(2)}s / {' '}
              {(poseData[poseData.length - 1]?.timestamp / 1000).toFixed(2)}s
            </Typography>
          </Box>
        </Box>

        {/* Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          <IconButton
            onClick={handlePlayPause}
            color="primary"
            size="large"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
          <IconButton onClick={handleStop} color="error" size="large">
            <StopIcon />
          </IconButton>
          <IconButton onClick={handleRestart} color="info" size="large">
            <ReplayIcon />
          </IconButton>
          <IconButton onClick={handleSpeedChange} color="secondary" size="large">
            <SpeedIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Speed: {playbackSpeed}x
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PoseReplay;
