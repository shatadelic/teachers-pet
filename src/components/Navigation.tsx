import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Navigation = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Teachers Pet
        </Typography>
        <Box>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
          >
            Home
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/workspace"
          >
            Workspace
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/requirements"
          >
            Requirements
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/table"
          >
            Table Builder
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/reports"
          >
            Reports
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation; 