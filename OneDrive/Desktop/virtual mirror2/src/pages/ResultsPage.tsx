// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Paper,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material';
import sessionStorage from '../services/sessionStorage';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Home as HomeIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  AccessibilityNew as AccessibilityIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

// Types
interface TaskResult {
  success: boolean;
  [key: string]: any;
}

interface SymmetryData {
  left_avg: number;
  right_avg: number;
  difference: number;
  percentage: number;
}

interface ClinicalAnalysis {
  classification: string;
  confidence: number;
  age_group: string;
  flags: string[];
  detailed_metrics: {
    rom?: any;
    balance?: any;
    symmetry?: any;
    gait?: any;
  };
}

interface SessionSummary {
  session_id: string;
  patient_name?: string;
  patient_age?: number;
  session_date: string;
  duration: number;
  data_points: number;
  symmetry?: Record<string, SymmetryData>;
  task_results?: {
    raise_hand?: TaskResult;
    balance?: TaskResult;
    walk?: TaskResult;
    jump?: TaskResult;
  };
  clinical_analysis?: ClinicalAnalysis;
}

interface AnalysisResult {
  summary: SessionSummary;
  risk_level: string;
  recommendations: string[];
}

const ResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  
  const sessionId = location.state?.sessionId || 'unknown';

  useEffect(() => {
    fetchAnalysisResults();
  }, [sessionId]);

  const fetchAnalysisResults = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real scenario, this would fetch from the backend
      // For now, we'll use the data passed via location state
      const sessionData = location.state?.sessionData;
      
      if (!sessionData) {
        throw new Error('No session data available');
      }

      // Simulate API call to backend
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: AnalysisResult = await response.json();
      setAnalysisData(data);
      
      // Save analysis results back to session
      if (sessionId !== 'unknown') {
        await sessionStorage.updateSession(sessionId, {
          analysisResults: {
            risk_level: data.risk_level,
            classification: data.summary.clinical_analysis?.classification || 'Unknown',
            confidence: data.summary.clinical_analysis?.confidence || 0,
            flags: data.summary.clinical_analysis?.flags || [],
            recommendations: data.recommendations,
            detailed_metrics: data.summary.clinical_analysis?.detailed_metrics
          }
        });
      }
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis results');
      
      // Fallback to mock data for demo purposes
      setAnalysisData(getMockAnalysisData());
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!analysisData) return;
    
    setDownloadingPdf(true);
    try {
      const response = await fetch(`http://localhost:8000/api/report/${sessionId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF report');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movement-report-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF report. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'high':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return <CheckCircleIcon />;
      case 'moderate':
        return <WarningIcon />;
      case 'high':
        return <ErrorIcon />;
      default:
        return <AssessmentIcon />;
    }
  };

  const getClassificationColor = (classification: string): 'success' | 'warning' | 'error' | 'default' => {
    if (classification.includes('Normal')) return 'success';
    if (classification.includes('Borderline')) return 'warning';
    if (classification.includes('Weakness')) return 'error';
    return 'default';
  };

  const prepareSymmetryChartData = () => {
    if (!analysisData?.summary.symmetry) return [];
    
    return Object.entries(analysisData.summary.symmetry).map(([joint, data]) => ({
      joint: joint.charAt(0).toUpperCase() + joint.slice(1),
      asymmetry: data.percentage,
      threshold: 10,
      borderline: 5
    }));
  };

  const prepareROMChartData = () => {
    const romData = analysisData?.summary.clinical_analysis?.detailed_metrics?.rom;
    if (!romData) return [];

    const data: any[] = [];
    Object.entries(romData).forEach(([_category, metrics]: [string, any]) => {
      if (metrics.individual_results) {
        Object.entries(metrics.individual_results).forEach(([joint, result]: [string, any]) => {
          data.push({
            joint: joint.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            value: result.value || 0,
            status: result.status || 'Unknown'
          });
        });
      }
    });

    return data;
  };

  const prepareRadarChartData = () => {
    if (!analysisData?.summary.task_results) return [];

    const tasks = analysisData.summary.task_results;
    return [
      {
        metric: 'ROM',
        score: tasks.raise_hand?.overallSuccess ? 100 : 50,
        fullMark: 100
      },
      {
        metric: 'Balance',
        score: tasks.balance?.stabilityScore || 0,
        fullMark: 100
      },
      {
        metric: 'Symmetry',
        score: tasks.walk?.gaitSymmetry ? (100 - tasks.walk.gaitSymmetry) : 50,
        fullMark: 100
      },
      {
        metric: 'Power',
        score: tasks.jump?.success ? 80 : 40,
        fullMark: 100
      },
      {
        metric: 'Control',
        score: tasks.jump?.landingControl || 50,
        fullMark: 100
      }
    ];
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: '#f5f5f5'
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Analyzing movement data...
        </Typography>
      </Box>
    );
  }

  if (error && !analysisData) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={fetchAnalysisResults}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (!analysisData) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">No analysis data available</Alert>
      </Container>
    );
  }

  const { summary, risk_level, recommendations } = analysisData;

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Movement Assessment Report
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Session ID: {summary.session_id} | Date: {summary.session_date}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh Analysis">
                <IconButton onClick={fetchAnalysisResults} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Return Home">
                <IconButton onClick={() => navigate('/')} color="primary">
                  <HomeIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Patient Info */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">Patient Age</Typography>
              <Typography variant="h6">{summary.patient_age || 'N/A'} years</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">Duration</Typography>
              <Typography variant="h6">{summary.duration} seconds</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">Data Points</Typography>
              <Typography variant="h6">{summary.data_points}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">Age Group</Typography>
              <Typography variant="h6">{summary.clinical_analysis?.age_group || 'N/A'}</Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Risk Assessment */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getRiskIcon(risk_level)}
                  <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
                    Risk Assessment
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Risk Level
                  </Typography>
                  <Chip
                    label={risk_level.toUpperCase()}
                    color={getRiskColor(risk_level)}
                    sx={{ fontWeight: 'bold', fontSize: '1rem', px: 2, py: 1 }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Classification
                  </Typography>
                  <Chip
                    label={summary.clinical_analysis?.classification || 'Unknown'}
                    color={getClassificationColor(summary.clinical_analysis?.classification || '')}
                    size="large"
                    sx={{ fontWeight: 'bold', fontSize: '1rem' }}
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Confidence
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LinearProgress
                      variant="determinate"
                      value={summary.clinical_analysis?.confidence || 0}
                      sx={{ flexGrow: 1, height: 10, borderRadius: 5, mr: 2 }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {summary.clinical_analysis?.confidence || 0}%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Overall Performance Radar */}
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Overall Performance
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={prepareRadarChartData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#1976d2"
                      fill="#1976d2"
                      fillOpacity={0.6}
                    />
                    <RechartsTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Task Results Cards */}
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Task Performance
        </Typography>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Raise Hand Task */}
          {summary.task_results?.raise_hand && (
            <Grid item xs={12} md={6} lg={3}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    🙋 Raise Hand
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Left Shoulder Max</Typography>
                    <Typography variant="h6">
                      {summary.task_results.raise_hand.leftShoulderMax?.toFixed(1)}°
                      {summary.task_results.raise_hand.leftSuccess ? ' ✓' : ' ✗'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Right Shoulder Max</Typography>
                    <Typography variant="h6">
                      {summary.task_results.raise_hand.rightShoulderMax?.toFixed(1)}°
                      {summary.task_results.raise_hand.rightSuccess ? ' ✓' : ' ✗'}
                    </Typography>
                  </Box>
                  <Chip
                    label={summary.task_results.raise_hand.overallSuccess ? 'Success' : 'Needs Improvement'}
                    color={summary.task_results.raise_hand.overallSuccess ? 'success' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Balance Task */}
          {summary.task_results?.balance && (
            <Grid item xs={12} md={6} lg={3}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    🧘 Balance
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Max Balance Time</Typography>
                    <Typography variant="h6">
                      {((summary.task_results.balance.maxBalanceTime || 0) / 1000).toFixed(1)}s
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Stability Score</Typography>
                    <Typography variant="h6">
                      {summary.task_results.balance.stabilityScore?.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Falls</Typography>
                    <Typography variant="h6">{summary.task_results.balance.fallCount || 0}</Typography>
                  </Box>
                  <Chip
                    label={summary.task_results.balance.balanceLevel || 'Unknown'}
                    color={summary.task_results.balance.success ? 'success' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Walk Task */}
          {summary.task_results?.walk && (
            <Grid item xs={12} md={6} lg={3}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    🚶 Gait Analysis
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Total Steps</Typography>
                    <Typography variant="h6">{summary.task_results.walk.stepCount || 0}</Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Gait Symmetry</Typography>
                    <Typography variant="h6">
                      {summary.task_results.walk.gaitSymmetry?.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Cadence</Typography>
                    <Typography variant="h6">
                      {summary.task_results.walk.cadence?.toFixed(0)} steps/min
                    </Typography>
                  </Box>
                  <Chip
                    label={summary.task_results.walk.symmetryLevel || 'Unknown'}
                    color={summary.task_results.walk.success ? 'success' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Jump Task */}
          {summary.task_results?.jump && (
            <Grid item xs={12} md={6} lg={3}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    🦘 Jump Test
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Jump Count</Typography>
                    <Typography variant="h6">{summary.task_results.jump.jumpCount || 0}</Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Max Height</Typography>
                    <Typography variant="h6">
                      {((summary.task_results.jump.maxJumpHeight || 0) * 100).toFixed(1)} cm
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Landing Control</Typography>
                    <Typography variant="h6">
                      {summary.task_results.jump.landingControl?.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Chip
                    label={summary.task_results.jump.success ? 'Success' : 'Needs Improvement'}
                    color={summary.task_results.jump.success ? 'success' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Charts Section */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Symmetry Chart */}
          {summary.symmetry && Object.keys(summary.symmetry).length > 0 && (
            <Grid item xs={12} lg={6}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    <AccessibilityIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Bilateral Symmetry
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareSymmetryChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="joint" />
                      <YAxis label={{ value: 'Asymmetry (%)', angle: -90, position: 'insideLeft' }} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="asymmetry" name="Asymmetry" radius={[8, 8, 0, 0]}>
                        {prepareSymmetryChartData().map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.asymmetry <= 5
                                ? '#4caf50'
                                : entry.asymmetry <= 10
                                ? '#ff9800'
                                : '#f44336'
                            }
                          />
                        ))}
                      </Bar>
                      <Line type="monotone" dataKey="threshold" stroke="#f44336" strokeDasharray="5 5" name="Abnormal Threshold (10%)" />
                      <Line type="monotone" dataKey="borderline" stroke="#ff9800" strokeDasharray="5 5" name="Borderline (5%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* ROM Chart */}
          {prepareROMChartData().length > 0 && (
            <Grid item xs={12} lg={6}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    <AssessmentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Range of Motion
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareROMChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="joint" angle={-45} textAnchor="end" height={80} />
                      <YAxis label={{ value: 'Angle (degrees)', angle: -90, position: 'insideLeft' }} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="value" name="Measured ROM" radius={[8, 8, 0, 0]}>
                        {prepareROMChartData().map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.status === 'Normal'
                                ? '#4caf50'
                                : entry.status === 'Borderline'
                                ? '#ff9800'
                                : '#f44336'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Recommendations */}
        <Card elevation={3} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              📋 Clinical Recommendations
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {/* Flags */}
            {summary.clinical_analysis?.flags && summary.clinical_analysis.flags.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  ⚠️ Areas of Concern
                </Typography>
                <List>
                  {summary.clinical_analysis.flags.map((flag, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <WarningIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={flag} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {/* Recommendations */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Suggested Actions
            </Typography>
            <List>
              {recommendations.map((rec, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircleIcon color={rec.includes('⚠️') ? 'warning' : 'success'} />
                  </ListItemIcon>
                  <ListItemText primary={rec} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item>
              <Button
                variant="contained"
                size="large"
                startIcon={downloadingPdf ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                sx={{ minWidth: 200 }}
              >
                {downloadingPdf ? 'Generating...' : 'Download PDF Report'}
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={() => navigate('/session')}
                sx={{ minWidth: 200 }}
              >
                New Assessment
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                size="large"
                startIcon={<HomeIcon />}
                onClick={() => navigate('/')}
                sx={{ minWidth: 200 }}
              >
                Back to Home
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Disclaimer */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Important:</strong> This report is generated automatically and should be used as a screening tool only. 
            All results should be reviewed and interpreted by a qualified healthcare professional.
          </Typography>
        </Alert>
      </Container>
    </Box>
  );
};

// Mock data for demo purposes
function getMockAnalysisData(): AnalysisResult {
  return {
    summary: {
      session_id: 'demo-session-' + Date.now(),
      patient_age: 9,
      session_date: new Date().toISOString().split('T')[0],
      duration: 120,
      data_points: 500,
      symmetry: {
        shoulder: { left_avg: 145, right_avg: 150, difference: 5, percentage: 3.4 },
        elbow: { left_avg: 140, right_avg: 135, difference: 5, percentage: 3.6 },
        hip: { left_avg: 135, right_avg: 140, difference: 5, percentage: 3.7 },
        knee: { left_avg: 130, right_avg: 145, difference: 15, percentage: 10.9 }
      },
      task_results: {
        raise_hand: {
          leftShoulderMax: 155,
          rightShoulderMax: 160,
          leftSuccess: true,
          rightSuccess: true,
          overallSuccess: true,
          success: true
        },
        balance: {
          maxBalanceTime: 8500,
          stabilityScore: 75,
          balanceLevel: 'Good',
          fallCount: 1,
          success: true
        },
        walk: {
          stepCount: 15,
          gaitSymmetry: 8.5,
          cadence: 110,
          symmetryLevel: 'Good',
          success: true
        },
        jump: {
          jumpCount: 5,
          maxJumpHeight: 0.25,
          landingControl: 82,
          landingSymmetry: 88,
          success: true
        }
      },
      clinical_analysis: {
        classification: 'Normal',
        confidence: 92,
        age_group: '8-10',
        flags: [],
        detailed_metrics: {
          rom: {
            shoulder_flexion: {
              individual_results: {
                left_shoulder: { value: 155, status: 'Normal', normal_range: '140-170°' },
                right_shoulder: { value: 160, status: 'Normal', normal_range: '140-170°' }
              }
            }
          }
        }
      }
    },
    risk_level: 'low',
    recommendations: [
      '✓ Movement patterns appear normal for age group.',
      '✓ Continue regular physical activity.',
      'Monitor knee symmetry - slight asymmetry detected (10.9%).'
    ]
  };
}

export default ResultsPage;
