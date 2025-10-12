import { useState, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';

import AgentPalette from './AgentPaletteTemp';
import WorkflowCanvas from './WorkflowCanvasTemp';
import WorkflowResults from './WorkflowResultsTemp';
import type { AgentConfig, Connection, WorkflowRequest, WorkflowResponse } from '../typesTemp';
import { createWorkflow, getWorkflowStatus } from '../services/apiTemp';

const WorkflowBuilder: React.FC = () => {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [task, setTask] = useState('');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [workflowResponse, setWorkflowResponse] = useState<WorkflowResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Handle dropping from palette to canvas
    if (active.data.current?.type === 'agent-type' && over.id === 'canvas') {
      const agentType = active.data.current.agentType;
      const newAgent: AgentConfig = {
        id: `agent_${Date.now()}`,
        name: `${agentType} ${agents.length + 1}`,
        type: agentType,
        system_message: '',
        position: { x: Math.random() * 400, y: Math.random() * 300 },
      };
      setAgents(prev => [...prev, newAgent]);
    }

    // Handle reordering agents in canvas
    if (active.data.current?.type === 'agent' && over.data.current?.type === 'agent') {
      const oldIndex = agents.findIndex(agent => agent.id === active.id);
      const newIndex = agents.findIndex(agent => agent.id === over.id);
      setAgents(prev => arrayMove(prev, oldIndex, newIndex));
    }
  }, [agents]);

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
      setShowTaskDialog(true);
      return;
    }

    setLoading(true);
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
      setSnackbar({
        open: true,
        message: `Failed to start workflow: ${error}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const pollWorkflowStatus = async (workflowId: string) => {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await getWorkflowStatus(workflowId);
        setWorkflowResponse(response);

        if (response.status === 'completed' || response.status === 'error') {
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        }
      } catch (error) {
        console.error('Error polling workflow status:', error);
      }
    };

    poll();
  };

  const handleTaskSubmit = () => {
    setShowTaskDialog(false);
    handleExecuteWorkflow();
  };

  const handleClearWorkflow = () => {
    setAgents([]);
    setConnections([]);
    setWorkflowResponse(null);
    setTask('');
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Flowgen
          </Typography>
          <Button
            color="inherit"
            onClick={handleExecuteWorkflow}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Running...' : 'Execute Workflow'}
          </Button>
          <Button color="inherit" onClick={handleClearWorkflow} sx={{ ml: 1 }}>
            Clear
          </Button>
        </Toolbar>
      </AppBar>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}
      >
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex' }}>
          <Box sx={{ width: '25%', borderRight: 1, borderColor: 'divider' }}>
            <AgentPalette />
          </Box>
          
          <Box sx={{ width: '50%', borderRight: 1, borderColor: 'divider' }}>
            <Paper sx={{ height: '100%', position: 'relative' }}>
              <SortableContext items={agents.map(agent => agent.id)}>
                <WorkflowCanvas
                  agents={agents}
                  connections={connections}
                  onAddConnection={handleAddConnection}
                  onRemoveAgent={handleRemoveAgent}
                  onUpdateAgent={handleUpdateAgent}
                />
              </SortableContext>
            </Paper>
          </Box>
          
          <Box sx={{ width: '25%' }}>
            <WorkflowResults response={workflowResponse} />
          </Box>
        </Box>

        <DragOverlay>
          {activeId ? (
            <Box
              sx={{
                width: 120,
                height: 80,
                bgcolor: 'primary.main',
                color: 'white',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.8,
              }}
            >
              {activeId}
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Input Dialog */}
      <Dialog open={showTaskDialog} onClose={() => setShowTaskDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Enter Task Description</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Description"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe what you want the AI agents to accomplish..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTaskDialog(false)}>Cancel</Button>
          <Button onClick={handleTaskSubmit} variant="contained">Execute</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkflowBuilder;