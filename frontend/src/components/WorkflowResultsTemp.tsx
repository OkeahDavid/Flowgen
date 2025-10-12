import { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Chip,
  Stack,
  Alert,
  LinearProgress,
  IconButton,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import type { WorkflowResponse, WorkflowMessage } from '../typesTemp';
import { getWorkflowStatus } from '../services/apiTemp';

interface WorkflowResultsProps {
  response: WorkflowResponse | null;
  onWorkflowUpdate?: (updatedResponse: WorkflowResponse) => void;
}

const WorkflowResults = ({ response, onWorkflowUpdate }: WorkflowResultsProps) => {
  const [currentResponse, setCurrentResponse] = useState<WorkflowResponse | null>(response);
  const [polling, setPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);

  // Auto-polling for running workflows
  useEffect(() => {
    let intervalId: number | null = null;

    if (response?.status === 'running' && response.workflow_id) {
      setPolling(true);
      intervalId = setInterval(async () => {
        try {
          const updatedResponse = await getWorkflowStatus(response.workflow_id);
          setCurrentResponse(updatedResponse);
          setLastPollTime(new Date());
          
          if (onWorkflowUpdate) {
            onWorkflowUpdate(updatedResponse);
          }

          // Stop polling when workflow completes
          if (updatedResponse.status !== 'running') {
            setPolling(false);
          }
        } catch (error) {
          console.error('Error polling workflow status:', error);
          setPolling(false);
        }
      }, 3000); // Poll every 3 seconds
    } else {
      setPolling(false);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [response?.workflow_id, response?.status, onWorkflowUpdate]);

  // Update local state when prop changes
  useEffect(() => {
    setCurrentResponse(response);
  }, [response]);

  const handleManualRefresh = async () => {
    if (currentResponse?.workflow_id) {
      try {
        const updatedResponse = await getWorkflowStatus(currentResponse.workflow_id);
        setCurrentResponse(updatedResponse);
        setLastPollTime(new Date());
        
        if (onWorkflowUpdate) {
          onWorkflowUpdate(updatedResponse);
        }
      } catch (error) {
        console.error('Error refreshing workflow status:', error);
      }
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

  return (
    <Box sx={{ height: '100%', p: 3, bgcolor: 'background.default', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Workflow Results
        </Typography>
        {currentResponse?.workflow_id && (
          <IconButton 
            onClick={handleManualRefresh} 
            size="small" 
            disabled={polling}
            title="Refresh status"
          >
            <RefreshIcon />
          </IconButton>
        )}
      </Box>

      {currentResponse ? (
        <Box>
          {/* Workflow Status Header */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon(currentResponse.status)}
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {currentResponse.status.charAt(0).toUpperCase() + currentResponse.status.slice(1)}
                </Typography>
              </Box>
              <Chip
                label={currentResponse.status.toUpperCase()}
                color={getStatusColor(currentResponse.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                variant="outlined"
                size="small"
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', mb: 1 }}>
              ID: {currentResponse.workflow_id}
            </Typography>
            
            {polling && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="info.main">
                    Auto-refreshing every 3 seconds
                  </Typography>
                </Box>
                <LinearProgress variant="indeterminate" sx={{ borderRadius: 1 }} />
              </Box>
            )}

            {lastPollTime && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Last updated: {lastPollTime.toLocaleTimeString()}
              </Typography>
            )}
          </Paper>

          {/* Error Display */}
          {currentResponse.status === 'error' && currentResponse.error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Workflow Error
              </Typography>
              <Typography variant="body2">
                {currentResponse.error}
              </Typography>
            </Alert>
          )}

          {/* Progress Information */}
          {currentResponse.result && (
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Progress Overview
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip 
                  icon={<ViewIcon />} 
                  label={`${currentResponse.result.messages?.length || 0} Messages`} 
                  variant="outlined" 
                  color="primary"
                />
                {currentResponse.result.total_events && (
                  <Chip 
                    label={`${currentResponse.result.total_events} Events`} 
                    variant="outlined" 
                    color="secondary"
                  />
                )}
                {currentResponse.result.stop_reason && currentResponse.status === 'completed' && (
                  <Chip 
                    label={currentResponse.result.stop_reason} 
                    variant="outlined" 
                    color="success"
                  />
                )}
              </Stack>
            </Paper>
          )}

          {/* Messages Display */}
          {currentResponse.result?.messages && currentResponse.result.messages.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Conversation Flow ({currentResponse.result.messages.length} messages)
              </Typography>
              
              <Stack spacing={2}>
                {currentResponse.result.messages.map((message: WorkflowMessage, index: number) => {
                  // Filter out the raw result message that contains the full conversation dump
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
            </Box>
          )}

          {/* Running Status Message */}
          {currentResponse.status === 'running' && (
            <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
              <Typography variant="body2">
                🔄 Your AI agents are working together to complete this task. Results will appear here as they become available.
              </Typography>
            </Alert>
          )}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <BotIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
            No Active Workflow
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Execute a workflow to see real-time results and agent conversations here
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default WorkflowResults;