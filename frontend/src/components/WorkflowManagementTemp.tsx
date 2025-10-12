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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Divider,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Tooltip,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Download as ExportIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Create as CreateIcon
} from '@mui/icons-material';
import { listWorkflows, getWorkflowStatus, deleteWorkflow } from '../services/apiTemp';

interface WorkflowSummary {
  id: string;
  status: string;
  task: string;
  created_at: string;
  completed_at?: string;
  agent_count: number;
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
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const [importDialog, setImportDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [newWorkflowData, setNewWorkflowData] = useState<{
    id: string;
    task: string;
    status: 'completed' | 'failed';
  }>({
    id: '',
    task: '',
    status: 'completed'
  });

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const workflowList = await listWorkflows();
      setWorkflows(workflowList);
    } catch (err) {
      setError('Failed to load workflows: ' + String(err));
      console.error('Error loading workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleViewWorkflow = async (workflowId: string) => {
    try {
      const workflowDetails = await getWorkflowStatus(workflowId);
      setSelectedWorkflow(workflowDetails);
      setViewDialog(true);
    } catch (err) {
      setError('Failed to load workflow details: ' + String(err));
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await deleteWorkflow(workflowId);
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      setDeleteDialog(false);
      setWorkflowToDelete(null);
    } catch (err) {
      setError('Failed to delete workflow: ' + String(err));
    }
  };

  const handleExportWorkflow = async (workflowId: string) => {
    try {
      const response = await getWorkflowStatus(workflowId);
      
      // Create export data
      const exportData = {
        workflow_id: response.workflow_id,
        status: response.status,
        exported_at: new Date().toISOString(),
        result: response.result
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

  const handleImportWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        // Validate the imported data structure
        if (!importedData.workflow_id || !importedData.status) {
          setError('Invalid workflow file format');
          return;
        }

        // Create a new workflow entry from imported data
        const newWorkflow: WorkflowSummary = {
          id: importedData.workflow_id,
          status: importedData.status,
          task: importedData.result?.task || 'Imported workflow',
          created_at: importedData.exported_at || new Date().toISOString(),
          completed_at: importedData.status === 'completed' ? importedData.exported_at : undefined,
          agent_count: importedData.result?.agent_count || 0
        };

        setWorkflows(prev => [newWorkflow, ...prev]);
        setImportDialog(false);
        
      } catch {
        setError('Failed to import workflow: Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateWorkflow = () => {
    if (!newWorkflowData.id || !newWorkflowData.task) {
      setError('Please fill in all required fields');
      return;
    }

    const newWorkflow: WorkflowSummary = {
      id: newWorkflowData.id,
      status: newWorkflowData.status,
      task: newWorkflowData.task,
      created_at: new Date().toISOString(),
      completed_at: newWorkflowData.status === 'completed' ? new Date().toISOString() : undefined,
      agent_count: 1
    };

    setWorkflows(prev => [newWorkflow, ...prev]);
    setCreateDialog(false);
    setNewWorkflowData({ id: '', task: '', status: 'completed' });
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
        return 'error';
      default:
        return 'default';
    }
  };

  const getMessageIcon = (source: string) => {
    if (source === 'user') {
      return <PersonIcon fontSize="small" color="primary" />;
    } else if (source === 'unknown' || source === 'DiGraphStopAgent') {
      return <BotIcon fontSize="small" color="disabled" />;
    } else {
      return <BotIcon fontSize="small" color="secondary" />;
    }
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
    <Box sx={{ height: '100%', p: 3, overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Workflow Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={(event) => setAddMenuAnchor(event.currentTarget)}
          >
            Add Workflow
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadWorkflows}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
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
                    {workflow.agent_count} agents
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {workflow.id}
                </Typography>

                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, fontSize: '1rem' }}>
                  Task
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
                <Alert severity="error" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Workflow Error
                  </Typography>
                  <Typography variant="body2">
                    {selectedWorkflow.error}
                  </Typography>
                </Alert>
              )}

              {selectedWorkflow.result?.messages && selectedWorkflow.result.messages.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Conversation Flow ({selectedWorkflow.result.messages.length} messages)
                  </Typography>
                  
                  <Stack spacing={2}>
                    {selectedWorkflow.result.messages.map((message, index) => {
                      // Filter out raw result messages
                      if (message.source === 'unknown' && message.content.includes('messages=[')) {
                        return null;
                      }

                      return (
                        <Accordion key={index} sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                          <AccordionSummary 
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ 
                              borderRadius: 2,
                              '& .MuiAccordionSummary-content': { alignItems: 'center' }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                              {getMessageIcon(message.source)}
                              <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                                {message.source === 'user' ? 'User Input' : 
                                 message.source === 'DiGraphStopAgent' ? 'System' :
                                 `Agent: ${message.source}`}
                              </Typography>
                              <Chip
                                label={message.type || 'TextMessage'}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                              {message.models_usage && (
                                <Chip
                                  label={`${message.models_usage.prompt_tokens || 0}→${message.models_usage.completion_tokens || 0} tokens`}
                                  size="small"
                                  variant="outlined"
                                  color="secondary"
                                />
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 0 }}>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                              {message.content}
                            </Typography>
                            {message.models_usage && (
                              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  Token Usage:
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Prompt: {message.models_usage.prompt_tokens || 0} • 
                                  Completion: {message.models_usage.completion_tokens || 0} • 
                                  Total: {(message.models_usage.prompt_tokens || 0) + (message.models_usage.completion_tokens || 0)}
                                </Typography>
                              </Box>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Stack>

                  {selectedWorkflow.result.stop_reason && (
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                      <Typography variant="subtitle2" color="success.dark" sx={{ fontWeight: 600 }}>
                        Completion Reason: {selectedWorkflow.result.stop_reason}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {(!selectedWorkflow.result?.messages || selectedWorkflow.result.messages.length === 0) && (
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

      {/* Add Workflow Menu */}
      <Menu
        anchorEl={addMenuAnchor}
        open={Boolean(addMenuAnchor)}
        onClose={() => setAddMenuAnchor(null)}
        PaperProps={{
          sx: { borderRadius: 2, minWidth: 200 }
        }}
      >
        <MenuItem onClick={() => { setImportDialog(true); setAddMenuAnchor(null); }}>
          <ListItemIcon>
            <UploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Import from File</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setCreateDialog(true); setAddMenuAnchor(null); }}>
          <ListItemIcon>
            <CreateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Create Manually</ListItemText>
        </MenuItem>
      </Menu>

      {/* Import Dialog */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Workflow</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a JSON file exported from Flowgen to import a workflow.
          </Typography>
          <input
            type="file"
            accept=".json"
            onChange={handleImportWorkflow}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Create Workflow Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Workflow Entry</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Workflow ID"
              value={newWorkflowData.id}
              onChange={(e) => setNewWorkflowData(prev => ({ ...prev, id: e.target.value }))}
              fullWidth
              required
              helperText="Unique identifier for the workflow"
            />
            <TextField
              label="Task Description"
              value={newWorkflowData.task}
              onChange={(e) => setNewWorkflowData(prev => ({ ...prev, task: e.target.value }))}
              fullWidth
              required
              multiline
              rows={3}
              helperText="Description of what this workflow accomplishes"
            />
            <TextField
              label="Status"
              value={newWorkflowData.status}
              onChange={(e) => setNewWorkflowData(prev => ({ ...prev, status: e.target.value as 'completed' | 'failed' }))}
              select
              fullWidth
              required
            >
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateWorkflow} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowManagement;