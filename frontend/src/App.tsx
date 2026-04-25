import { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { 
  Box, 
  Fab, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText
} from '@mui/material';
import { 
  Home as HomeIcon, 
  ExpandLess as ExpandIcon,
  AutoAwesome as BuilderIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleGetStarted = () => { setCurrentView('builder'); setWorkflowBuilderTab(0); };
  const handleNavigationClick = (event: React.MouseEvent<HTMLElement>) => { setAnchorEl(event.currentTarget); };
  const handleNavigationClose = () => { setAnchorEl(null); };

  const handleNavigateTo = (view: 'homepage' | 'builder' | 'management') => {
    if (view === 'management') { setCurrentView('builder'); setWorkflowBuilderTab(1); }
    else { setCurrentView(view as 'homepage' | 'builder'); if (view === 'builder') setWorkflowBuilderTab(0); }
    handleNavigationClose();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {currentView === 'homepage' ? (
          <Homepage onGetStarted={handleGetStarted} onViewWorkflows={() => handleNavigateTo('management')} />
        ) : (
          <>
            <WorkflowBuilder initialTab={workflowBuilderTab} onHome={() => setCurrentView('homepage')} />
            <Fab onClick={handleNavigationClick} sx={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
              bgcolor: '#1a2b4a', color: '#fff', width: 48, height: 48,
              boxShadow: '0 4px 20px rgba(26,43,74,0.25)',
              '&:hover': { bgcolor: '#2d4a7a', boxShadow: '0 6px 28px rgba(26,43,74,0.35)' },
            }}>
              <ExpandIcon />
            </Fab>
          </>
        )}

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleNavigationClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          PaperProps={{ sx: {
            borderRadius: 2, boxShadow: '0 12px 40px rgba(26,43,74,0.12)',
            border: '1px solid rgba(26,43,74,0.06)', minWidth: 220, mb: 1, py: 0.5,
          }}}>
          <MenuItem onClick={() => handleNavigateTo('homepage')} sx={{ py: 1.5 }}>
            <ListItemIcon><HomeIcon fontSize="small" sx={{ color: '#1a2b4a' }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>Home</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleNavigateTo('builder')} sx={{ py: 1.5 }}>
            <ListItemIcon><BuilderIcon fontSize="small" sx={{ color: '#c45d3e' }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>Workflow Builder</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleNavigateTo('management')} sx={{ py: 1.5 }}>
            <ListItemIcon><ViewIcon fontSize="small" sx={{ color: '#5a6578' }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>View Workflows</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </ThemeProvider>
  );
}

export default App;
