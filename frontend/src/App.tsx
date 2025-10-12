import { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Fab } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import Homepage from './components/Homepage';
import WorkflowBuilder from './components/WorkflowBuilder';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});

function App() {
  const [currentView, setCurrentView] = useState<'homepage' | 'builder'>('homepage');

  const handleGetStarted = () => {
    setCurrentView('builder');
  };

  const handleGoHome = () => {
    setCurrentView('homepage');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {currentView === 'homepage' ? (
          <Homepage onGetStarted={handleGetStarted} />
        ) : (
          <>
            <WorkflowBuilder />
            <Fab
              color="primary"
              onClick={handleGoHome}
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1000,
              }}
            >
              <HomeIcon />
            </Fab>
          </>
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;
