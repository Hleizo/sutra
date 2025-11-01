import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  IconButton,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Replay as ReplayIcon,
} from '@mui/icons-material';
import PoseReplay from './PoseReplay';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface SessionDetailViewProps {
  session: {
    id: number;
    task_type: string;
    created_at: string;
    duration?: number | null;
    status: string;
    risk_level?: string | null;
    childAge?: number;
    stability_score?: number | null;
    balance_score?: number | null;
    symmetry_score?: number | null;
    rom_score?: number | null;
    risk_score?: number | null;
  };
  onClose: () => void;
  onDownload: () => void;
}

const SessionDetailView: React.FC<SessionDetailViewProps> = ({
  session,
  onClose,
  onDownload,
}) => {
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [romData, setRomData] = useState<any[]>([]);
  const [symmetryData, setSymmetryData] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [showReplay, setShowReplay] = useState(false);
  const [poseData, setPoseData] = useState<any[]>([]);
  const [loadingReplay, setLoadingReplay] = useState(false);

  useEffect(() => {
    // Generate mock data for charts (in real app, this would come from backend)
    generateMockChartData();
  }, [session]);

  const generateMockChartData = () => {
    // Time series data - stability over time
    const timeSeries = [];
    for (let i = 0; i < 10; i++) {
      timeSeries.push({
        time: `${i}s`,
        stability: 70 + Math.random() * 25,
        balance: 65 + Math.random() * 30,
        target: 85,
      });
    }
    setTimeSeriesData(timeSeries);

    // ROM (Range of Motion) data
    const rom = [
      { joint: 'Hip', left: 75 + Math.random() * 20, right: 75 + Math.random() * 20, normal: 90 },
      { joint: 'Knee', left: 80 + Math.random() * 15, right: 80 + Math.random() * 15, normal: 90 },
      { joint: 'Ankle', left: 70 + Math.random() * 20, right: 70 + Math.random() * 20, normal: 85 },
      { joint: 'Shoulder', left: 85 + Math.random() * 10, right: 85 + Math.random() * 10, normal: 95 },
    ];
    setRomData(rom);

    // Symmetry data
    const symmetry = [
      { metric: 'Weight Distribution', value: 45 + Math.random() * 10, ideal: 50 },
      { metric: 'Stance Width', value: 48 + Math.random() * 8, ideal: 50 },
      { metric: 'Hip Alignment', value: 47 + Math.random() * 6, ideal: 50 },
      { metric: 'Shoulder Level', value: 49 + Math.random() * 4, ideal: 50 },
    ];
    setSymmetryData(symmetry);

    // Radar chart data - overall assessment
    const radar = [
      {
        metric: 'Stability',
        score: session.stability_score || 75 + Math.random() * 20,
        fullMark: 100,
      },
      {
        metric: 'Balance',
        score: session.balance_score || 70 + Math.random() * 25,
        fullMark: 100,
      },
      {
        metric: 'Symmetry',
        score: session.symmetry_score || 80 + Math.random() * 15,
        fullMark: 100,
      },
      {
        metric: 'ROM',
        score: session.rom_score || 75 + Math.random() * 20,
        fullMark: 100,
      },
      {
        metric: 'Posture',
        score: 70 + Math.random() * 25,
        fullMark: 100,
      },
    ];
    setRadarData(radar);
  };

  const getRiskColor = (riskLevel?: string | null): 'error' | 'warning' | 'success' => {
    switch (riskLevel?.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'normal':
      case 'low':
        return 'success';
      default:
        return 'success';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const getScoreIcon = (score: number) => {
    return score >= 70 ? (
      <TrendingUpIcon sx={{ color: '#4caf50', ml: 1 }} />
    ) : (
      <TrendingDownIcon sx={{ color: '#f44336', ml: 1 }} />
    );
  };

  const loadPoseDataForReplay = async () => {
    setLoadingReplay(true);
    try {
      // In real app, fetch from backend: GET /api/sessions/{id}/pose-data
      // For now, generate mock pose data
      const mockPoseData = generateMockPoseData();
      setPoseData(mockPoseData);
      setShowReplay(true);
    } catch (error) {
      console.error('Error loading pose data:', error);
      alert('Failed to load pose data for replay');
    } finally {
      setLoadingReplay(false);
    }
  };

  const generateMockPoseData = () => {
    // Generate 300 frames (10 seconds at 30 FPS)
    const frames = [];
    const duration = session.duration || 10;
    const fps = 30;
    const totalFrames = Math.floor(duration * fps);

    for (let i = 0; i < totalFrames; i++) {
      const timestamp = (i / fps) * 1000; // milliseconds
      const t = i / totalFrames; // normalized time 0-1
      
      // Generate 33 pose landmarks (MediaPipe Pose format)
      const landmarks = [];
      for (let j = 0; j < 33; j++) {
        // Create realistic body movement (slight sway)
        const swayX = Math.sin(t * Math.PI * 2) * 0.02;
        const swayY = Math.cos(t * Math.PI * 3) * 0.01;
        
        // Base positions for different body parts
        let baseX = 0.5;
        let baseY = 0.5;
        
        if (j < 11) { // Head/face
          baseY = 0.2 + j * 0.02;
        } else if (j < 17) { // Upper body/arms
          baseY = 0.3 + (j - 11) * 0.05;
          baseX = j % 2 === 0 ? 0.4 : 0.6;
        } else if (j < 23) { // Hands
          baseY = 0.5;
          baseX = j % 2 === 0 ? 0.3 : 0.7;
        } else { // Legs
          baseY = 0.6 + (j - 23) * 0.08;
          baseX = j % 2 === 0 ? 0.45 : 0.55;
        }

        landmarks.push({
          x: baseX + swayX + (Math.random() - 0.5) * 0.01,
          y: baseY + swayY + (Math.random() - 0.5) * 0.01,
          z: -0.5 + (Math.random() - 0.5) * 0.1,
          visibility: 0.9 + Math.random() * 0.1,
        });
      }

      frames.push({
        frame_number: i,
        timestamp,
        landmarks,
      });
    }

    return frames;
  };

  const handleCloseReplay = () => {
    setShowReplay(false);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={onClose} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            Session #{session.id} - Detailed Analysis
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ReplayIcon />}
            onClick={loadPoseDataForReplay}
            disabled={loadingReplay}
            sx={{ mr: 2 }}
          >
            {loadingReplay ? 'Loading...' : 'Replay'}
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={onDownload}
            disabled={session.status !== 'processed'}
          >
            Download Report
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {formatDate(session.created_at)}
        </Typography>
      </Box>

      {/* Session Info Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Task Type
              </Typography>
              <Typography variant="h6">
                {session.task_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Child Age
              </Typography>
              <Typography variant="h6">
                {session.childAge || '-'} years
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Duration
              </Typography>
              <Typography variant="h6">
                {session.duration ? `${session.duration.toFixed(1)}s` : '-'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Risk Level
              </Typography>
              <Chip
                label={session.risk_level || 'Unknown'}
                color={getRiskColor(session.risk_level)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Score Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Stability Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography 
                variant="h3" 
                sx={{ color: getScoreColor(session.stability_score || 0) }}
              >
                {session.stability_score?.toFixed(0) || '-'}
              </Typography>
              {session.stability_score && getScoreIcon(session.stability_score)}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Balance Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography 
                variant="h3" 
                sx={{ color: getScoreColor(session.balance_score || 0) }}
              >
                {session.balance_score?.toFixed(0) || '-'}
              </Typography>
              {session.balance_score && getScoreIcon(session.balance_score)}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Symmetry Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography 
                variant="h3" 
                sx={{ color: getScoreColor(session.symmetry_score || 0) }}
              >
                {session.symmetry_score?.toFixed(0) || '-'}
              </Typography>
              {session.symmetry_score && getScoreIcon(session.symmetry_score)}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Risk Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography 
                variant="h3" 
                sx={{ 
                  color: (session.risk_score || 0) >= 67 ? '#f44336' : 
                         (session.risk_score || 0) >= 34 ? '#ff9800' : '#4caf50'
                }}
              >
                {session.risk_score?.toFixed(0) || '-'}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Overall Performance Radar */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Overall Performance Assessment
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#2196f3"
                  fill="#2196f3"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Stability Over Time */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Stability & Balance Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="stability"
                  stackId="1"
                  stroke="#4caf50"
                  fill="#4caf50"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stackId="2"
                  stroke="#2196f3"
                  fill="#2196f3"
                  fillOpacity={0.6}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#ff9800"
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Range of Motion */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Range of Motion (ROM) Analysis
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={romData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="joint" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="left" fill="#2196f3" name="Left Side" />
                <Bar dataKey="right" fill="#4caf50" name="Right Side" />
                <Bar dataKey="normal" fill="#ffc107" name="Normal Range" fillOpacity={0.3} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Symmetry Analysis */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Symmetry Analysis
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={symmetryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="metric" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#9c27b0" name="Measured" />
                <Bar dataKey="ideal" fill="#e0e0e0" name="Ideal" fillOpacity={0.3} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Key Findings */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Key Findings & Recommendations
        </Typography>
        <Divider sx={{ my: 2 }} />
        <List>
          {session.risk_level === 'high' && (
            <ListItem>
              <Alert severity="error" sx={{ width: '100%' }}>
                <Typography variant="body2">
                  <strong>High Fall Risk:</strong> Immediate intervention recommended. Consider
                  physical therapy and balance training exercises.
                </Typography>
              </Alert>
            </ListItem>
          )}
          {session.risk_level === 'medium' && (
            <ListItem>
              <Alert severity="warning" sx={{ width: '100%' }}>
                <Typography variant="body2">
                  <strong>Medium Fall Risk:</strong> Preventive measures suggested. Regular
                  balance exercises and monitoring recommended.
                </Typography>
              </Alert>
            </ListItem>
          )}
          {(session.stability_score || 0) < 70 && (
            <ListItem>
              <ListItemText
                primary="Stability Improvement Needed"
                secondary="Focus on core strengthening exercises and single-leg balance drills."
              />
            </ListItem>
          )}
          {(session.balance_score || 0) < 70 && (
            <ListItem>
              <ListItemText
                primary="Balance Training Recommended"
                secondary="Practice weight shifting exercises and use of balance boards."
              />
            </ListItem>
          )}
          {(session.symmetry_score || 0) < 70 && (
            <ListItem>
              <ListItemText
                primary="Asymmetry Detected"
                secondary="Consider assessment by physical therapist to address muscular imbalances."
              />
            </ListItem>
          )}
          {session.risk_level === 'normal' && 
           (session.stability_score || 0) >= 70 && 
           (session.balance_score || 0) >= 70 && (
            <ListItem>
              <Alert severity="success" sx={{ width: '100%' }}>
                <Typography variant="body2">
                  <strong>Good Performance:</strong> Continue regular physical activity and
                  periodic reassessment.
                </Typography>
              </Alert>
            </ListItem>
          )}
        </List>
      </Paper>

      {/* Replay Dialog */}
      <Dialog
        open={showReplay}
        onClose={handleCloseReplay}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Pose Replay - Session #{session.id}
        </DialogTitle>
        <DialogContent>
          <PoseReplay
            poseData={poseData}
            width={640}
            height={480}
            onComplete={() => {}}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReplay}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SessionDetailView;
