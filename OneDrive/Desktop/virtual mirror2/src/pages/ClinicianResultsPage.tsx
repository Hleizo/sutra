import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  SaveAlt as ExportIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSessionStore } from '../store/session';

const ClinicianResultsPage = () => {
  const navigate = useNavigate();
  const summary = useSessionStore((state) => state.current);
  const [notes, setNotes] = useState('');

  if (!summary) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
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

  // Prepare chart data
  const chartData = summary.tasks.map((task) => {
    const metrics = task.metrics;
    return {
      name: task.task.replace('_', ' '),
      ...metrics,
    };
  });

  // Collect all flags
  const allFlags = summary.tasks.flatMap((task) => task.flags || []);

  const handleExportJSON = () => {
    const json = JSON.stringify(summary, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${summary.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
        Clinician Assessment Report
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Session ID: {summary.sessionId} • Started: {new Date(summary.startedAt).toLocaleString()}
        {summary.childAgeYears && ` • Age: ${summary.childAgeYears} years`}
      </Typography>

      {/* Risk Level */}
      <Box sx={{ mb: 3 }}>
        <Chip
          label={`Risk Level: ${summary.overallRisk?.toUpperCase() || 'N/A'}`}
          color={
            summary.overallRisk === 'normal' ? 'success' :
            summary.overallRisk === 'monitor' ? 'warning' : 'error'
          }
          sx={{ fontSize: '1rem', py: 2, px: 1 }}
        />
      </Box>

      {/* Metrics Table */}
      <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          Detailed Metrics by Task
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Task</strong></TableCell>
                <TableCell><strong>Metric</strong></TableCell>
                <TableCell><strong>Value</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.tasks.map((task, taskIndex) =>
                Object.entries(task.metrics).map(([key, value], metricIndex) => (
                  <TableRow key={`${taskIndex}-${metricIndex}`}>
                    {metricIndex === 0 && (
                      <TableCell rowSpan={Object.keys(task.metrics).length}>
                        <strong>{task.task.replace('_', ' ').toUpperCase()}</strong>
                      </TableCell>
                    )}
                    <TableCell>{key}</TableCell>
                    <TableCell>
                      {typeof value === 'number' ? value.toFixed(2) : value}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Chart */}
      <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          Metrics Visualization
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="symmetry" fill="#2196F3" name="Symmetry %" />
            <Bar dataKey="balanceTime" fill="#4CAF50" name="Balance Time (s)" />
            <Bar dataKey="holdTime" fill="#FF9800" name="Hold Time (s)" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Flags */}
      {allFlags.length > 0 && (
        <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            Clinical Flags
          </Typography>
          <Stack spacing={1}>
            {allFlags.map((flag, index) => (
              <Alert key={index} severity="warning">
                {flag}
              </Alert>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Notes */}
      <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          Clinical Notes
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Enter clinical observations, recommendations, or follow-up notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          variant="outlined"
        />
      </Paper>

      {/* Actions */}
      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          startIcon={<ExportIcon />}
          onClick={handleExportJSON}
        >
          Export JSON
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          disabled
        >
          Download PDF
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
        >
          Back to Home
        </Button>
      </Stack>
    </Container>
  );
};

export default ClinicianResultsPage;
