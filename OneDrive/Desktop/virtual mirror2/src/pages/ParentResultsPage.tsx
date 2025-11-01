import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useSessionStore } from '../store/session';

const ParentResultsPage = () => {
  const navigate = useNavigate();
  const summary = useSessionStore((state) => state.current);

  if (!summary) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">
          No session found. Please complete a session first or load demo results.
        </Alert>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Go to Home
        </Button>
      </Container>
    );
  }

  const getRiskMessage = () => {
    switch (summary.overallRisk) {
      case 'normal':
        return {
          message: 'Looks good! Your child shows typical motor development.',
          color: 'success' as const,
          icon: <CheckCircleIcon />,
        };
      case 'monitor':
        return {
          message: 'Some values are borderline — consider rechecking in a few weeks.',
          color: 'warning' as const,
          icon: <WarningIcon />,
        };
      case 'high':
        return {
          message: 'Consider seeing a pediatric physiotherapist for evaluation.',
          color: 'error' as const,
          icon: <ErrorIcon />,
        };
      default:
        return {
          message: 'Assessment complete.',
          color: 'info' as const,
          icon: <CheckCircleIcon />,
        };
    }
  };

  const riskInfo = getRiskMessage();

  const getTaskMessage = (taskName: string) => {
    switch (taskName) {
      case 'raise_hand':
        return 'Arm movements look coordinated and symmetrical.';
      case 'one_leg':
        return 'Balance is developing appropriately for their age.';
      case 'walk':
        return 'Walking pattern appears smooth and coordinated.';
      case 'jump':
        return 'Jumping and landing show good coordination.';
      default:
        return 'Task completed successfully.';
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
        Assessment Results
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Session completed on {new Date(summary.startedAt).toLocaleDateString()}
        {summary.childAgeYears && ` • Child age: ${summary.childAgeYears} years`}
      </Typography>

      {/* Overall Risk Banner */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 3,
          bgcolor: riskInfo.color === 'success' ? 'success.light' : 
                   riskInfo.color === 'warning' ? 'warning.light' : 'error.light',
          borderRadius: 2,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ fontSize: '2rem' }}>{riskInfo.icon}</Box>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Overall Assessment
            </Typography>
            <Typography variant="body1">{riskInfo.message}</Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Task Cards */}
      <Typography variant="h6" gutterBottom fontWeight={600}>
        Activity Details
      </Typography>
      <Stack spacing={2} sx={{ mb: 3 }}>
        {summary.tasks.map((task, index) => (
          <Card key={index} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <CheckCircleIcon color="success" sx={{ fontSize: '2rem' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {task.task.replace('_', ' ').toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getTaskMessage(task.task)}
                  </Typography>
                  {task.flags && task.flags.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {task.flags.map((flag, i) => (
                        <Chip
                          key={i}
                          label={flag}
                          size="small"
                          color="warning"
                          sx={{ mr: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Actions */}
      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled
          sx={{ flex: 1 }}
        >
          Download PDF Report
        </Button>
        <Button
          variant="outlined"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{ flex: 1 }}
        >
          Back to Home
        </Button>
      </Stack>
    </Container>
  );
};

export default ParentResultsPage;
