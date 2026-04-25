import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  AutoAwesome as BuilderIcon,
  List as ManagementIcon,
} from '@mui/icons-material';

import AgentPalette from './AgentPaletteTemp';
import WorkflowCanvas from './WorkflowCanvasTemp';
import WorkflowResults from './WorkflowResultsTemp';
import WorkflowManagement from './WorkflowManagementTemp';
import type { AgentConfig, Connection, WorkflowResponse, WorkflowRequest } from '../typesTemp';
import { createWorkflow, getWorkflowStatus } from '../services/apiTemp';

interface WorkflowBuilderProps {
  initialTab?: number;
}

const WorkflowBuilder = ({ initialTab = 0 }: WorkflowBuilderProps) => {
  const [currentTab, setCurrentTab] = useState<number>(initialTab);
  const [workflowStatus, setWorkflowStatus] = useState<string>('idle');
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [workflowResponse, setWorkflowResponse] = useState<WorkflowResponse | null>(null);
  const [task, setTask] = useState('');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Update tab when initialTab prop changes
  useEffect(() => {
    setCurrentTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleAddConnection = useCallback((sourceId: string, targetId: string) => {
    const newConnection: Connection = {
      source_id: sourceId,
      target_id: targetId,
    };
    setConnections(prev => [...prev, newConnection]);
  }, []);

  const handleRemoveAgent = useCallback((agentId: string) => {
    setAgents(prev => prev.filter(agent => agent.id !== agentId));
    setConnections(prev => prev.filter(conn => 
      conn.source_id !== agentId && conn.target_id !== agentId
    ));
  }, []);

  const handleUpdateAgent = useCallback((agentId: string, updates: Partial<AgentConfig>) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, ...updates } : agent
    ));
  }, []);

  const handleAddAgent = useCallback(async (agentType: string) => {
    const newAgent: AgentConfig = {
      id: `${agentType}_${Date.now()}`,
      type: agentType,
      name: `${agentType.replace('_', ' ')} Agent`,
      system_message: `You are a ${agentType.replace('_', ' ')} agent.`,
      config: {},
      position: { x: Math.random() * 400, y: Math.random() * 300 }
    };
    setAgents(prev => [...prev, newAgent]);
  }, []);

  const handleRemoveConnection = useCallback((sourceId: string, targetId: string) => {
    setConnections(prev => prev.filter(conn => 
      !(conn.source_id === sourceId && conn.target_id === targetId)
    ));
  }, []);

  const pollWorkflowStatus = useCallback(async (workflowId: string) => {
    const maxAttempts = 60; // Poll for 5 minutes max (every 5 seconds)
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await getWorkflowStatus(workflowId);
        setWorkflowResponse(response);
        
        if (response.status === 'completed' || response.status === 'failed') {
          setWorkflowStatus(response.status);
          
          // Workflow status stored in database only
          
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setWorkflowStatus('timeout');
          setSnackbar({
            open: true,
            message: 'Workflow polling timeout',
            severity: 'warning',
          });
        }
      } catch {
        setWorkflowStatus('error');
        setSnackbar({
          open: true,
          message: 'Error checking workflow status',
          severity: 'error',
        });
      }
    };

    poll();
  }, []);

  const handleExecuteWorkflow = async () => {
    if (agents.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please add at least one agent to the workflow',
        severity: 'error',
      });
      return;
    }

    // Always show task dialog to allow editing the query
    setShowTaskDialog(true);
  };

  const executeWorkflowWithTask = async () => {
    setLoading(true);
    setWorkflowStatus('running');
    try {
      const request: WorkflowRequest = {
        agents,
        connections,
        task,
      };

      const response = await createWorkflow(request);
      setWorkflowResponse(response);

      // Poll for results if the workflow is running
      if (response.status === 'running') {
        pollWorkflowStatus(response.workflow_id);
      }

      setSnackbar({
        open: true,
        message: 'Workflow started successfully!',
        severity: 'success',
      });
    } catch (error) {
      setWorkflowStatus('idle');
      setSnackbar({
        open: true,
        message: `Failed to start workflow: ${error}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSubmit = () => {
    setShowTaskDialog(false);
    executeWorkflowWithTask();
  };

  const handleClearWorkflow = () => {
    setWorkflowStatus('idle');
    setAgents([]);
    setConnections([]);
    setWorkflowResponse(null);
  };

  return (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <AppBar position="static" sx={{ zIndex: 1000, bgcolor: '#1a2b4a', boxShadow: '0 1px 8px rgba(26,43,74,0.12)' }}>
        <Toolbar>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              cursor: 'pointer',
              fontFamily: '"Playfair Display", Georgia, serif',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              '&:hover': {
                opacity: 0.8
              }
            }}
            onClick={() => window.location.href = '/'}
          >
            Flowgen
          </Typography>
          {currentTab === 0 && (
            <>
              <Button
                color="inherit"
                onClick={handleExecuteWorkflow}
                disabled={loading || workflowStatus === 'running'}
              >
                {loading || workflowStatus === 'running' ? 'Running...' : 'Execute Workflow'}
              </Button>
              <Button color="inherit" onClick={handleClearWorkflow} sx={{ ml: 1 }}>
                Clear Workflow
              </Button>
            </>
          )}
          {currentTab === 1 && (
            <Button
              color="inherit"
              onClick={() => setCurrentTab(0)}
              sx={{ ml: 1 }}
            >
              ← Back to Builder
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(26,43,74,0.08)', bgcolor: '#faf8f5' }}>
        <Tabs value={currentTab} onChange={handleTabChange} centered
          sx={{
            '& .MuiTab-root': { color: '#5a6578' },
            '& .Mui-selected': { color: '#1a2b4a' },
            '& .MuiTabs-indicator': { bgcolor: '#c45d3e', height: 2 },
          }}
        >
          <Tab 
            icon={<BuilderIcon />} 
            label="Workflow Builder" 
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
          <Tab 
            icon={<ManagementIcon />} 
            label="View All Workflows" 
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex',
        width: '100%',
        height: 'calc(100vh - 112px)', // Account for AppBar + Tabs
        overflow: 'hidden'
      }}>
        {currentTab === 0 ? (
          // Workflow Builder Tab
          <>
            <Box sx={{ 
              width: '300px', 
              minWidth: '300px',
              borderRight: 1, 
              borderColor: 'divider',
              height: '100%',
              overflow: 'auto'
            }}>
              <AgentPalette onAddAgent={handleAddAgent} />
            </Box>
            
            <Box sx={{ 
              flex: 1,
              borderRight: 1, 
              borderColor: 'divider',
              height: '100%',
              overflow: 'hidden'
            }}>
              <Paper sx={{ height: '100%', position: 'relative', borderRadius: 0 }}>
                <WorkflowCanvas
                  agents={agents}
                  connections={connections}
                  onAddConnection={handleAddConnection}
                  onRemoveConnection={handleRemoveConnection}
                  onRemoveAgent={handleRemoveAgent}
                  onUpdateAgent={handleUpdateAgent}
                />
              </Paper>
            </Box>
            
            <Box sx={{ 
              width: '300px', 
              minWidth: '300px',
              height: '100%',
              overflow: 'auto'
            }}>
              <WorkflowResults 
                response={workflowResponse} 
                onWorkflowUpdate={setWorkflowResponse}
                onClearResults={() => setWorkflowResponse(null)}
              />
            </Box>
          </>
        ) : (
          // Workflow Management Tab
          <Box sx={{ width: '100%', height: '100%' }}>
            <WorkflowManagement />
          </Box>
        )}
      </Box>

      {/* Task Input Dialog */}
      <Dialog open={showTaskDialog} onClose={() => setShowTaskDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Enter Task Description</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Description"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe what you want the workflow to accomplish..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTaskDialog(false)}>Cancel</Button>
          <Button onClick={handleTaskSubmit} variant="contained" disabled={!task.trim()}>Execute</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkflowBuilder;