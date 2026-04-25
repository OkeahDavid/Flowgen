import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Paper,
  Button,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  alpha,
} from '@mui/material';
import {
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
  PlayArrow as PlayIcon,
  RestartAlt as ClearIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

import AgentPalette from './AgentPaletteTemp';
import WorkflowCanvas from './WorkflowCanvasTemp';
import WorkflowResults from './WorkflowResultsTemp';
import WorkflowManagement from './WorkflowManagementTemp';
import type { AgentConfig, Connection, WorkflowResponse, WorkflowRequest } from '../typesTemp';
import { createWorkflow, getWorkflowStatus } from '../services/apiTemp';

interface WorkflowBuilderProps {
  initialTab?: number;
  onHome?: () => void;
}

const WorkflowBuilder = ({ initialTab = 0, onHome }: WorkflowBuilderProps) => {
  const [currentTab, setCurrentTab] = useState<number>(initialTab);
  const [workflowStatus, setWorkflowStatus] = useState<string>('idle');
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [workflowResponse, setWorkflowResponse] = useState<WorkflowResponse | null>(null);
  const [task, setTask] = useState('');
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

  const handleTabChange = (_event: React.SyntheticEvent | null, newValue: number) => {
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
      name: `${agentType.replace('_', ' ')} agent`,
      position: { x: 80 + Math.random() * 300, y: 60 + Math.random() * 200 },
    };
    setAgents(prev => [...prev, newAgent]);
  }, []);

  const handleDropAgent = useCallback((agentType: string, position: { x: number; y: number }) => {
    const newAgent: AgentConfig = {
      id: `${agentType}_${Date.now()}`,
      type: agentType,
      name: `${agentType.replace('_', ' ')} agent`,
      position,
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
        
        if (response.status === 'completed' || response.status === 'failed' || response.status === 'error') {
          setWorkflowStatus(response.status === 'error' ? 'failed' : response.status);
          
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
    if (!task.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a task description',
        severity: 'warning',
      });
      return;
    }
    executeWorkflowWithTask();
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
    executeWorkflowWithTask();
  };

  const handleClearWorkflow = () => {
    setWorkflowStatus('idle');
    setAgents([]);
    setConnections([]);
    setWorkflowResponse(null);
  };

  // Resizable results panel
  const [resultsPanelWidth, setResultsPanelWidth] = useState(300);
  const [isResultsCollapsed, setIsResultsCollapsed] = useState(false);
  const isResizingRef = useRef(false);

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = resultsPanelWidth;

    const onMove = (ev: PointerEvent) => {
      if (!isResizingRef.current) return;
      const delta = startX - ev.clientX; // dragging left = wider
      const newWidth = Math.max(200, Math.min(600, startWidth + delta));
      setResultsPanelWidth(newWidth);
    };

    const onUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [resultsPanelWidth]);

  return (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <AppBar position="static" sx={{ zIndex: 1000, bgcolor: '#1a2b4a', boxShadow: '0 1px 8px rgba(26,43,74,0.12)' }}>
        <Toolbar sx={{ minHeight: '48px !important', height: 48 }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              cursor: 'pointer',
              fontFamily: '"Playfair Display", Georgia, serif',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              fontSize: '1.1rem',
              mr: 'auto',
              '&:hover': { opacity: 0.8 }
            }}
            onClick={onHome}
          >
            Flowgen
          </Typography>

          {onHome && (
            <Button 
              color="inherit" size="small" onClick={onHome}
              sx={{ fontSize: '0.8rem', color: currentTab === -1 ? '#fff' : 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}
            >
              Home
            </Button>
          )}
          <Button 
            color="inherit" size="small" 
            onClick={() => handleTabChange(null, 0)}
            sx={{ fontSize: '0.8rem', ml: 0.5, color: currentTab === 0 ? '#fff' : 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}
          >
            Builder
          </Button>
          <Button 
            color="inherit" size="small" 
            onClick={() => handleTabChange(null, 1)}
            sx={{ fontSize: '0.8rem', ml: 0.5, color: currentTab === 1 ? '#fff' : 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}
          >
            Workflows
          </Button>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex',
        width: '100%',
        height: 'calc(100vh - 48px)',
        overflow: 'hidden'
      }}>
        {currentTab === 0 ? (
          <>
            <Box sx={{ 
              width: '280px', 
              minWidth: '280px',
              borderRight: 1, 
              borderColor: 'divider',
              height: '100%',
              overflow: 'auto'
            }}>
              <AgentPalette onAddAgent={handleAddAgent} />
            </Box>
            
            <Box sx={{ 
              flex: 1,
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
                  onDropAgent={handleDropAgent}
                />
              </Paper>
            </Box>

            {/* Resizable results panel */}
            <Box sx={{ display: 'flex', height: '100%', position: 'relative' }}>
              {/* Resize handle */}
              <Box
                onPointerDown={handleResizeStart}
                sx={{
                  width: 6, cursor: 'col-resize', 
                  bgcolor: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  '&:hover': { bgcolor: alpha('#c45d3e', 0.08) },
                  '&:active': { bgcolor: alpha('#c45d3e', 0.15) },
                  transition: 'background-color 0.15s',
                  zIndex: 10,
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ width: 2, height: 24, borderRadius: 1, bgcolor: 'rgba(26,43,74,0.15)' }} />
              </Box>

              {/* Collapse/expand toggle */}
              <Button
                onClick={() => setIsResultsCollapsed(prev => !prev)}
                size="small"
                sx={{
                  position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)',
                  minWidth: 28, width: 28, height: 28, borderRadius: '50%',
                  bgcolor: '#fff', border: '1px solid', borderColor: 'divider',
                  zIndex: 20, p: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  '&:hover': { bgcolor: '#faf8f5' },
                }}
              >
                {isResultsCollapsed ? <CollapseIcon sx={{ fontSize: 16, color: '#5a6578' }} /> : <ExpandIcon sx={{ fontSize: 16, color: '#5a6578' }} />}
              </Button>

              {/* Results content with task input on top */}
              <Box sx={{ 
                width: isResultsCollapsed ? 0 : resultsPanelWidth,
                minWidth: isResultsCollapsed ? 0 : 200,
                maxWidth: 600,
                height: '100%',
                overflow: isResultsCollapsed ? 'hidden' : 'hidden',
                transition: isResultsCollapsed ? 'width 0.2s ease' : 'none',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Task input */}
                <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fff', flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      maxRows={3}
                      variant="outlined"
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                      placeholder="Describe your task..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && task.trim() && agents.length > 0) {
                          e.preventDefault();
                          handleTaskSubmit();
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2, fontSize: '0.8rem',
                          '& fieldset': { borderColor: 'rgba(26,43,74,0.1)' },
                          '&:hover fieldset': { borderColor: 'rgba(26,43,74,0.2)' },
                          '&.Mui-focused fieldset': { borderColor: '#c45d3e' },
                        },
                      }}
                    />
                    {task.trim() && (
                      <IconButton size="small" onClick={() => setTask('')} sx={{ color: '#5a6578', flexShrink: 0 }}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayIcon sx={{ fontSize: 14 }} />}
                      onClick={handleExecuteWorkflow}
                      disabled={loading || workflowStatus === 'running' || agents.length === 0 || !task.trim()}
                      sx={{
                        flex: 1, bgcolor: '#c45d3e', borderRadius: 1.5, textTransform: 'none',
                        fontWeight: 600, fontSize: '0.75rem', py: 0.5,
                        '&:hover': { bgcolor: '#a84d33' },
                        '&.Mui-disabled': { bgcolor: 'rgba(196,93,62,0.15)', color: 'rgba(0,0,0,0.3)' },
                      }}
                    >
                      {loading || workflowStatus === 'running' ? 'Running...' : 'Run'}
                    </Button>
                    {agents.length > 0 && (
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<ClearIcon sx={{ fontSize: 14 }} />}
                        onClick={handleClearWorkflow}
                        sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#5a6578', px: 1 }}
                      >
                        Clear
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* Results below */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  <WorkflowResults 
                    response={workflowResponse} 
                    onWorkflowUpdate={setWorkflowResponse}
                    onClearResults={() => setWorkflowResponse(null)}
                  />
                </Box>
              </Box>
            </Box>
          </>
        ) : (
          <Box sx={{ width: '100%', height: '100%' }}>
            <WorkflowManagement />
          </Box>
        )}
      </Box>

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