import { Box, Typography, Paper, alpha } from '@mui/material';
import {
  Search as SearchIcon,
  Description as DocumentIcon,
  Summarize as SummaryIcon,
  Edit as WriterIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface AgentType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  tag: string;
}

interface ClickableAgentItemProps {
  agent: AgentType;
  onAddAgent: (agentType: string) => Promise<void>;
}

const ClickableAgentItem: React.FC<ClickableAgentItemProps> = ({ agent, onAddAgent }) => {
  const handleClick = async () => {
    try {
      await onAddAgent(agent.id);
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Paper
      elevation={0}
      onClick={handleClick}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: alpha(agent.color, 0.15),
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: alpha(agent.color, 0.4),
          transform: 'translateY(-2px)',
          boxShadow: `0 6px 20px ${alpha(agent.color, 0.12)}`,
        },
        '&:active': {
          transform: 'translateY(0px)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ color: agent.color, mr: 1.5 }}>
          {agent.icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 600, fontSize: '0.8rem', color: '#1a1a1a',
            letterSpacing: 'normal', textTransform: 'none',
          }}>
            {agent.name}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ 
          color: agent.color, fontSize: '0.55rem', fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          bgcolor: alpha(agent.color, 0.06), px: 0.8, py: 0.2,
          borderRadius: 0.5,
        }}>
          {agent.tag}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontSize: '0.72rem', color: '#5a6578', lineHeight: 1.4 }}>
          {agent.description}
        </Typography>
        <AddIcon sx={{ color: alpha(agent.color, 0.4), fontSize: 16, ml: 1, flexShrink: 0 }} />
      </Box>
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
      name: 'Web Search',
      description: 'Real-time web intelligence with source citations',
      icon: <SearchIcon />,
      color: '#2d4a7a',
      tag: 'Search',
    },
    {
      id: 'document_search',
      name: 'Document Search',
      description: 'Semantic vector search across uploaded files',
      icon: <DocumentIcon />,
      color: '#c45d3e',
      tag: 'RAG',
    },
    {
      id: 'summarizer',
      name: 'Summarizer',
      description: 'Structured summaries that capture key insights',
      icon: <SummaryIcon />,
      color: '#2e7d4f',
      tag: 'Synthesis',
    },
    {
      id: 'creative_writer',
      name: 'Creative Writer',
      description: 'Original content, stories, and compelling copy',
      icon: <WriterIcon />,
      color: '#7b5ea7',
      tag: 'Generation',
    },
  ];

  return (
    <Box sx={{ height: '100%', p: 2.5, bgcolor: '#faf8f5' }}>
      <Typography variant="subtitle2" sx={{ 
        color: '#c45d3e', mb: 0.5, fontSize: '0.65rem',
        letterSpacing: '0.1em',
      }}>
        AGENTS
      </Typography>
      <Typography variant="h6" sx={{ 
        fontFamily: '"Playfair Display", Georgia, serif',
        fontWeight: 600, fontSize: '1.1rem', mb: 0.5, color: '#1a2b4a',
      }}>
        Agent Palette
      </Typography>
      <Typography variant="body2" sx={{ mb: 2.5, color: '#5a6578', fontSize: '0.78rem' }}>
        Click to add agents to your workflow
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {agentTypes.map((agent) => (
          <ClickableAgentItem key={agent.id} agent={agent} onAddAgent={onAddAgent} />
        ))}
      </Box>

      <Box sx={{ 
        mt: 3, p: 2, 
        bgcolor: 'rgba(26,43,74,0.03)', 
        borderRadius: 2,
        borderLeft: '2px solid rgba(26,43,74,0.1)',
      }}>
        <Typography variant="subtitle2" sx={{ 
          fontWeight: 600, fontSize: '0.7rem', color: '#1a2b4a', mb: 0.5,
          letterSpacing: 'normal', textTransform: 'none',
        }}>
          How to use
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.72rem', color: '#5a6578', lineHeight: 1.5 }}>
          1. Click agents to add to canvas<br />
          2. Drag agents to position them<br />
          3. Click handles to connect agents<br />
          4. Configure and execute workflow
        </Typography>
      </Box>
    </Box>
  );
};

export default AgentPalette;
