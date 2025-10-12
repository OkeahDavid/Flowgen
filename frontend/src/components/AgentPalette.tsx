import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  useDraggable,
} from '@dnd-kit/core';
import {
  Search as SearchIcon,
  Description as DocumentIcon,
  Summarize as SummaryIcon,
} from '@mui/icons-material';

interface DraggableAgentProps {
  agentType: 'web_search' | 'document_search' | 'summarizer';
  name: string;
  description: string;
  icon: React.ReactElement;
}

const DraggableAgent: React.FC<DraggableAgentProps> = ({ agentType, name, description, icon }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${agentType}`,
    data: {
      type: 'agent-type',
      agentType,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      sx={{
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        mb: 1,
        border: '2px dashed',
        borderColor: 'primary.main',
        borderRadius: 2,
        bgcolor: 'background.paper',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Box sx={{ mr: 2, color: 'primary.main' }}>
        {icon}
      </Box>
      <ListItemText
        primary={name}
        secondary={description}
        primaryTypographyProps={{ fontWeight: 'medium' }}
      />
    </ListItem>
  );
};

const AgentPalette: React.FC = () => {
  const agentTypes = [
    {
      type: 'web_search' as const,
      name: 'Web Search Agent',
      description: 'Searches the web for information',
      icon: <SearchIcon />,
    },
    {
      type: 'document_search' as const,
      name: 'Document Search Agent',
      description: 'Searches through documents',
      icon: <DocumentIcon />,
    },
    {
      type: 'summarizer' as const,
      name: 'Summarizer Agent',
      description: 'Summarizes text and information',
      icon: <SummaryIcon />,
    },
  ];

  return (
    <Paper sx={{ height: '100%', p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Agent Palette
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Drag agents to the canvas to build your workflow
      </Typography>
      
      <List sx={{ p: 0 }}>
        {agentTypes.map((agent) => (
          <DraggableAgent
            key={agent.type}
            agentType={agent.type}
            name={agent.name}
            description={agent.description}
            icon={agent.icon}
          />
        ))}
      </List>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Instructions:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          1. Drag agents from here to the canvas<br />
          2. Connect agents by clicking between them<br />
          3. Configure each agent's settings<br />
          4. Click "Execute Workflow" to run
        </Typography>
      </Box>
    </Paper>
  );
};

export default AgentPalette;