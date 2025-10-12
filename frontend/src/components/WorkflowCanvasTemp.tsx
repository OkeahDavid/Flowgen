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
    <Box 
      sx={{ 
        height: '100%', 
        width: '100%',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'column',
        bgcolor: '#fafafa',
        backgroundImage: 'radial-gradient(circle, #e0e0e0 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        position: 'relative'
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 300, color: 'text.secondary', mb: 2 }}>
        Workflow Canvas
      </Typography>
      <Typography variant="h6" color="primary.main" sx={{ mb: 1 }}>
        Agents: {agents.length} | Connections: {connections.length}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
        Drag agents from the left panel to build your workflow. Connect agents to create execution flows.
      </Typography>
      <Typography variant="body2" sx={{ mt: 2, opacity: 0.7 }} color="text.secondary">
        Full drag-and-drop functionality coming soon!
      </Typography>
    </Box>
  );
};

export default WorkflowCanvas;