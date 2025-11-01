import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Drawer,
  IconButton,
  Button,
  Chip,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRowsProp } from '@mui/x-data-grid';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import type { SessionSummary, TaskMetric } from '../store/session';

// Mock session data
const mockSessions: GridRowsProp = [
  {
    id: 1,
    sessionId: 'SESSION-001',
    date: '2025-11-01',
    patientName: 'Anonymous Child A',
    age: 8,
    riskScore: 75,
    riskLevel: 'moderate',
    duration: 180,
    balanceScore: 85,
    symmetryScore: 87,
    romScore: 92,
    gaitScore: 78,
  },
  {
    id: 2,
    sessionId: 'SESSION-002',
    date: '2025-10-30',
    patientName: 'Anonymous Child B',
    age: 6,
    riskScore: 92,
    riskLevel: 'low',
    duration: 165,
    balanceScore: 94,
    symmetryScore: 91,
    romScore: 89,
    gaitScore: 93,
  },
  {
    id: 3,
    sessionId: 'SESSION-003',
    date: '2025-10-28',
    patientName: 'Anonymous Child C',
    age: 10,
    riskScore: 45,
    riskLevel: 'high',
    duration: 195,
    balanceScore: 52,
    symmetryScore: 48,
    romScore: 55,
    gaitScore: 42,
  },
  {
    id: 4,
    sessionId: 'SESSION-004',
    date: '2025-10-25',
    patientName: 'Anonymous Child D',
    age: 7,
    riskScore: 88,
    riskLevel: 'low',
    duration: 170,
    balanceScore: 90,
    symmetryScore: 85,
    romScore: 88,
    gaitScore: 89,
  },
  {
    id: 5,
    sessionId: 'SESSION-005',
    date: '2025-10-23',
    patientName: 'Anonymous Child E',
    age: 9,
    riskScore: 68,
    riskLevel: 'moderate',
    duration: 188,
    balanceScore: 72,
    symmetryScore: 70,
    romScore: 65,
    gaitScore: 66,
  },
  {
    id: 6,
    sessionId: 'SESSION-006',
    date: '2025-10-20',
    patientName: 'Anonymous Child F',
    age: 5,
    riskScore: 95,
    riskLevel: 'low',
    duration: 160,
    balanceScore: 96,
    symmetryScore: 94,
    romScore: 95,
    gaitScore: 95,
  },
  {
    id: 7,
    sessionId: 'SESSION-007',
    date: '2025-10-18',
    patientName: 'Anonymous Child G',
    age: 11,
    riskScore: 58,
    riskLevel: 'moderate',
    duration: 200,
    balanceScore: 62,
    symmetryScore: 58,
    romScore: 60,
    gaitScore: 55,
  },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const setCurrent = useSessionStore((state) => state.setCurrent);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // Filter sessions based on risk level
  const filteredSessions = riskFilter === 'all'
    ? mockSessions
    : mockSessions.filter((session: any) => session.riskLevel === riskFilter);

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'sessionId',
      headerName: 'Session ID',
      width: 130,
      sortable: true,
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      sortable: true,
      type: 'date',
      valueGetter: (value: any) => new Date(value),
    },
    {
      field: 'patientName',
      headerName: 'Patient',
      width: 180,
      sortable: true,
    },
    {
      field: 'age',
      headerName: 'Age',
      width: 80,
      sortable: true,
      type: 'number',
    },
    {
      field: 'riskScore',
      headerName: 'Score',
      width: 100,
      sortable: true,
      type: 'number',
      renderCell: (params: any) => (
        <Chip
          label={params.value}
          color={
            params.value >= 80 ? 'success' :
            params.value >= 60 ? 'warning' :
            'error'
          }
          size="small"
        />
      ),
    },
    {
      field: 'riskLevel',
      headerName: 'Risk Level',
      width: 120,
      sortable: true,
      renderCell: (params: any) => (
        <Chip
          label={params.value.toUpperCase()}
          color={
            params.value === 'low' ? 'success' :
            params.value === 'moderate' ? 'warning' :
            'error'
          }
          size="small"
        />
      ),
    },
    {
      field: 'duration',
      headerName: 'Duration',
      width: 100,
      sortable: true,
      type: 'number',
      valueGetter: (value: any) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: any) => (
        <IconButton
          size="small"
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(params.row);
          }}
        >
          <VisibilityIcon />
        </IconButton>
      ),
    },
  ];

  const handleRowClick = (session: any) => {
    setSelectedSession(session);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedSession(null), 300);
  };

  const handleOpenInClinicianView = () => {
    if (!selectedSession) return;
    
    // Convert mock session row to SessionSummary format
    const mockSessionSummary: SessionSummary = {
      sessionId: selectedSession.sessionId,
      childAgeYears: selectedSession.age,
      startedAt: new Date(selectedSession.date).toISOString(),
      endedAt: new Date(selectedSession.date).toISOString(),
      overallRisk: selectedSession.riskLevel,
      tasks: [
        {
          task: 'raise_hand',
          metrics: {
            symmetry: selectedSession.symmetryScore,
            holdTime: 3.2,
          },
        },
        {
          task: 'one_leg',
          metrics: {
            balanceTime: selectedSession.balanceScore / 10,
            swayIndex: 0.01,
          },
        },
        {
          task: 'walk',
          metrics: {
            gaitSymmetry: selectedSession.gaitScore,
          },
        },
        {
          task: 'jump',
          metrics: {
            jumpHeight: selectedSession.romScore / 5,
          },
        },
      ] as TaskMetric[],
    };
    
    setCurrent(mockSessionSummary);
    setDrawerOpen(false);
    navigate('/results/clinician');
  };

  const handleViewPDF = () => {
    alert(`Viewing PDF for ${selectedSession?.sessionId}`);
    // Placeholder - will integrate with backend
  };

  const handleDownloadPDF = () => {
    alert(`Downloading PDF for ${selectedSession?.sessionId}`);
    // Placeholder - will integrate with backend
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 2 }}
        >
          Back to Home
        </Button>
        <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage all assessment sessions
        </Typography>
      </Box>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" fontWeight={600}>
            Filters:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Risk Level</InputLabel>
            <Select
              value={riskFilter}
              label="Risk Level"
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="low">Low Risk</MenuItem>
              <MenuItem value="moderate">Moderate Risk</MenuItem>
              <MenuItem value="high">High Risk</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Data Grid */}
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filteredSessions}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
            sorting: {
              sortModel: [{ field: 'date', sort: 'desc' }],
            },
          }}
          pageSizeOptions={[5, 10, 25]}
          disableRowSelectionOnClick
          onRowClick={(params: any) => handleRowClick(params.row)}
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:hover': {
              cursor: 'pointer',
              bgcolor: 'action.hover',
            },
          }}
          autoHeight
        />
      </Paper>

      {/* Session Details Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 500 },
            p: 3,
          },
        }}
      >
        {selectedSession && (
          <Box>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight={600}>
                Session Details
              </Typography>
              <IconButton onClick={handleCloseDrawer}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Divider sx={{ mb: 3 }} />

            {/* Session Info */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Session Information
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Session ID
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedSession.sessionId}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Date
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedSession.date}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Patient
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedSession.patientName}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Child Age
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedSession.age} years
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Duration
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {Math.floor(selectedSession.duration / 60)}:{String(selectedSession.duration % 60).padStart(2, '0')}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Risk Level
                    </Typography>
                    <Chip
                      label={selectedSession.riskLevel.toUpperCase()}
                      color={
                        selectedSession.riskLevel === 'low' ? 'success' :
                        selectedSession.riskLevel === 'moderate' ? 'warning' :
                        'error'
                      }
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Task Metrics */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Individual Task Metrics
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1.5 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Balance
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedSession.balanceScore}%
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Symmetry
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedSession.symmetryScore}%
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      ROM
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedSession.romScore}%
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Gait
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedSession.gaitScore}%
                    </Typography>
                  </Paper>
                </Box>
              </CardContent>
            </Card>

            {/* Actions */}
            <Stack spacing={2}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<MedicalServicesIcon />}
                onClick={handleOpenInClinicianView}
                size="large"
              >
                Open in Clinician Results
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<VisibilityIcon />}
                onClick={handleViewPDF}
                size="large"
              >
                View PDF Report
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<DownloadIcon />}
                onClick={handleDownloadPDF}
                size="large"
              >
                Download PDF
              </Button>
            </Stack>
          </Box>
        )}
      </Drawer>
    </Container>
  );
};

export default AdminDashboard;
