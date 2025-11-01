import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';

const TopNav = () => {
  console.log('TopNav rendering...');
  return (
    <AppBar position="sticky" sx={{ mb: 0 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          Virtual Mirror
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button color="inherit" component={Link} to="/">
            Home
          </Button>
          <Button color="inherit" component={Link} to="/session">
            Session
          </Button>
          <Button color="inherit" component={Link} to="/results/parent">
            Parent
          </Button>
          <Button color="inherit" component={Link} to="/results/clinician">
            Clinician
          </Button>
          <Button color="inherit" component={Link} to="/admin">
            Admin
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopNav;
