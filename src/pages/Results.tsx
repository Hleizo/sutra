import React, { useEffect, useState } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Chip,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RefreshIcon from '@mui/icons-material/Refresh'
import * as api from '../services/api'

function getRiskChipColor(riskLevel: string): 'error' | 'warning' | 'success' | 'default' {
  switch (riskLevel?.toLowerCase()) {
    case 'high':
      return 'error'
    case 'medium':
      return 'warning'
    case 'normal':
    case 'low':
      return 'success'
    default:
      return 'default'
  }
}

export default function Results() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<api.SessionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAllSessions()
      setSessions(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const handleDownload = async (sessionId: number) => {
    try {
      const blob = await api.downloadReport(sessionId, false)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `session_${sessionId}_report.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      alert(`Failed to download report: ${err.message}`)
    }
  }

  const handleDelete = async (sessionId: number) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      await api.deleteSession(sessionId)
      setSessions(sessions.filter(s => s.id !== sessionId))
    } catch (err: any) {
      alert(`Failed to delete session: ${err.message}`)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Assessment History
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadSessions}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : sessions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No assessment sessions found
          </Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 2 }}
            onClick={() => navigate('/session')}
          >
            Start New Assessment
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Session ID</strong></TableCell>
                <TableCell><strong>Task Type</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell align="center"><strong>Duration (s)</strong></TableCell>
                <TableCell align="center"><strong>Stability</strong></TableCell>
                <TableCell align="center"><strong>Balance</strong></TableCell>
                <TableCell align="center"><strong>Risk Score</strong></TableCell>
                <TableCell align="center"><strong>Risk Level</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id} hover>
                  <TableCell>{session.id}</TableCell>
                  <TableCell>{session.task_type}</TableCell>
                  <TableCell>{formatDate(session.created_at)}</TableCell>
                  <TableCell align="center">{session.duration_seconds?.toFixed(1) || 'N/A'}</TableCell>
                  <TableCell align="center">{session.stability_score?.toFixed(1) || 'N/A'}</TableCell>
                  <TableCell align="center">{session.balance_score?.toFixed(1) || 'N/A'}</TableCell>
                  <TableCell align="center">{session.risk_score?.toFixed(0) || 'N/A'}</TableCell>
                  <TableCell align="center">
                    {session.risk_level ? (
                      <Chip 
                        label={session.risk_level} 
                        color={getRiskChipColor(session.risk_level)}
                        size="small"
                      />
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={session.status} 
                      color={session.status === 'processed' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      {session.status === 'processed' && (
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleDownload(session.id)}
                          title="Download PDF Report"
                        >
                          <DownloadIcon />
                        </IconButton>
                      )}
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDelete(session.id)}
                        title="Delete Session"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}
