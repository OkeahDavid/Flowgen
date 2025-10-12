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
  const [workflowBuilderTab, setWorkflowBuilderTab] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleGetStarted = () => {
    setCurrentView('builder');
    setWorkflowBuilderTab(0);
  };

  const handleNavigationClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNavigationClose = () => {
    setAnchorEl(null);
  };

  const handleNavigateTo = (view: 'homepage' | 'builder' | 'management') => {
    if (view === 'management') {
      setCurrentView('builder');
      setWorkflowBuilderTab(1);
    } else {
      setCurrentView(view as 'homepage' | 'builder');
      if (view === 'builder') {
        setWorkflowBuilderTab(0);
      }
    }
    handleNavigationClose();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {currentView === 'homepage' ? (
          <Homepage 
            onGetStarted={handleGetStarted} 
            onViewWorkflows={() => handleNavigateTo('management')}
          />
        ) : (
          <>
            <WorkflowBuilder initialTab={workflowBuilderTab} />
            <Fab
              color="primary"
              onClick={handleNavigationClick}
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1000,
              }}
            >
              <ExpandIcon />
            </Fab>
          </>
        )}

        {/* Navigation Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleNavigationClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.05)',
              minWidth: 200,
              mb: 1,
            }
          }}
        >
          <MenuItem onClick={() => handleNavigateTo('homepage')}>
            <ListItemIcon>
              <HomeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              Home
            </ListItemText>
          </MenuItem>
          
          <MenuItem onClick={() => handleNavigateTo('builder')}>
            <ListItemIcon>
              <BuilderIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              Workflow Builder
            </ListItemText>
          </MenuItem>
          
          <MenuItem onClick={() => handleNavigateTo('management')}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              <Box>
                <Box sx={{ fontWeight: 600 }}>View Workflows</Box>
                <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  See execution results & manage
                </Box>
              </Box>
            </ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </ThemeProvider>
  );
}

export default App;
