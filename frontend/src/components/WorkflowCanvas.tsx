import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
} from '@mui/material';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useDroppable,
} from '@dnd-kit/core';
import {
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Description as DocumentIcon,
  Summarize as SummaryIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

import type { AgentConfig, Connection } from '../types';

const getAgentIcon = (type: string) => {
  switch (type) {
    case 'web_search':
      return <SearchIcon />;
    case 'document_search':
      return <DocumentIcon />;
    case 'summarizer':
      return <SummaryIcon />;
    default:
      return <SearchIcon />;
  }
};

const getAgentColor = (type: string) => {
  switch (type) {
    case 'web_search':
      return '#2196f3';
    case 'document_search':
      return '#ff9800';
    case 'summarizer':
      return '#4caf50';
    default:
      return '#757575';
  }
};

interface AgentNodeProps {
  agent: AgentConfig;
  onRemove: (agentId: string) => void;
  onUpdate: (agentId: string, updates: Partial<AgentConfig>) => void;
  onConnect?: (agentId: string) => void;
}

const AgentNode: React.FC<AgentNodeProps> = ({ agent, onRemove, onUpdate, onConnect }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editName, setEditName] = useState(agent.name);
  const [editSystemMessage, setEditSystemMessage] = useState(agent.system_message);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: agent.id,
    data: {
      type: 'agent',
      agent,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setEditDialog(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    onRemove(agent.id);
    handleMenuClose();
  };

  const handleConnect = () => {
    if (onConnect) {
      onConnect(agent.id);
    }
    handleMenuClose();
  };

  const handleSaveEdit = () => {
    onUpdate(agent.id, {
      name: editName,
      system_message: editSystemMessage,
    });
    setEditDialog(false);
  };

  return (
    <>
      <Box
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        sx={{
          position: 'absolute',
          left: agent.position?.x || 0,
          top: agent.position?.y || 0,
          width: 200,
          minHeight: 100,
          bgcolor: getAgentColor(agent.type),
          color: 'white',
          borderRadius: 2,
          p: 2,
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: 3,
          '&:hover': {
            boxShadow: 6,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {getAgentIcon(agent.type)}
          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1, fontSize: '0.9rem' }}>
            {agent.name}
          </Typography>
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{ color: 'white' }}
          >
            <MoreIcon />
          </IconButton>
        </Box>
        <Chip
          label={agent.type.replace('_', ' ').toUpperCase()}
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
        />
        {agent.system_message && (
          <Typography variant="body2" sx={{ mt: 1, fontSize: '0.75rem', opacity: 0.8 }}>
            {agent.system_message.slice(0, 50)}...
          </Typography>
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleConnect}>
          <SearchIcon sx={{ mr: 1 }} />
          Connect
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Agent</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Agent Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="System Message"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={editSystemMessage}
            onChange={(e) => setEditSystemMessage(e.target.value)}
            placeholder="Enter custom instructions for this agent..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

interface WorkflowCanvasProps {
  agents: AgentConfig[];
  connections: Connection[];
  onAddConnection: (sourceId: string, targetId: string) => void;
  onRemoveAgent: (agentId: string) => void;
  onUpdateAgent: (agentId: string, updates: Partial<AgentConfig>) => void;
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  agents,
  connections,
  onAddConnection,
  onRemoveAgent,
  onUpdateAgent,
}) => {
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const { setNodeRef } = useDroppable({
    id: 'canvas',
  });

  const handleConnect = useCallback((agentId: string) => {
    if (connectingFrom === null) {
      setConnectingFrom(agentId);
    } else if (connectingFrom !== agentId) {
      onAddConnection(connectingFrom, agentId);
      setConnectingFrom(null);
    }
  }, [connectingFrom, onAddConnection]);

  const handleCanvasClick = () => {
    setConnectingFrom(null);
  };

  return (
    <Box
      ref={setNodeRef}
      onClick={handleCanvasClick}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        bgcolor: '#f5f5f5',
        backgroundImage: 'radial-gradient(circle, #ccc 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        overflow: 'hidden',
      }}
    >
      {agents.length === 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Drop agents here to build your workflow
          </Typography>
          <Typography variant="body2">
            Drag agents from the palette on the left
          </Typography>
        </Box>
      )}
      
      {agents.map(agent => (
        <AgentNode
          key={agent.id}
          agent={agent}
          onRemove={onRemoveAgent}
          onUpdate={onUpdateAgent}
          onConnect={handleConnect}
        />
      ))}

      {/* Connection lines */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {connections.map((connection, index) => {
          const sourceAgent = agents.find(a => a.id === connection.source_id);
          const targetAgent = agents.find(a => a.id === connection.target_id);
          
          if (!sourceAgent || !targetAgent) return null;

          const sourceX = (sourceAgent.position?.x || 0) + 100;
          const sourceY = (sourceAgent.position?.y || 0) + 50;
          const targetX = (targetAgent.position?.x || 0) + 100;
          const targetY = (targetAgent.position?.y || 0) + 50;

          return (
            <g key={index}>
              <line
                x1={sourceX}
                y1={sourceY}
                x2={targetX}
                y2={targetY}
                stroke="#1976d2"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#1976d2"
                  />
                </marker>
              </defs>
            </g>
          );
        })}
      </svg>

      {connectingFrom && (
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            bgcolor: 'primary.main',
            color: 'white',
            p: 1,
            borderRadius: 1,
            zIndex: 1000,
          }}
        >
          <Typography variant="body2">
            Click another agent to connect
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default WorkflowCanvas;