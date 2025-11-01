import { Button, Stack, Switch, FormControlLabel, Box } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

interface SessionControlsProps {
  onStart: () => void;
  onStop: () => void;
  recording: boolean;
  onToggleRecording: (value: boolean) => void;
  isRunning?: boolean;
}

const SessionControls = ({
  onStart,
  onStop,
  recording,
  onToggleRecording,
  isRunning = false,
}: SessionControlsProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 1,
      }}
    >
      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon />}
          onClick={onStart}
          disabled={isRunning}
          size="large"
        >
          Start
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<StopIcon />}
          onClick={onStop}
          disabled={!isRunning}
          size="large"
        >
          Stop
        </Button>
      </Stack>

      <FormControlLabel
        control={
          <Switch
            checked={recording}
            onChange={(e) => onToggleRecording(e.target.checked)}
            color="error"
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FiberManualRecordIcon
              sx={{
                fontSize: '1rem',
                color: recording ? 'error.main' : 'action.disabled',
              }}
            />
            Record
          </Box>
        }
      />
    </Box>
  );
};

export default SessionControls;
