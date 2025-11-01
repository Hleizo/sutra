import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  DeleteSweep as DeleteSweepIcon,
  Assessment as AssessmentIcon,
  Home as HomeIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import sessionStorage, { type StoredSession } from '../services/sessionStorage';

const SessionHistory: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    loadSessions();
    loadStatistics();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [sessions, searchQuery, filterRisk]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const allSessions = await sessionStorage.getAllSessions({
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      setSessions(allSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await sessionStorage.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const filterSessions = () => {
    let filtered = sessions;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session =>
        session.id.toLowerCase().includes(query) ||
        session.patientName?.toLowerCase().includes(query) ||
        session.notes?.toLowerCase().includes(query) ||
        session.analysisResults?.classification?.toLowerCase().includes(query)
      );
    }

    // Risk level filter
    if (filterRisk !== 'all') {
      filtered = filtered.filter(session =>
        session.analysisResults?.risk_level === filterRisk
      );
    }

    setFilteredSessions(filtered);
  };

  const handleViewSession = (sessionId: string) => {
    navigate(`/results?sessionId=${sessionId}`);
  };

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (sessionToDelete) {
      try {
        await sessionStorage.deleteSession(sessionToDelete);
        await loadSessions();
        await loadStatistics();
        setDeleteDialogOpen(false);
        setSessionToDelete(null);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const handleClearAll = async () => {
    try {
      await sessionStorage.clearAllSessions();
      await loadSessions();
      await loadStatistics();
      setClearAllDialogOpen(false);
    } catch (error) {
      console.error('Failed to clear sessions:', error);
    }
  };

  const handleExport = async () => {
    try {
      const jsonData = await sessionStorage.exportSessions();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sessions-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export sessions:', error);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          await sessionStorage.importSessions(text);
          await loadSessions();
          await loadStatistics();
        } catch (error) {
          console.error('Failed to import sessions:', error);
        }
      }
    };
    input.click();
  };

  const getRiskColor = (riskLevel?: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (riskLevel?.toLowerCase()) {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            📋 Session History
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
            >
              Home
            </Button>
            <Button
              variant="outlined"
              startIcon={<AssessmentIcon />}
              onClick={() => navigate('/session')}
            >
              New Session
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        {statistics && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Card sx={{ flex: 1, minWidth: 200 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Total Sessions</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {statistics.totalSessions}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 200 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">This Week</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {statistics.sessionsThisWeek}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 200 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">This Month</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                  {statistics.sessionsThisMonth}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 200 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Avg Duration</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {Math.round(statistics.averageDuration)}s
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Filters and Actions */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search sessions..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ flexGrow: 1, minWidth: 250 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Risk Level</InputLabel>
              <Select
                value={filterRisk}
                label="Risk Level"
                onChange={(e) => setFilterRisk(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="moderate">Moderate</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Export Sessions">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                >
                  Export
                </Button>
              </Tooltip>
              
              <Tooltip title="Import Sessions">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UploadIcon />}
                  onClick={handleImport}
                >
                  Import
                </Button>
              </Tooltip>
              
              <Tooltip title="Clear All Sessions">
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteSweepIcon />}
                  onClick={() => setClearAllDialogOpen(true)}
                  disabled={sessions.length === 0}
                >
                  Clear All
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* Sessions Table */}
        {filteredSessions.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            {searchQuery || filterRisk !== 'all' 
              ? 'No sessions match your filters.' 
              : 'No sessions recorded yet. Start a new assessment to create your first session.'}
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Patient</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Age</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Duration</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Risk Level</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Classification</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSessions.map((session) => (
                  <TableRow key={session.id} hover>
                    <TableCell>{formatDate(session.date)}</TableCell>
                    <TableCell>{session.patientName || 'Anonymous'}</TableCell>
                    <TableCell>{session.patientAge || 'N/A'}</TableCell>
                    <TableCell>{session.duration}s</TableCell>
                    <TableCell>
                      <Chip
                        label={session.analysisResults?.risk_level?.toUpperCase() || 'UNKNOWN'}
                        color={getRiskColor(session.analysisResults?.risk_level)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {session.analysisResults?.classification || 'N/A'}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewSession(session.id)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(session.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Session?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this session? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Clear All Confirmation Dialog */}
        <Dialog open={clearAllDialogOpen} onClose={() => setClearAllDialogOpen(false)}>
          <DialogTitle>Clear All Sessions?</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will permanently delete all {sessions.length} sessions. This action cannot be undone.
            </Alert>
            <Typography>
              Consider exporting your sessions before clearing them.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearAllDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleClearAll} color="error" variant="contained">
              Clear All
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default SessionHistory;
