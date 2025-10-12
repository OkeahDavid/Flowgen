import { Box, Typography, Paper, alpha } from '@mui/material';
import {
  Search as SearchIcon,
  Description as DocumentIcon,
  Summarize as SummaryIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';

const AgentPalette = () => {
  const agentTypes = [
    {
      name: 'Web Search Agent',
      description: 'Search the web for information',
      icon: <SearchIcon />,
      color: '#2196f3',
    },
    {
      name: 'Document Search Agent',
      description: 'Search through documents',
      icon: <DocumentIcon />,
      color: '#ff9800',
    },
    {
      name: 'Summarizer Agent',
      description: 'Summarize information',
      icon: <SummaryIcon />,
      color: '#4caf50',
    },
  ];

  return (
    <Box sx={{ height: '100%', p: 3, bgcolor: 'background.default' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, borderBottom: 1, borderColor: 'divider', pb: 2, mb: 3 }}>
        Agent Palette
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Drag agents to the canvas to build your workflow
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {agentTypes.map((agent, index) => (
          <Paper
            key={index}
            sx={{
              p: 2,
              border: `2px dashed ${alpha(agent.color, 0.3)}`,
              borderRadius: 2,
              cursor: 'grab',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: agent.color,
                borderStyle: 'solid',
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${alpha(agent.color, 0.2)}`,
              },
              '&:active': {
                cursor: 'grabbing',
                transform: 'translateY(0px)',
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
              <DragIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {agent.description}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ mt: 4, p: 2, bgcolor: alpha('#1976d2', 0.05), borderRadius: 2 }}>
        <Typography variant="subtitle2" color="primary.main" gutterBottom sx={{ fontWeight: 600 }}>
          How to use:
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
          1. Drag agents to the canvas<br />
          2. Connect agents to create flows<br />
          3. Configure agent settings<br />
          4. Execute your workflow
        </Typography>
      </Box>
    </Box>
  );
};

export default AgentPalette;