import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.tsx'
import Session from './pages/Session.tsx'
import Results from './pages/Results.tsx'
import AdminDashboard from './pages/AdminDashboard.tsx'
import ReplayPage from './pages/ReplayPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/session" element={<Session />} />
      <Route path="/results" element={<Results />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/replay" element={<ReplayPage />} />
    </Routes>
  )
}
