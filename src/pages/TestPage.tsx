import React from 'react'
import { Container } from '@mui/material'
import PoseTest from '../components/PoseTest'

export default function TestPage() {
  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <PoseTest />
    </Container>
  )
}
