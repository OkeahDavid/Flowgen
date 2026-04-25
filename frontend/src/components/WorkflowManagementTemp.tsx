import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Divider,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  SmartToy as BotIcon,
  Search as SearchIcon,
  Download as ExportIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface WorkflowSummary {
  id: string;
  status: string;
  task: string;
  created_at: string;
  completed_at?: string;
  agent_count: number;
  agent_types: string[];
}

interface DetailedWorkflowResponse {
  workflow_id: string;
  status: string;
  result?: {
    messages: Array<{
      source: string;
      content: string;
      type: string;
      models_usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
      };
    }>;
    total_events?: number;
    stop_reason?: string;
  };
  error?: string;
}

const WorkflowManagement: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<DetailedWorkflowResponse | null>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch workflows from database API
      const response = await fetch(`${API_BASE_URL}/api/workflows`);
      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`);
      }
      
      const dbWorkflows = await response.json();
      
      // Convert database workflows to WorkflowSummary format
      const workflowList = dbWorkflows.map((wf: { id: string; status?: string; description?: string; name?: string; created_at: string; updated_at?: string; workflow_data?: { agents?: Array<{ type?: string }>; task?: string } }) => {
        const agents = wf.workflow_data?.agents || [];
        return {
          id: wf.id,
          status: wf.status || 'unknown',
          task: wf.workflow_data?.task || wf.description || wf.name || 'No description',
          created_at: wf.created_at,
          completed_at: wf.updated_at,
          agent_count: agents.length,
          agent_types: [...new Set(agents.map((a) => a.type || 'unknown'))],
        };
      });
      
      setWorkflows(workflowList);
    } catch (err) {
      setError('Failed to load workflows: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleViewWorkflow = async (workflowId: string) => {
    try {
      // Fetch workflow details from API
      const response = await fetch(`${API_BASE_URL}/workflow/${workflowId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow: ${response.statusText}`);
      }
      
      const workflowDetails = await response.json();
      setSelectedWorkflow(workflowDetails);
      setViewDialog(true);
    } catch (err) {
      setError('Failed to load workflow details: ' + String(err));
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      // Delete workflow from database
      const response = await fetch(`${API_BASE_URL}/api/workflows/${workflowId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete workflow: ${response.statusText}`);
      }
      
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      setDeleteDialog(false);
      setWorkflowToDelete(null);
    } catch (err) {
      setError('Failed to delete workflow: ' + String(err));
    }
  };

  const handleExportWorkflow = async (workflowId: string) => {
    try {
      // Fetch workflow from API
      const response = await fetch(`${API_BASE_URL}/workflow/${workflowId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow: ${response.statusText}`);
      }
      
      const workflowData = await response.json();
      
      // Create export data
      const exportData = {
        workflow_id: workflowData.workflow_id,
        status: workflowData.status,
        exported_at: new Date().toISOString(),
        result: workflowData.result,
        error: workflowData.error
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `workflow_${workflowId}_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
    } catch (err) {
      setError('Failed to export workflow: ' + String(err));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CircularProgress size={20} color="info" />;
      case 'completed':
        return <CheckIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <ScheduleIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'info';
      case 'completed':
        return 'success';
      case 'error':
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatAgentName = (id: string): string => {
    const parts = id.split('_');
    const cleaned = parts.filter((p) => !/^\d{6,}$/.test(p));
    return cleaned.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs % 60}s`;
    }
    return `${diffSecs}s`;
  };

  if (loading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading workflows...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', p: 3, overflow: 'auto', bgcolor: '#faf8f5' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#c45d3e', fontSize: '0.65rem', letterSpacing: '0.1em', mb: 0.5 }}>
            HISTORY
          </Typography>
          <Typography variant="h4" sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600, color: '#1a2b4a' }}>
            Workflow Management
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadWorkflows}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {workflows.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Workflows Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and execute workflows to see them listed here
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3 }}>
          {workflows.map((workflow) => (
            <Card key={workflow.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(workflow.status)}
                    <Chip
                      label={workflow.status.toUpperCase()}
                      color={getStatusColor(workflow.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {workflow.agent_count} agent{workflow.agent_count !== 1 ? 's' : ''}
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {workflow.id}
                </Typography>

                {workflow.agent_types.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                    {workflow.agent_types.map((t) => (
                      <Chip key={t} label={formatAgentName(t)} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(26,43,74,0.06)' }} />
                    ))}
                  </Box>
                )}

                <Typography variant="body2" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: '#2d3748', lineHeight: 1.6 }}>
                  {workflow.task}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Created:</Typography>
                    <Typography variant="caption">{formatDateTime(workflow.created_at)}</Typography>
                  </Box>
                  {workflow.completed_at && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Completed:</Typography>
                      <Typography variant="caption">{formatDateTime(workflow.completed_at)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Duration:</Typography>
                    <Typography variant="caption">
                      {calculateDuration(workflow.created_at, workflow.completed_at)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>

              <CardActions sx={{ p: 2, pt: 0 }}>
                <Tooltip title="View Details">
                  <IconButton 
                    color="primary" 
                    onClick={() => handleViewWorkflow(workflow.id)}
                    size="small"
                  >
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export Workflow">
                  <IconButton 
                    color="success" 
                    onClick={() => handleExportWorkflow(workflow.id)}
                    size="small"
                    disabled={workflow.status !== 'completed'}
                  >
                    <ExportIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Workflow">
                  <IconButton 
                    color="error" 
                    onClick={() => {
                      setWorkflowToDelete(workflow.id);
                      setDeleteDialog(true);
                    }}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* View Workflow Dialog */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, maxHeight: '90vh' }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedWorkflow && getStatusIcon(selectedWorkflow.status)}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Workflow Details
              </Typography>
              {selectedWorkflow && (
                <Typography variant="body2" color="text.secondary">
                  {selectedWorkflow.workflow_id}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ px: 3 }}>
          {selectedWorkflow ? (
            <Box>
              {selectedWorkflow.status === 'error' && selectedWorkflow.error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {selectedWorkflow.error}
                </Alert>
              )}

              {selectedWorkflow.result?.messages && selectedWorkflow.result.messages.length > 0 ? (
                <Stack spacing={2}>
                  {selectedWorkflow.result.messages.map((message, index) => {
                    // Filter out raw result messages
                    if (message.source === 'unknown' && message.content.includes('messages=[')) {
                      return null;
                    }

                    const agentName = formatAgentName(message.source || 'Agent');
                    const isLast = index === selectedWorkflow.result!.messages.length - 1;

                    return (
                      <MessageCard
                        key={index}
                        agentName={agentName}
                        content={typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}
                        isFinal={isLast}
                        defaultExpanded={isLast}
                      />
                    );
                  })}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <BotIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No messages available for this workflow
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setViewDialog(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog} 
        onClose={() => setDeleteDialog(false)}
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>Delete Workflow</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this workflow? This action cannot be undone.
          </Typography>
          {workflowToDelete && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontFamily: 'monospace' }}>
              ID: {workflowToDelete}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => workflowToDelete && handleDeleteWorkflow(workflowToDelete)} 
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── Message card with markdown rendering ────────────────────────────────────

const mdStyles = {
  lineHeight: 1.7,
  fontSize: '0.84rem',
  color: '#2d3748',
  fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
  wordBreak: 'break-word',
  '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
  '& strong': { fontWeight: 700, color: '#1a2b4a' },
  '& h1, & h2, & h3, & h4': {
    fontFamily: '"Playfair Display", Georgia, serif',
    color: '#1a2b4a',
    mt: 1.5,
    mb: 0.75,
    fontWeight: 600,
  },
  '& h3': { fontSize: '0.95rem' },
  '& h4': { fontSize: '0.88rem' },
  '& ul, & ol': { pl: 2.5, my: 0.5 },
  '& li': { mb: 0.3, fontSize: '0.84rem' },
  '& a': { color: '#c45d3e', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
  '& code': {
    bgcolor: 'rgba(26, 43, 74, 0.06)',
    px: 0.6,
    py: 0.15,
    borderRadius: 0.5,
    fontSize: '0.78rem',
    fontFamily: 'monospace',
  },
  '& blockquote': {
    borderLeft: '3px solid #c45d3e',
    pl: 1.5,
    ml: 0,
    color: '#5a6578',
    fontStyle: 'italic',
  },
  '& hr': { border: 'none', borderTop: '1px solid rgba(26,43,74,0.1)', my: 1.5 },
} as const;

function MessageCard({
  agentName,
  content,
  isFinal,
  defaultExpanded,
}: {
  agentName: string;
  content: string;
  isFinal: boolean;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: isFinal ? 'rgba(76, 175, 80, 0.3)' : 'rgba(26, 43, 74, 0.08)',
        bgcolor: isFinal ? 'rgba(76, 175, 80, 0.04)' : 'white',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.2,
          cursor: 'pointer',
          bgcolor: isFinal ? 'rgba(76, 175, 80, 0.08)' : 'rgba(26, 43, 74, 0.03)',
          borderBottom: expanded ? '1px solid rgba(26, 43, 74, 0.06)' : 'none',
          '&:hover': { bgcolor: isFinal ? 'rgba(76, 175, 80, 0.12)' : 'rgba(26, 43, 74, 0.05)' },
        }}
      >
        {isFinal ? (
          <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
        ) : (
          <BotIcon sx={{ fontSize: 16, color: '#5a6578' }} />
        )}
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#1a2b4a', flex: 1 }}>
          {agentName}
        </Typography>
        {isFinal && (
          <Chip label="final output" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(76,175,80,0.15)', color: 'success.dark' }} />
        )}
        <ExpandMoreIcon
          sx={{
            fontSize: 18,
            color: 'text.secondary',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'none',
          }}
        />
      </Box>

      {/* Content */}
      <Collapse in={expanded}>
        <Box sx={{ px: 2, py: 1.5, ...mdStyles }}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </Box>
      </Collapse>
    </Paper>
  );
}

export default WorkflowManagement;