import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import TopNav from './components/TopNav';
import HomePage from './pages/HomePage';
import SessionPageOrchestrator from './pages/SessionPageOrchestrator';
import ParentResultsPage from './pages/ParentResultsPage';
import ClinicianResultsPage from './pages/ClinicianResultsPage';
import AdminDashboard from './pages/AdminDashboard';
import PoseSmokeTest from './pages/PoseSmokeTest';

// Create Material UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196F3',
    },
    secondary: {
      main: '#21CBF3',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  console.log('App rendering...');
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <TopNav />
          <Box sx={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/session" element={<SessionPageOrchestrator />} />
              <Route path="/results/parent" element={<ParentResultsPage />} />
              <Route path="/results/clinician" element={<ClinicianResultsPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/test" element={<PoseSmokeTest />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
