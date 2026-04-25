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
  Visibility as ViewIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import type { WorkflowResponse, WorkflowMessage } from '../typesTemp';
import { getWorkflowStatus } from '../services/apiTemp';

interface WorkflowResultsProps {
  response: WorkflowResponse | null;
  onWorkflowUpdate?: (updatedResponse: WorkflowResponse) => void;
  onClearResults?: () => void;
}

const WorkflowResults = ({ response, onWorkflowUpdate, onClearResults }: WorkflowResultsProps) => {
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
        } catch {
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
      } catch {
        // Error refreshing status
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
    } else if (source === 'unknown' || source === 'system') {
      return <BotIcon fontSize="small" color="disabled" />;
    } else {
      return <BotIcon fontSize="small" color="secondary" />;
    }
  };

  return (
    <Box sx={{ height: '100%', p: 3, bgcolor: '#faf8f5', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#c45d3e', fontSize: '0.65rem', letterSpacing: '0.1em', mb: 0.5 }}>
            OUTPUT
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600, fontSize: '1.1rem', color: '#1a2b4a' }}>
            Workflow Results
          </Typography>
        </Box>
        {currentResponse?.workflow_id && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={handleManualRefresh} 
              size="small" 
              disabled={polling}
              title="Refresh status"
            >
              <RefreshIcon />
            </IconButton>
            {onClearResults && (
              <IconButton 
                onClick={() => {
                  onClearResults();
                  setCurrentResponse(null);
                }} 
                size="small"
                title="Clear results"
              >
                <ClearIcon />
              </IconButton>
            )}
          </Box>
        )}
      </Box>

      {currentResponse ? (
        <Box>
          {/* Workflow Status Header */}
          <Paper 
            sx={{ 
              p: 3, 
              mb: 3, 
              borderRadius: 3,
              background: currentResponse.status === 'completed' 
                ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                : currentResponse.status === 'error'
                ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid',
              borderColor: currentResponse.status === 'completed' 
                ? 'success.light'
                : currentResponse.status === 'error'
                ? 'error.light'
                : 'info.light',
              boxShadow: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: currentResponse.status === 'completed' 
                  ? 'success.main'
                  : currentResponse.status === 'error'
                  ? 'error.main'
                  : 'info.main',
                color: 'white'
              }}>
                {getStatusIcon(currentResponse.status)}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {currentResponse.status.charAt(0).toUpperCase() + currentResponse.status.slice(1)}
                </Typography>
                <Chip
                  label={currentResponse.status.toUpperCase()}
                  color={getStatusColor(currentResponse.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                />
              </Box>
            </Box>
            
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                fontFamily: 'monospace',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                bgcolor: 'white',
                p: 1,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}
              title={currentResponse.workflow_id}
            >
              ID: {currentResponse.workflow_id}
            </Typography>
            
            {polling && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
                    Auto-refreshing every 3 seconds
                  </Typography>
                </Box>
                <LinearProgress variant="indeterminate" sx={{ borderRadius: 1, height: 6 }} />
              </Box>
            )}

            {lastPollTime && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, fontStyle: 'italic' }}>
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
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {currentResponse.error}
              </Typography>
            </Alert>
          )}

          {/* Progress Information */}
          {currentResponse.result && (
            <Paper 
              sx={{ 
                p: 3, 
                mb: 3, 
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 1
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                Progress Overview
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                <Chip 
                  icon={<ViewIcon />} 
                  label={`${currentResponse.result.messages?.length || 0} Messages`} 
                  variant="filled" 
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
                {currentResponse.result.total_events && (
                  <Chip 
                    label={`${currentResponse.result.total_events} Events`} 
                    variant="filled" 
                    color="secondary"
                    sx={{ fontWeight: 600 }}
                  />
                )}
                {currentResponse.result.stop_reason && currentResponse.status === 'completed' && (
                  <Chip 
                    label={currentResponse.result.stop_reason} 
                    variant="filled" 
                    color="success"
                    sx={{ fontWeight: 600 }}
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
                  if (message.source === 'unknown' && typeof message.content === 'string' && message.content.includes('messages=[')) {
                    return null;
                  }

                  return (
                    <Accordion 
                      key={index} 
                      sx={{ 
                        borderRadius: 2, 
                        '&:before': { display: 'none' },
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 1
                        }
                      }}
                    >
                      <AccordionSummary 
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ 
                          borderRadius: 2,
                          '& .MuiAccordionSummary-content': { 
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            my: 1.5
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', mb: 1 }}>
                          {getMessageIcon(message.source)}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              wordBreak: 'break-word',
                              color: message.source === 'user' ? 'primary.main' : 'text.primary'
                            }}
                            title={message.source === 'user' ? 'User Input' : 
                                   message.source === 'system' ? 'System' :
                                   `Agent: ${message.source}`}
                          >
                            {message.source === 'user' ? 'User Input' : 
                             message.source === 'system' ? 'System' :
                             message.source.length > 30 ? `Agent: ${message.source.substring(0, 30)}...` : `Agent: ${message.source}`}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ width: '100%', gap: 0.5 }}>
                          <Chip
                            label={message.type || 'TextMessage'}
                            size="small"
                            variant="filled"
                            color="primary"
                            sx={{ 
                              fontWeight: 500,
                              fontSize: '0.7rem',
                              height: 24
                            }}
                          />
                          {message.models_usage && (
                            <Chip
                              label={`${message.models_usage.prompt_tokens || 0}→${message.models_usage.completion_tokens || 0}`}
                              size="small"
                              variant="outlined"
                              color="secondary"
                              sx={{ 
                                fontWeight: 500,
                                fontSize: '0.7rem',
                                height: 24
                              }}
                            />
                          )}
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 2, pb: 2 }}>
                        <Divider sx={{ mb: 2 }} />
                        <Box 
                          sx={{ 
                            p: 2, 
                            bgcolor: 'grey.50', 
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200'
                          }}
                        >
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, wordBreak: 'break-word', fontFamily: 'system-ui' }}>
                            {typeof message.content === 'string' 
                              ? message.content 
                              : JSON.stringify(message.content, null, 2)
                            }
                          </Typography>
                        </Box>
                        {message.models_usage && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                              Token Usage
                            </Typography>
                            <Stack direction="row" spacing={2} flexWrap="wrap">
                              <Typography variant="caption" color="text.secondary">
                                <strong>Prompt:</strong> {message.models_usage.prompt_tokens || 0}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                <strong>Completion:</strong> {message.models_usage.completion_tokens || 0}
                              </Typography>
                              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                                <strong>Total:</strong> {(message.models_usage.prompt_tokens || 0) + (message.models_usage.completion_tokens || 0)}
                              </Typography>
                            </Stack>
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