import { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import Homepage from './components/Homepage';
import WorkflowBuilder from './components/WorkflowBuilderSimple';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a2b4a',
      light: '#2d4a7a',
      dark: '#0d1b30',
    },
    secondary: {
      main: '#c45d3e',
      light: '#e07a5f',
      dark: '#a04030',
    },
    background: {
      default: '#faf8f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#5a6578',
    },
    divider: 'rgba(26, 43, 74, 0.08)',
  },
  typography: {
    fontFamily: '"DM Sans", "Helvetica Neue", sans-serif',
    h1: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600, letterSpacing: '-0.01em' },
    h3: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600 },
    h4: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 500 },
    h5: { fontFamily: '"DM Sans", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"DM Sans", sans-serif', fontWeight: 600 },
    subtitle1: { fontFamily: '"DM Sans", sans-serif', fontWeight: 500, letterSpacing: '0.02em' },
    subtitle2: { fontFamily: '"DM Sans", sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontSize: '0.7rem' },
    body1: { fontFamily: '"DM Sans", sans-serif', lineHeight: 1.7 },
    body2: { fontFamily: '"DM Sans", sans-serif', lineHeight: 1.6 },
    button: { fontFamily: '"DM Sans", sans-serif', fontWeight: 600, letterSpacing: '0.03em' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 6, padding: '8px 20px' },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: '0 2px 8px rgba(26,43,74,0.15)' } },
        outlined: { borderWidth: '1.5px', '&:hover': { borderWidth: '1.5px' } },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
  },
});

function App() {
  const [currentView, setCurrentView] = useState<'homepage' | 'builder'>('homepage');
  const [workflowBuilderTab, setWorkflowBuilderTab] = useState<number>(0);

  const handleGetStarted = () => { setCurrentView('builder'); setWorkflowBuilderTab(0); };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {currentView === 'homepage' ? (
          <Homepage onGetStarted={handleGetStarted} onViewWorkflows={() => { setCurrentView('builder'); setWorkflowBuilderTab(1); }} />
        ) : (
          <WorkflowBuilder initialTab={workflowBuilderTab} onHome={() => setCurrentView('homepage')} />
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;
