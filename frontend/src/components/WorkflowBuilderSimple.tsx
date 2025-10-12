import { useState, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Paper,
  Button,
} from '@mui/material';

import AgentPalette from './AgentPaletteTemp';
import WorkflowCanvas from './WorkflowCanvasTemp';
import WorkflowResults from './WorkflowResultsTemp';
import type { AgentConfig, Connection, WorkflowResponse } from '../typesTemp';

const WorkflowBuilder = () => {
  const [workflowStatus, setWorkflowStatus] = useState<string>('idle');
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [workflowResponse, setWorkflowResponse] = useState<WorkflowResponse | null>(null);

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

  const handleExecuteWorkflow = () => {
    setWorkflowStatus('running');
    console.log('Executing workflow...');
    setWorkflowResponse({ workflow_id: 'demo_workflow', status: 'running' });
    setTimeout(() => {
      setWorkflowStatus('completed');
      setWorkflowResponse({ workflow_id: 'demo_workflow', status: 'completed' });
    }, 3000);
  };

  const handleClearWorkflow = () => {
    setWorkflowStatus('idle');
    setAgents([]);
    setConnections([]);
    setWorkflowResponse(null);
    console.log('Clearing workflow...');
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Flowgen - AI Agent Workflow Builder
          </Typography>
          <Button
            color="inherit"
            onClick={handleExecuteWorkflow}
            disabled={workflowStatus === 'running'}
          >
            {workflowStatus === 'running' ? 'Running...' : 'Execute Workflow'}
          </Button>
          <Button color="inherit" onClick={handleClearWorkflow} sx={{ ml: 1 }}>
            Clear
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex' }}>
        <Box sx={{ width: '25%', borderRight: 1, borderColor: 'divider' }}>
          <AgentPalette />
        </Box>
        
        <Box sx={{ width: '50%', borderRight: 1, borderColor: 'divider' }}>
          <Paper sx={{ height: '100%', position: 'relative' }}>
            <WorkflowCanvas
              agents={agents}
              connections={connections}
              onAddConnection={handleAddConnection}
              onRemoveAgent={handleRemoveAgent}
              onUpdateAgent={handleUpdateAgent}
            />
          </Paper>
        </Box>
        
        <Box sx={{ width: '25%' }}>
          <WorkflowResults response={workflowResponse} />
        </Box>
      </Box>
    </Box>
  );
};

export default WorkflowBuilder;