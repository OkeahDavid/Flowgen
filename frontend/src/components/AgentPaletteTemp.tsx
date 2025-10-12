import { Box, Typography, Paper, alpha } from '@mui/material';
import {
  Search as SearchIcon,
  Description as DocumentIcon,
  Summarize as SummaryIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface AgentType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface ClickableAgentItemProps {
  agent: AgentType;
  onAddAgent: (agentType: string) => Promise<void>;
}

const ClickableAgentItem: React.FC<ClickableAgentItemProps> = ({ agent, onAddAgent }) => {
  const handleClick = async () => {
    try {
      await onAddAgent(agent.id);
    } catch (error) {
      console.error('Error adding agent:', error);
    }
  };

  return (
    <Paper
      onClick={handleClick}
      sx={{
        p: 2,
        border: `2px dashed ${alpha(agent.color, 0.3)}`,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: agent.color,
          borderStyle: 'solid',
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 12px ${alpha(agent.color, 0.2)}`,
        },
        '&:active': {
          transform: 'translateY(0px)',
          boxShadow: `0 2px 8px ${alpha(agent.color, 0.3)}`,
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ color: agent.color, mr: 1 }}>
          {agent.icon}
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
          {agent.name}
        </Typography>
        <AddIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
        {agent.description}
      </Typography>
    </Paper>
  );
};

interface AgentPaletteProps {
  onAddAgent: (agentType: string) => Promise<void>;
}

const AgentPalette: React.FC<AgentPaletteProps> = ({ onAddAgent }) => {
  const agentTypes: AgentType[] = [
    {
      id: 'web_search',
      name: 'Web Search Agent',
      description: 'Search the web for information',
      icon: <SearchIcon />,
      color: '#2196f3',
    },
    {
      id: 'document_search',
      name: 'Document Search Agent',
      description: 'Search through documents',
      icon: <DocumentIcon />,
      color: '#ff9800',
    },
    {
      id: 'summarizer',
      name: 'Summarizer Agent',
      description: 'Summarize information',
      icon: <SummaryIcon />,
      color: '#4caf50',
    },
  ];

  return (
    <Box sx={{ height: '100%', p: 3, bgcolor: 'background.default' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
        Agent Palette
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', fontSize: '0.85rem' }}>
        Click to add agents to your workflow
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {agentTypes.map((agent) => (
          <ClickableAgentItem key={agent.id} agent={agent} onAddAgent={onAddAgent} />
        ))}
      </Box>

      <Box sx={{ mt: 4, p: 2, bgcolor: alpha('#1976d2', 0.05), borderRadius: 2 }}>
        <Typography variant="subtitle2" color="primary.main" gutterBottom sx={{ fontWeight: 600 }}>
          How to use:
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
          1. Click agents to add to canvas<br />
          2. Drag agents to position them<br />
          3. Click connection handles to link agents<br />
          4. Configure and execute workflow
        </Typography>
      </Box>
    </Box>
  );
};

export default AgentPalette;