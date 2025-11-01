import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Box, Alert, Button, CircularProgress, Typography } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface CameraFeedProps {
  onVideoReady?: (videoElement: HTMLVideoElement) => void;
  width?: number | string;
  height?: number | string;
  autoStart?: boolean;
}

export interface CameraFeedHandle {
  stopTracks: () => void;
  startCamera: () => Promise<void>;
}

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(
  ({ onVideoReady, width = '100%', height = 'auto', autoStart = true }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [permissionState, setPermissionState] = useState<PermissionState>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const startCamera = async () => {
      try {
        setPermissionState('requesting');
        setErrorMessage('');

        console.log('CAMERA: Requesting camera access...');

        // Request camera access with specific constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 16/9 }
          },
          audio: false,
        });

        console.log('CAMERA: Stream obtained');
        streamRef.current = stream;

        // Attach stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.autoplay = true;

          try {
            await videoRef.current.play();
            console.log('CAMERA: Video playing');
            setPermissionState('granted');

            // Notify parent component that video is ready
            if (onVideoReady && videoRef.current) {
              onVideoReady(videoRef.current);
            }
          } catch (playError) {
            console.error('CAMERA: Play error:', playError);
            setPermissionState('error');
            setErrorMessage('Failed to start video playback');
          }
        }
      } catch (error) {
        console.error('CAMERA ERROR:', error);

        if (error instanceof Error) {
          // Handle specific permission errors
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setPermissionState('denied');
            setErrorMessage('Camera permission was denied. Please allow camera access to continue.');
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            setPermissionState('error');
            setErrorMessage('No camera found. Please connect a camera and try again.');
          } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            setPermissionState('error');
            setErrorMessage('Camera is already in use by another application.');
          } else {
            setPermissionState('error');
            setErrorMessage(`An error occurred: ${error.message}`);
          }
        } else {
          setPermissionState('error');
          setErrorMessage('An unexpected error occurred while accessing the camera.');
        }
      }
    };

    const stopTracks = () => {
      console.log('CAMERA: Stopping all tracks');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log(`CAMERA: Stopped track: ${track.kind}`);
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setPermissionState('idle');
    };

    const retryCamera = () => {
      stopTracks();
      startCamera();
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      stopTracks,
      startCamera,
    }));

    useEffect(() => {
      // Auto-start camera when component mounts if enabled
      if (autoStart) {
        startCamera();
      }

      // Cleanup: stop camera when component unmounts
      return () => {
        stopTracks();
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <Box
        sx={{
          position: 'relative',
          width,
          height,
          bgcolor: '#000',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: 'scaleX(-1)', // Mirror effect
            display: permissionState === 'granted' ? 'block' : 'none',
            minWidth: '320px',
            minHeight: '240px',
          }}
        />

        {/* Loading State */}
        {permissionState === 'requesting' && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="white">
              Requesting camera access...
            </Typography>
          </Box>
        )}

        {/* Idle State */}
        {permissionState === 'idle' && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <VideocamIcon sx={{ fontSize: 64, color: 'grey.500', mb: 2 }} />
            <Typography variant="body1" color="white" gutterBottom>
              Camera Ready
            </Typography>
            <Button variant="contained" onClick={startCamera} startIcon={<VideocamIcon />}>
              Start Camera
            </Button>
          </Box>
        )}

        {/* Error States */}
        {(permissionState === 'denied' || permissionState === 'error') && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: 400,
            }}
          >
            <Alert
              severity="error"
              icon={<ErrorOutlineIcon />}
              action={
                <Button color="inherit" size="small" onClick={retryCamera}>
                  Retry
                </Button>
              }
            >
              <Typography variant="body2">{errorMessage}</Typography>
            </Alert>
          </Box>
        )}
      </Box>
    );
  }
);

CameraFeed.displayName = 'CameraFeed';
