import { useState, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CameraFeed } from '../components/CameraFeed';
import { PoseDetector } from '../components/PoseDetector';
import CoachOverlay from '../components/CoachOverlay';
import SessionControls from '../components/SessionControls';
import { useSessionStore } from '../store/session';
import type { TaskMetric } from '../store/session';
import { tasks, TASK_SEQUENCE } from '../logic/tasks';
import type { TaskUpdate } from '../logic/tasks';

const SessionPageOrchestrator = () => {
  const navigate = useNavigate();
  const setCurrent = useSessionStore((state) => state.setCurrent);
  
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [completedTasks, setCompletedTasks] = useState<TaskMetric[]>([]);
  const [showResultsDialog, setShowResultsDialog] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);
  const [taskUpdate, setTaskUpdate] = useState<TaskUpdate | null>(null);
  
  const currentTaskName = TASK_SEQUENCE[currentTaskIndex];
  const currentTask = tasks[currentTaskName];

  // Start session
  const handleStart = async () => {
    setIsRunning(true);
    setSessionStartTime(new Date().toISOString());
    setCurrentTaskIndex(0);
    setCompletedTasks([]);
    
    // Start first task
    tasks[TASK_SEQUENCE[0]].start();
  };

  // Stop session
  const handleStop = () => {
    setIsRunning(false);
    setRecording(false);
    
    // Stop current task
    currentTask.stop();
  };

  const handleToggleRecording = (value: boolean) => {
    setRecording(value);
  };

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
    console.log('SESSION: Video ready');
  }, []);

  // Handle pose detection results
  const handlePoseResult = useCallback((detectedLandmarks: any) => {
    if (!isRunning || !detectedLandmarks || detectedLandmarks.length === 0) {
      return;
    }

    // Update current task with landmarks
    const update = currentTask.update(detectedLandmarks);
    setTaskUpdate(update);

    // Check if task is complete
    if (update.done && update.metrics) {
      const taskMetric: TaskMetric = {
        task: currentTaskName as any,
        metrics: update.metrics,
      };
      
      setCompletedTasks((prev) => [...prev, taskMetric]);
      
      // Move to next task or complete session
      if (currentTaskIndex < TASK_SEQUENCE.length - 1) {
        // Celebration delay before next task
        setTimeout(() => {
          const nextIndex = currentTaskIndex + 1;
          setCurrentTaskIndex(nextIndex);
          
          // Start next task
          tasks[TASK_SEQUENCE[nextIndex]].start();
          setTaskUpdate(null);
        }, 1000);
      } else {
        // All tasks complete
        setTimeout(() => {
          completeSession([...completedTasks, taskMetric]);
        }, 1000);
      }
    }
  }, [isRunning, currentTask, currentTaskName, currentTaskIndex, completedTasks]);

  const completeSession = (allTasks: TaskMetric[]) => {
    // Extract metrics from each task
    const oneLegMetrics = allTasks.find(t => t.task === 'one_leg')?.metrics;
    const raiseHandMetrics = allTasks.find(t => t.task === 'raise_hand')?.metrics;
    const walkMetrics = allTasks.find(t => t.task === 'walk')?.metrics;
    
    // Calculate overall risk using specified criteria
    let overallRisk: 'normal' | 'monitor' | 'high' = 'normal';
    
    const oneLegHoldTime = oneLegMetrics?.holdTime as number | undefined;
    const shoulderFlexionMax = raiseHandMetrics?.shoulderFlexionMax as number | undefined;
    const walkSymmetry = walkMetrics?.symmetryPercent as number | undefined;
    
    // Check for "monitor" conditions
    const lowBalance = oneLegHoldTime !== undefined && oneLegHoldTime < 5;
    const lowFlexion = shoulderFlexionMax !== undefined && shoulderFlexionMax < 120;
    
    // Check for "high" conditions
    const poorSymmetry = walkSymmetry !== undefined && (100 - walkSymmetry) > 20; // asymmetry > 20%
    const bothBelowThreshold = lowBalance && lowFlexion;
    
    if (bothBelowThreshold || poorSymmetry) {
      overallRisk = 'high';
    } else if (lowBalance || lowFlexion) {
      overallRisk = 'monitor';
    } else {
      overallRisk = 'normal';
    }
    
    const summary = {
      sessionId: `SESSION-${Date.now()}`,
      childAgeYears: 8,
      startedAt: sessionStartTime,
      endedAt: new Date().toISOString(),
      overallRisk,
      tasks: allTasks,
    };
    
    console.log('Session completed:', summary);
    console.log('Risk factors:', {
      oneLegHoldTime,
      shoulderFlexionMax,
      walkSymmetry,
      lowBalance,
      lowFlexion,
      poorSymmetry,
      overallRisk,
    });
    
    setCurrent(summary);
    setIsRunning(false);
    setShowResultsDialog(true);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Session Controls */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <SessionControls
            onStart={handleStart}
            onStop={handleStop}
            recording={recording}
            onToggleRecording={handleToggleRecording}
            isRunning={isRunning}
          />
          <Chip 
            label={isRunning ? "Running" : "Idle"} 
            color={isRunning ? "success" : "default"}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </Box>

      {/* Task Pills */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} justifyContent="center">
          {TASK_SEQUENCE.map((task, idx) => (
            <Chip
              key={task}
              label={task.replace('_', ' ')}
              color={idx < currentTaskIndex ? 'success' : idx === currentTaskIndex ? 'primary' : 'default'}
              variant={idx === currentTaskIndex ? 'filled' : 'outlined'}
              size="medium"
              sx={{ 
                fontWeight: idx === currentTaskIndex ? 700 : 500,
                fontSize: '0.875rem',
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Camera and Pose Detection */}
      <Box sx={{ position: 'relative', height: '70vh', bgcolor: 'black', borderRadius: 2, overflow: 'hidden' }}>
        <CameraFeed onVideoReady={handleVideoReady} autoStart={true} />
        <PoseDetector 
          running={isRunning}
          videoRef={videoRef}
          onResult={handlePoseResult}
          showVisualization={true}
        />
      </Box>

      {/* Coach Overlay with Progress Bar */}
      {isRunning && taskUpdate && (
        <CoachOverlay taskUpdate={taskUpdate} currentTaskName={currentTaskName} />
      )}

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Assessment Complete!</DialogTitle>
        <DialogContent>
          All tasks have been completed. Would you like to view the results as a parent or clinician?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/results/parent')} variant="contained">
            Parent View
          </Button>
          <Button onClick={() => navigate('/results/clinician')} variant="outlined">
            Clinician View
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SessionPageOrchestrator;
