import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton, 
  Menu, 
  MenuItem, 
  TextField, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  alpha,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Search as SearchIcon,
  Description as DocumentIcon,
  Summarize as SummaryIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { useDraggable } from '@dnd-kit/core';
import type { AgentConfig, Connection } from '../typesTemp';

// Agent-specific configuration components
interface AgentConfigProps {
  agent: AgentConfig;
  onUpdate: (updates: Partial<AgentConfig>) => void;
}

const AgentWebSearchConfig: React.FC<AgentConfigProps> = ({ agent, onUpdate }) => {
  const [searchQuery, setSearchQuery] = useState(agent.config?.searchQuery || '');
  const [maxResults, setMaxResults] = useState(agent.config?.maxResults || 10);

  const handleQueryChange = (query: string) => {
    setSearchQuery(query);
    onUpdate({
      config: {
        ...agent.config,
        searchQuery: query,
        maxResults
      }
    });
  };

  const handleMaxResultsChange = (results: number) => {
    setMaxResults(results);
    onUpdate({
      config: {
        ...agent.config,
        searchQuery,
        maxResults: results
      }
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 2 }}>
        <Chip label="Web Search Configuration" color="primary" size="small" />
      </Divider>
      
      <TextField
        fullWidth
        label="Search Query"
        variant="outlined"
        value={searchQuery}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Enter what you want to search for..."
        sx={{ mb: 2 }}
        helperText="Specify the search terms or query for this web search agent"
      />
      
      <TextField
        fullWidth
        label="Maximum Results"
        type="number"
        variant="outlined"
        value={maxResults}
        onChange={(e) => handleMaxResultsChange(parseInt(e.target.value) || 10)}
        inputProps={{ min: 1, max: 50 }}
        sx={{ mb: 1 }}
        helperText="Number of search results to retrieve (1-50)"
      />
    </Box>
  );
};

const AgentDocumentConfig: React.FC<AgentConfigProps> = ({ agent, onUpdate }) => {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(agent.config?.uploadedFiles || []);
  const [processingMode, setProcessingMode] = useState(agent.config?.processingMode || 'extract_text');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileNames = Array.from(files).map(file => file.name);
      const updatedFiles = [...uploadedFiles, ...fileNames];
      setUploadedFiles(updatedFiles);
      onUpdate({
        config: {
          ...agent.config,
          uploadedFiles: updatedFiles,
          processingMode
        }
      });
    }
  };

  const handleRemoveFile = (fileName: string) => {
    const updatedFiles = uploadedFiles.filter(file => file !== fileName);
    setUploadedFiles(updatedFiles);
    onUpdate({
      config: {
        ...agent.config,
        uploadedFiles: updatedFiles,
        processingMode
      }
    });
  };

  const handleProcessingModeChange = (event: SelectChangeEvent) => {
    const mode = event.target.value;
    setProcessingMode(mode);
    onUpdate({
      config: {
        ...agent.config,
        uploadedFiles,
        processingMode: mode
      }
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 2 }}>
        <Chip label="Document Search Configuration" color="warning" size="small" />
      </Divider>
      
      <Button
        component="label"
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        sx={{ mb: 2, width: '100%' }}
      >
        Upload Documents
        <input
          type="file"
          hidden
          multiple
          accept=".pdf,.doc,.docx,.txt,.md"
          onChange={handleFileUpload}
        />
      </Button>

      {uploadedFiles.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Uploaded Documents:</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {uploadedFiles.map((fileName, index) => (
              <Chip
                key={index}
                label={fileName}
                onDelete={() => handleRemoveFile(fileName)}
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <FormControl fullWidth sx={{ mb: 1 }}>
        <InputLabel>Processing Mode</InputLabel>
        <Select
          value={processingMode}
          label="Processing Mode"
          onChange={handleProcessingModeChange}
        >
          <MenuItem value="extract_text">Extract Text Only</MenuItem>
          <MenuItem value="semantic_search">Semantic Search</MenuItem>
          <MenuItem value="full_analysis">Full Document Analysis</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

const AgentSummarizerConfig: React.FC<AgentConfigProps> = ({ agent, onUpdate }) => {
  const [summaryType, setSummaryType] = useState(agent.config?.summaryType || 'results');
  const [summaryLength, setSummaryLength] = useState(agent.config?.summaryLength || 'medium');
  const [focusAreas, setFocusAreas] = useState<string[]>(agent.config?.focusAreas || []);
  const [newFocusArea, setNewFocusArea] = useState('');

  const handleSummaryTypeChange = (event: SelectChangeEvent) => {
    const type = event.target.value;
    setSummaryType(type);
    onUpdate({
      config: {
        ...agent.config,
        summaryType: type,
        summaryLength,
        focusAreas
      }
    });
  };

  const handleSummaryLengthChange = (event: SelectChangeEvent) => {
    const length = event.target.value;
    setSummaryLength(length);
    onUpdate({
      config: {
        ...agent.config,
        summaryType,
        summaryLength: length,
        focusAreas
      }
    });
  };

  const handleAddFocusArea = () => {
    if (newFocusArea.trim() && !focusAreas.includes(newFocusArea.trim())) {
      const updatedAreas = [...focusAreas, newFocusArea.trim()];
      setFocusAreas(updatedAreas);
      setNewFocusArea('');
      onUpdate({
        config: {
          ...agent.config,
          summaryType,
          summaryLength,
          focusAreas: updatedAreas
        }
      });
    }
  };

  const handleRemoveFocusArea = (area: string) => {
    const updatedAreas = focusAreas.filter(a => a !== area);
    setFocusAreas(updatedAreas);
    onUpdate({
      config: {
        ...agent.config,
        summaryType,
        summaryLength,
        focusAreas: updatedAreas
      }
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 2 }}>
        <Chip label="Summarizer Configuration" color="success" size="small" />
      </Divider>
      
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Summary Type</InputLabel>
        <Select
          value={summaryType}
          label="Summary Type"
          onChange={handleSummaryTypeChange}
        >
          <MenuItem value="results">Results Summary</MenuItem>
          <MenuItem value="conversation">Conversation Summary</MenuItem>
          <MenuItem value="document">Document Summary</MenuItem>
          <MenuItem value="workflow">Workflow Summary</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Summary Length</InputLabel>
        <Select
          value={summaryLength}
          label="Summary Length"
          onChange={handleSummaryLengthChange}
        >
          <MenuItem value="brief">Brief (1-2 sentences)</MenuItem>
          <MenuItem value="medium">Medium (1 paragraph)</MenuItem>
          <MenuItem value="detailed">Detailed (Multiple paragraphs)</MenuItem>
          <MenuItem value="comprehensive">Comprehensive (Full analysis)</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Focus Areas (Optional)</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            size="small"
            placeholder="Add focus area..."
            value={newFocusArea}
            onChange={(e) => setNewFocusArea(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddFocusArea()}
            sx={{ flex: 1 }}
          />
          <Button onClick={handleAddFocusArea} variant="outlined" size="small">
            Add
          </Button>
        </Box>
        {focusAreas.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {focusAreas.map((area, index) => (
              <Chip
                key={index}
                label={area}
                onDelete={() => handleRemoveFocusArea(area)}
                color="success"
                variant="outlined"
                size="small"
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

interface WorkflowCanvasProps {
  agents: AgentConfig[];
  connections: Connection[];
  onAddConnection: (sourceId: string, targetId: string) => void;
  onRemoveConnection: (sourceId: string, targetId: string) => void;
  onRemoveAgent: (agentId: string) => void;
  onUpdateAgent: (agentId: string, updates: Partial<AgentConfig>) => void;
}

interface AgentNodeProps {
  agent: AgentConfig;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<AgentConfig>) => void;
  onStartConnection: (sourceId: string) => void;
  onCompleteConnection: (targetId: string) => void;
  onCancelConnection: () => void;
  isConnecting: boolean;
  connectingFrom: string | null;
}

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
      return '#2196f3';
  }
};

const AgentNode: React.FC<AgentNodeProps> = ({ 
  agent, 
  onRemove, 
  onUpdate, 
  onStartConnection, 
  onCompleteConnection, 
  onCancelConnection,
  connectingFrom 
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editName, setEditName] = useState(agent.name);
  const [editMessage, setEditMessage] = useState(agent.system_message);

  // Update state when agent data changes
  React.useEffect(() => {
    setEditName(agent.name);
    setEditMessage(agent.system_message);
  }, [agent.name, agent.system_message]);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: agent.id,
    data: {
      type: 'agent',
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    console.log('Menu button clicked for agent:', agent.id);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    console.log('Menu closed for agent:', agent.id);
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setEditDialog(true);
    handleMenuClose();
  };

  const handleSaveEdit = () => {
    onUpdate(agent.id, {
      name: editName,
      system_message: editMessage,
    });
    setEditDialog(false);
  };

  const handleRemove = () => {
    onRemove(agent.id);
    handleMenuClose();
  };

  const agentColor = getAgentColor(agent.type);

  return (
    <>
      <Paper
        ref={setDragRef}
        style={style}
        onDoubleClick={(e) => {
          e.stopPropagation();
          console.log('Double-clicked agent:', agent.id, 'connectingFrom:', connectingFrom);
          // Alternative connection method - double click to start/complete connection
          if (connectingFrom && connectingFrom !== agent.id) {
            console.log('Double-click completing connection from', connectingFrom, 'to', agent.id);
            onCompleteConnection(agent.id);
          } else if (!connectingFrom) {
            console.log('Double-click starting connection from', agent.id);
            onStartConnection(agent.id);
          } else if (connectingFrom === agent.id) {
            console.log('Double-click canceling connection');
            onCancelConnection();
          }
        }}
        sx={{
          position: 'absolute',
          left: agent.position?.x || 100,
          top: agent.position?.y || 100,
          width: 200,
          p: 2,
          border: `2px solid ${agentColor}`,
          borderRadius: 2,
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: isDragging ? 0.5 : 1,
          bgcolor: alpha(agentColor, 0.05),
          '&:hover': {
            boxShadow: `0 4px 12px ${alpha(agentColor, 0.3)}`,
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 1,
          }}
        >
          <Box 
            {...listeners}
            {...attributes}
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              flex: 1,
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' },
              mr: 1
            }}
          >
            <Box sx={{ color: agentColor, mr: 1 }}>
              {getAgentIcon(agent.type)}
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1, fontSize: '0.85rem' }}>
              {agent.name}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              console.log('Three dots clicked!', agent.id);
              handleMenuClick(e);
            }}
            sx={{ 
              ml: 1,
              '&:hover': { bgcolor: alpha(agentColor, 0.1) },
              zIndex: 100,
              position: 'relative'
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Connection handles - Output (right side) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Right handle clicked for agent:', agent.id, 'connectingFrom:', connectingFrom);
            if (connectingFrom === agent.id) {
              // Cancel connection if clicking on the same agent
              console.log('Canceling connection');
              onCancelConnection();
            } else if (connectingFrom) {
              // Complete connection
              console.log('Completing connection to:', agent.id);
              onCompleteConnection(agent.id);
            } else {
              // Start connection
              console.log('Starting connection from:', agent.id);
              onStartConnection(agent.id);
            }
          }}
          style={{
            position: 'absolute',
            right: -10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: connectingFrom === agent.id ? '#ff5722' : '#ffffff',
            border: `2px solid ${connectingFrom === agent.id ? '#ff5722' : agentColor}`,
            cursor: 'pointer',
            boxShadow: connectingFrom === agent.id ? '0 0 6px rgba(255, 87, 34, 0.4)' : '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 100,
            transition: 'all 0.15s ease',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            fontWeight: 'bold',
            color: connectingFrom === agent.id ? '#ffffff' : agentColor,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.2)';
            e.currentTarget.style.boxShadow = `0 0 8px rgba(33, 150, 243, 0.4)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(-50%)';
            e.currentTarget.style.boxShadow = connectingFrom === agent.id ? '0 0 6px rgba(255, 87, 34, 0.4)' : '0 2px 4px rgba(0,0,0,0.1)';
          }}
          title={connectingFrom === agent.id ? "Cancel connection" : "Click to start connection"}
        >
          {connectingFrom === agent.id ? '×' : '→'}
        </button>


        
        {/* Connection handles - Input (left side) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Left handle clicked for agent:', agent.id, 'connectingFrom:', connectingFrom);
            if (connectingFrom && connectingFrom !== agent.id) {
              console.log('Completing connection from', connectingFrom, 'to', agent.id);
              onCompleteConnection(agent.id);
            } else {
              console.log('Left handle clicked but no valid connection state');
            }
          }}
          style={{
            position: 'absolute',
            left: -10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: connectingFrom && connectingFrom !== agent.id ? 18 : 16,
            height: connectingFrom && connectingFrom !== agent.id ? 18 : 16,
            borderRadius: '50%',
            backgroundColor: connectingFrom && connectingFrom !== agent.id ? '#4caf50' : '#ffffff',
            border: `2px solid ${connectingFrom && connectingFrom !== agent.id ? '#4caf50' : '#cccccc'}`,
            cursor: connectingFrom && connectingFrom !== agent.id ? 'pointer' : 'default',
            opacity: connectingFrom && connectingFrom !== agent.id ? 1 : 0.6,
            boxShadow: connectingFrom && connectingFrom !== agent.id ? '0 0 8px rgba(76, 175, 80, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
            animation: connectingFrom && connectingFrom !== agent.id ? 'pulse 0.8s infinite' : 'none',
            zIndex: 100,
            transition: 'all 0.15s ease',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            fontWeight: 'bold',
            color: connectingFrom && connectingFrom !== agent.id ? '#ffffff' : '#888888',
          }}
          onMouseEnter={(e) => {
            if (connectingFrom && connectingFrom !== agent.id) {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.2)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(76, 175, 80, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(-50%)';
            e.currentTarget.style.boxShadow = connectingFrom && connectingFrom !== agent.id ? '0 0 8px rgba(76, 175, 80, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)';
          }}
          title={connectingFrom && connectingFrom !== agent.id ? "Click to complete connection" : "Connection input"}
        >
          {connectingFrom && connectingFrom !== agent.id ? '✓' : '●'}
        </button>
        
        {/* Visual indicator for target connection */}
        {connectingFrom && connectingFrom !== agent.id && (
          <Box
            sx={{
              position: 'absolute',
              left: -35,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#4caf50',
              fontSize: '12px',
              fontWeight: 'bold',
              pointerEvents: 'none',
              animation: 'fadeInOut 1s infinite',
            }}
          >
            ← CLICK
          </Box>
        )}
      </Paper>

      {/* Enhanced Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{
          zIndex: 9999,
          '& .MuiPaper-root': {
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            borderRadius: 3,
            border: '1px solid rgba(0,0,0,0.05)',
            minWidth: 200,
            mt: 1,
          }
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
            {agent.name}
          </Typography>
        </Box>
        <MenuItem 
          onClick={handleEdit}
          sx={{ 
            py: 1.5, 
            px: 2,
            '&:hover': { bgcolor: alpha(getAgentColor(agent.type), 0.08) }
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: getAgentColor(agent.type),
            width: '100%'
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: alpha(getAgentColor(agent.type), 0.1),
              mr: 2
            }}>
              {getAgentIcon(agent.type)}
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                Configure Agent
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Edit settings and system message
              </Typography>
            </Box>
          </Box>
        </MenuItem>
        <Divider sx={{ mx: 1 }} />
        <MenuItem 
          onClick={handleRemove} 
          sx={{ 
            py: 1.5, 
            px: 2,
            '&:hover': { bgcolor: alpha('#f44336', 0.08) }
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: 'error.main',
            width: '100%'
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: alpha('#f44336', 0.1),
              mr: 2
            }}>
              <CloseIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                Remove Agent
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Delete from workflow
              </Typography>
            </Box>
          </Box>
        </MenuItem>
      </Menu>

      {/* Enhanced Edit Dialog */}
      <Dialog 
        open={editDialog} 
        onClose={() => setEditDialog(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 24px 72px rgba(0,0,0,0.15)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: alpha(getAgentColor(agent.type), 0.1),
              color: getAgentColor(agent.type)
            }}>
              {getAgentIcon(agent.type)}
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Configure Agent
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {agent.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} • ID: {agent.id.slice(-8)}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ px: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Basic Configuration Section */}
            <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: getAgentColor(agent.type) }} />
                Basic Settings
              </Typography>
              
              <TextField
                label="Agent Name"
                fullWidth
                variant="outlined"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                sx={{ mb: 2 }}
                helperText="A descriptive name for this agent in your workflow"
              />
              
              <TextField
                label="System Message"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder="Enter instructions for this agent..."
                helperText={`This message defines the agent's role and behavior${agent.system_message ? ` (${agent.system_message.length} chars loaded from backend)` : ' (empty - backend may not be connected)'}`}
                sx={{
                  '& .MuiInputBase-root': {
                    bgcolor: 'background.paper'
                  }
                }}
              />
            </Paper>

            {/* Agent-specific configuration */}
            {agent.type === 'web_search' && (
              <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: alpha(getAgentColor(agent.type), 0.2) }}>
                <AgentWebSearchConfig 
                  agent={agent} 
                  onUpdate={(updates) => {
                    onUpdate(agent.id, updates);
                  }}
                />
              </Paper>
            )}

            {agent.type === 'document_search' && (
              <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: alpha(getAgentColor(agent.type), 0.2) }}>
                <AgentDocumentConfig 
                  agent={agent} 
                  onUpdate={(updates) => {
                    onUpdate(agent.id, updates);
                  }}
                />
              </Paper>
            )}

            {agent.type === 'summarizer' && (
              <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: alpha(getAgentColor(agent.type), 0.2) }}>
                <AgentSummarizerConfig 
                  agent={agent} 
                  onUpdate={(updates) => {
                    onUpdate(agent.id, updates);
                  }}
                />
              </Paper>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          <Button 
            onClick={() => setEditDialog(false)}
            variant="outlined"
            sx={{ px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained" 
            color="primary"
            sx={{ 
              px: 4,
              background: `linear-gradient(135deg, ${getAgentColor(agent.type)}, ${alpha(getAgentColor(agent.type), 0.8)})`,
              '&:hover': {
                background: `linear-gradient(135deg, ${alpha(getAgentColor(agent.type), 0.9)}, ${alpha(getAgentColor(agent.type), 0.7)})`,
              }
            }}
          >
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ 
  agents, 
  connections, 
  onAddConnection, 
  onRemoveConnection,
  onRemoveAgent, 
  onUpdateAgent 
}) => {
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const handleStartConnection = (agentId: string) => {
    console.log('Starting connection from:', agentId);
    setConnectingFrom(agentId);
  };

  const handleCompleteConnection = (targetId: string) => {
    console.log('Completing connection to:', targetId, 'from:', connectingFrom);
    if (connectingFrom && connectingFrom !== targetId) {
      console.log('Creating connection:', connectingFrom, '->', targetId);
      onAddConnection(connectingFrom, targetId);
      setConnectingFrom(null);
      // Visual feedback
      console.log('Connection created successfully!');
    } else {
      console.log('Cannot complete connection - invalid state');
    }
  };

  const handleCancelConnection = () => {
    setConnectingFrom(null);
  };

  return (
    <Box 
      onClick={handleCancelConnection}
      sx={{ 
        height: '100%', 
        width: '100%',
        position: 'relative',
        bgcolor: connectingFrom ? alpha('#ff5722', 0.05) : '#fafafa',
        backgroundImage: 'radial-gradient(circle, #e0e0e0 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        transition: 'background-color 0.2s ease',
        overflow: 'hidden',
        cursor: connectingFrom ? 'crosshair' : 'default',
        '@keyframes pulse': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        '@keyframes fadeInOut': {
          '0%': { opacity: 0.3 },
          '50%': { opacity: 1 },
          '100%': { opacity: 0.3 },
        },
      }}
    >
      {agents.length === 0 ? (
        <Box sx={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <Typography variant="h4" sx={{ fontWeight: 300, color: 'text.secondary', mb: 2 }}>
            Workflow Canvas
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
            Click agents from the left panel to add them to your workflow
          </Typography>
        </Box>
      ) : (
        <>
          {/* Render agents */}
          {agents.map((agent) => (
            <AgentNode
              key={agent.id}
              agent={agent}
              onRemove={onRemoveAgent}
              onUpdate={onUpdateAgent}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
              onCancelConnection={handleCancelConnection}
              isConnecting={connectingFrom !== null}
              connectingFrom={connectingFrom}
            />
          ))}

          {/* Render connections */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {connections.map((connection, index) => {
              const sourceAgent = agents.find(a => a.id === connection.source_id);
              const targetAgent = agents.find(a => a.id === connection.target_id);
              
              if (!sourceAgent || !targetAgent) return null;
              
              const sourceX = (sourceAgent.position?.x || 100) + 200;
              const sourceY = (sourceAgent.position?.y || 100) + 40;
              const targetX = targetAgent.position?.x || 100;
              const targetY = (targetAgent.position?.y || 100) + 40;
              
              // Calculate curve for smoother connections
              const dx = targetX - sourceX;
              const dy = targetY - sourceY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              // Create curved path for better visual flow
              const controlPointOffset = Math.min(distance * 0.4, 100);
              const midX = sourceX + dx * 0.5;
              const midY = sourceY + dy * 0.5;
              
              // Bezier curve path
              const pathData = `M ${sourceX} ${sourceY} Q ${sourceX + controlPointOffset} ${sourceY} ${midX} ${midY} Q ${targetX - controlPointOffset} ${targetY} ${targetX} ${targetY}`;
              
              return (
                <g key={index}>
                  {/* Glow effect background */}
                  <path
                    d={pathData}
                    stroke="rgba(33, 150, 243, 0.2)"
                    strokeWidth="8"
                    fill="none"
                    style={{
                      filter: 'blur(2px)',
                    }}
                  />
                  {/* Main connection line */}
                  <path
                    d={pathData}
                    stroke="url(#connectionGradient)"
                    strokeWidth="3"
                    fill="none"
                    markerEnd="url(#modernArrowhead)"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                    }}
                  />
                  {/* Animated flow indicator */}
                  <circle
                    r="4"
                    fill="#ffffff"
                    stroke="#2196f3"
                    strokeWidth="2"
                    style={{
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                    }}
                  >
                    <animateMotion
                      dur="3s"
                      repeatCount="indefinite"
                      path={pathData}
                    />
                  </circle>
                </g>
              );
            })}
            
            {/* Enhanced arrow marker definitions */}
            <defs>
              {/* Gradient for connection lines */}
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{stopColor: '#2196f3', stopOpacity: 0.8}} />
                <stop offset="50%" style={{stopColor: '#1976d2', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: '#0d47a1', stopOpacity: 0.9}} />
              </linearGradient>
              
              {/* Modern arrowhead */}
              <marker
                id="modernArrowhead"
                markerWidth="16"
                markerHeight="12"
                refX="15"
                refY="6"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path
                  d="M 0 0 L 16 6 L 0 12 L 4 6 Z"
                  fill="url(#arrowGradient)"
                  stroke="#0d47a1"
                  strokeWidth="0.5"
                  style={{
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                  }}
                />
              </marker>
              
              {/* Gradient for arrowhead */}
              <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{stopColor: '#1976d2', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: '#0d47a1', stopOpacity: 1}} />
              </linearGradient>
            </defs>
          </svg>

          {/* Render connection removal buttons */}
          {connections.map((connection, index) => {
            const sourceAgent = agents.find(a => a.id === connection.source_id);
            const targetAgent = agents.find(a => a.id === connection.target_id);
            
            if (!sourceAgent || !targetAgent) return null;
            
            const sourceX = (sourceAgent.position?.x || 100) + 200;
            const sourceY = (sourceAgent.position?.y || 100) + 40;
            const targetX = targetAgent.position?.x || 100;
            const targetY = (targetAgent.position?.y || 100) + 40;
            
            const midX = (sourceX + targetX) / 2;
            const midY = (sourceY + targetY) / 2;
            
            return (
              <button
                key={`remove-${index}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Removing connection:', connection);
                  onRemoveConnection(connection.source_id, connection.target_id);
                }}
                style={{
                  position: 'absolute',
                  left: midX - 10,
                  top: midY - 10,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '2px solid #ff5722',
                  cursor: 'pointer',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#ff5722',
                  outline: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.2)';
                  e.currentTarget.style.backgroundColor = '#ff5722';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.color = '#ff5722';
                }}
                title="Click to remove connection"
              >
                ×
              </button>
            );
          })}

          {/* Stats and connection status overlay */}
          <Box sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            px: 2,
            py: 1,
            borderRadius: 1,
            backdropFilter: 'blur(4px)',
          }}>
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
              Agents: {agents.length} | Connections: {connections.length}
            </Typography>
            {connectingFrom && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', fontWeight: 600 }}>
                🔗 From: {agents.find(a => a.id === connectingFrom)?.name}
              </Typography>
            )}
            {connectingFrom && (
              <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 600, fontSize: '0.7rem' }}>
                Click LEFT circle of target agent
              </Typography>
            )}
            {/* Control buttons */}
            <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexDirection: 'column' }}>
              {connectingFrom && (
                <button 
                  onClick={() => {
                    console.log('Cancel connection button clicked');
                    handleCancelConnection();
                  }}
                  style={{ 
                    fontSize: '10px',
                    padding: '2px 6px',
                    backgroundColor: '#ff5722',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </Box>
        </>
      )}
    </Box>
  );
};

export default WorkflowCanvas;