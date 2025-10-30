import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Toolbar,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import SessionDetailView from '../components/SessionDetailView.tsx';

interface SessionTableData extends api.SessionResponse {
  childAge?: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionTableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionTableData | null>(null);
  
  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [ageFilter, setAgeFilter] = useState<string>('all');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllSessions();
      // Add mock child age data (in real app, this would come from backend)
      const sessionsWithAge = data.map(session => ({
        ...session,
        childAge: Math.floor(Math.random() * 12) + 5, // Random age 5-16
      }));
      setSessions(sessionsWithAge);
    } catch (err) {
      setError('Failed to load sessions. Please try again.');
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadSessions();
  };

  const handleViewDetails = (session: SessionTableData) => {
    setSelectedSession(session);
  };

  const handleCloseDetails = () => {
    setSelectedSession(null);
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }
    
    try {
      await api.deleteSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('Failed to delete session');
    }
  };

  const handleDownloadReport = async (sessionId: number) => {
    try {
      await api.downloadReport(sessionId);
    } catch (err) {
      console.error('Error downloading report:', err);
      alert('Failed to download report');
    }
  };

  const getRiskColor = (riskLevel: string): 'error' | 'warning' | 'success' => {
    switch (riskLevel.toLowerCase()) {
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      session.id.toString().includes(searchLower) ||
      session.task_type.toLowerCase().includes(searchLower) ||
      (session.childAge?.toString() || '').includes(searchLower);
    
    if (!matchesSearch) return false;

    // Risk filter
    if (riskFilter !== 'all' && session.risk_level?.toLowerCase() !== riskFilter.toLowerCase()) {
      return false;
    }

    // Age filter
    if (ageFilter !== 'all') {
      const age = session.childAge || 0;
      if (ageFilter === 'child' && (age < 5 || age > 12)) return false;
      if (ageFilter === 'teen' && (age < 13 || age > 17)) return false;
      if (ageFilter === 'adult' && age < 18) return false;
    }

    return true;
  });

  // Pagination
  const paginatedSessions = filteredSessions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // If viewing session details, show detail view
  if (selectedSession) {
    return (
      <SessionDetailView
        session={selectedSession}
        onClose={handleCloseDetails}
        onDownload={() => handleDownloadReport(selectedSession.id)}
      />
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            Admin Dashboard
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary">
          View and manage all assessment sessions
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search by ID, task type, or age..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Risk Level</InputLabel>
              <Select
                value={riskFilter}
                label="Risk Level"
                onChange={(e) => setRiskFilter(e.target.value)}
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="high">High Risk</MenuItem>
                <MenuItem value="medium">Medium Risk</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Age Group</InputLabel>
              <Select
                value={ageFilter}
                label="Age Group"
                onChange={(e) => setAgeFilter(e.target.value)}
              >
                <MenuItem value="all">All Ages</MenuItem>
                <MenuItem value="child">Child (5-12)</MenuItem>
                <MenuItem value="teen">Teen (13-17)</MenuItem>
                <MenuItem value="adult">Adult (18+)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Sessions Table */}
      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredSessions.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No sessions found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {searchQuery || riskFilter !== 'all' || ageFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Start an assessment to see sessions here'}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Task Type</TableCell>
                    <TableCell align="center">Child Age</TableCell>
                    <TableCell align="center">Stability</TableCell>
                    <TableCell align="center">Balance</TableCell>
                    <TableCell align="center">Risk Score</TableCell>
                    <TableCell align="center">Risk Level</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSessions.map((session) => (
                    <TableRow key={session.id} hover>
                      <TableCell>#{session.id}</TableCell>
                      <TableCell>{formatDate(session.created_at)}</TableCell>
                      <TableCell>
                        {session.task_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="medium">
                          {session.childAge || '-'} years
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {session.scores?.stability_score !== undefined
                          ? `${session.scores.stability_score.toFixed(1)}%`
                          : '-'}
                      </TableCell>
                      <TableCell align="center">
                        {session.scores?.balance_score !== undefined
                          ? `${session.scores.balance_score.toFixed(1)}%`
                          : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={
                            (session.scores?.risk_score || 0) >= 67
                              ? 'error.main'
                              : (session.scores?.risk_score || 0) >= 34
                              ? 'warning.main'
                              : 'success.main'
                          }
                        >
                          {session.scores?.risk_score !== undefined
                            ? session.scores.risk_score.toFixed(0)
                            : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {session.risk_level ? (
                          <Chip
                            label={session.risk_level}
                            color={getRiskColor(session.risk_level)}
                            size="small"
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={session.status}
                          color={session.status === 'processed' ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewDetails(session)}
                          title="View Details"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleDownloadReport(session.id)}
                          disabled={session.status !== 'processed'}
                          title="Download PDF"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteSession(session.id)}
                          title="Delete"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredSessions.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {sessions.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Sessions
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" color="error">
              {sessions.filter(s => s.risk_level?.toLowerCase() === 'high').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              High Risk
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {sessions.filter(s => s.risk_level?.toLowerCase() === 'medium').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Medium Risk
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {sessions.filter(s => s.risk_level?.toLowerCase() === 'normal').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Normal
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard;
