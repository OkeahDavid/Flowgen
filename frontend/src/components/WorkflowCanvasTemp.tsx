import { Box, Typography } from '@mui/material';
import type { AgentConfig, Connection } from '../typesTemp';

interface WorkflowCanvasProps {
  agents: AgentConfig[];
  connections: Connection[];
  onAddConnection: (sourceId: string, targetId: string) => void;
  onRemoveAgent: (agentId: string) => void;
  onUpdateAgent: (agentId: string, updates: Partial<AgentConfig>) => void;
}

const WorkflowCanvas = ({ agents, connections }: WorkflowCanvasProps) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <Typography variant="h6">Workflow Canvas</Typography>
      <Typography variant="body2" color="text.secondary">
        Agents: {agents.length}, Connections: {connections.length}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
        Drag-and-drop functionality coming soon!
      </Typography>
    </Box>
  );
};

export default WorkflowCanvas;