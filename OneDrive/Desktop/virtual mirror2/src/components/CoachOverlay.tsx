import { useEffect, useRef } from 'react';
import { Chip, LinearProgress, Box, Typography, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { speak } from '../utils/voice';
import type { TaskUpdate } from '../logic/tasks';

interface CoachOverlayProps {
  taskUpdate: TaskUpdate | null;
  currentTaskName?: string;
}

// Mapping of task states to Arabic voice feedback
const VOICE_MAP: Record<string, string> = {
  'raise-low': 'ارفع يدك أعلى',
  'raise-almost': 'ممتاز، قربت',
  'raise-hold': 'ثبّت اليد لمدة ثانية',
  'raise-success': 'رائع',
  'oneleg-prompt': 'ارفَع قدمك واثبت',
  'oneleg-sway': 'اثبت مكانك',
  'oneleg-success': 'رائع',
  'walk-prompt': 'امش بشكل طبيعي',
  'walk-success': 'ممتاز',
  'jump-prompt': 'اقفز مرة واحدة',
  'jump-success': 'رائع',
};

const CoachOverlay = ({ taskUpdate, currentTaskName }: CoachOverlayProps) => {
  const lastSpeechTime = useRef<number>(0);
  const lastMessageLevel = useRef<string>('');

  // Helper to speak with debouncing
  const speakIfChanged = (level: string) => {
    const now = Date.now();
    const timeSinceLastSpeech = now - lastSpeechTime.current;
    
    // Only speak if level changed and enough time passed (1.2s debounce)
    if (level !== lastMessageLevel.current && timeSinceLastSpeech >= 1200) {
      const arabicText = VOICE_MAP[level];
      if (arabicText) {
        lastMessageLevel.current = level;
        lastSpeechTime.current = now;
        speak(arabicText).catch(err => console.error('Speech error:', err));
      }
    }
  };

  // Helper to render task-specific HUD
  const renderHUD = () => {
    if (!taskUpdate || !taskUpdate.metrics || !currentTaskName) return null;

    const { metrics } = taskUpdate;

    // Show "✓ Done" briefly when task completes
    if (taskUpdate.done) {
      return (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 20,
            padding: 3,
            bgcolor: 'success.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            zIndex: 1001,
            fontSize: '1.5rem',
            fontWeight: 700,
          }}
        >
          <CheckCircleIcon sx={{ fontSize: '2rem' }} />
          Done!
        </Paper>
      );
    }

    // Task-specific HUD
    if (currentTaskName === 'one_leg' && typeof metrics.holdTime === 'number') {
      const minutes = Math.floor(metrics.holdTime / 60);
      const seconds = Math.floor(metrics.holdTime % 60);
      const tenths = Math.floor((metrics.holdTime % 1) * 10);
      
      return (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 20,
            padding: 2,
            bgcolor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            zIndex: 1001,
            minWidth: 120,
          }}
        >
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.7, mb: 0.5 }}>
            Balance Time
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}.{tenths}
          </Typography>
        </Paper>
      );
    }

    if (currentTaskName === 'walk' && typeof metrics.stepCount === 'number') {
      return (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 20,
            padding: 2,
            bgcolor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            zIndex: 1001,
            minWidth: 120,
          }}
        >
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.7, mb: 0.5 }}>
            Steps
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
            {metrics.stepCount}
          </Typography>
        </Paper>
      );
    }

    if (currentTaskName === 'jump' && typeof metrics.jumpHeightPixels === 'number') {
      // Convert pixels to approximate cm (assuming ~1080p height ≈ 180cm for a person)
      const heightCm = Math.round((metrics.jumpHeightPixels / 1080) * 180);
      
      return (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 20,
            padding: 2,
            bgcolor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            zIndex: 1001,
            minWidth: 120,
          }}
        >
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.7, mb: 0.5 }}>
            Jump Height
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
            {heightCm} <Typography component="span" variant="h6">cm</Typography>
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.5, fontSize: '0.7rem' }}>
            ({metrics.jumpHeightPixels}px)
          </Typography>
        </Paper>
      );
    }

    return null;
  };

  // Trigger voice feedback when level changes
  useEffect(() => {
    if (taskUpdate) {
      // Create a unique level key based on message + level
      const levelKey = `${taskUpdate.level}-${taskUpdate.message.substring(0, 10)}`;
      speakIfChanged(levelKey);
    }
  }, [taskUpdate?.level, taskUpdate?.message]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!taskUpdate) {
    return null;
  }

  const progressPercent = Math.round(taskUpdate.progress * 100);

  return (
    <>
      {/* Task-Specific HUD (bottom-right) */}
      {renderHUD()}

      {/* Bottom Progress Bar */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{
            height: 8,
            '& .MuiLinearProgress-bar': {
              bgcolor: taskUpdate.level === 'success' ? 'success.main' : 
                       taskUpdate.level === 'warning' ? 'warning.main' : 
                       'primary.main',
            },
          }}
        />
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Chip
            label={taskUpdate.message}
            color={taskUpdate.level === 'success' ? 'success' : 
                   taskUpdate.level === 'warning' ? 'warning' : 
                   'info'}
            sx={{
              fontSize: '1rem',
              fontWeight: 600,
              py: 2,
              px: 2,
            }}
          />
          <Chip
            label={`${progressPercent}%`}
            variant="outlined"
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          />
        </Box>
      </Box>
    </>
  );
};

export default CoachOverlay;
