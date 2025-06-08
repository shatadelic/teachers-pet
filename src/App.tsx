import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Container } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// TODO: Вставьте сюда ваш реальный clientId из Google Cloud Console
const clientId = 'ВАШ_CLIENT_ID.apps.googleusercontent.com'; // <-- замените на свой

function App() {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Navigation />
          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/requirements" element={<div>Requirements Page</div>} />
              <Route path="/table" element={<div>Table Builder Page</div>} />
              <Route path="/reports" element={<div>Reports Page</div>} />
            </Routes>
          </Container>
        </Router>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
