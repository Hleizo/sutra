import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Container, Typography, Button, Paper } from '@mui/material'
import Lottie from 'lottie-react'

// Note: no local animation included; you can replace `animationData` with a local JSON
const placeholderAnimation = undefined as any

export default function Landing() {
  const nav = useNavigate()
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Virtual Mirror
          </Typography>
          <Typography color="text.secondary">
            A simple assessment flow — click below to start.
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          {/* Lottie placeholder area - swap in `animationData` when you have one */}
          {placeholderAnimation ? (
            <Lottie animationData={placeholderAnimation} style={{ height: 200 }} />
          ) : (
            <Box sx={{ height: 200, bgcolor: '#f5f5f5', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">Animation placeholder</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="contained" size="large" onClick={() => nav('/session')}>
            Start Assessment
          </Button>
          <Button variant="outlined" size="large" onClick={() => nav('/results')}>
            View History
          </Button>
          <Button variant="outlined" size="large" onClick={() => nav('/replay')} color="info">
            Replay
          </Button>
          <Button variant="outlined" size="large" onClick={() => nav('/admin')} color="secondary">
            Admin Dashboard
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
