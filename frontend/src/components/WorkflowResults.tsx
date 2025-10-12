import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

import type { WorkflowResponse } from '../types';

interface WorkflowResultsProps {
  response: WorkflowResponse | null;
}

const WorkflowResults: React.FC<WorkflowResultsProps> = ({ response }) => {
  if (!response) {
    return (
      <Paper sx={{ height: '100%', p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Workflow Results
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Execute a workflow to see results here
        </Typography>
      </Paper>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <ScheduleIcon color="info" />;
      case 'completed':
        return <CheckIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <ScheduleIcon />;
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

  return (
    <Paper sx={{ height: '100%', p: 2, overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Workflow Results
        </Typography>
        {getStatusIcon(response.status)}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Chip
          label={response.status.toUpperCase()}
          color={getStatusColor(response.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
          variant="outlined"
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          ID: {response.workflow_id}
        </Typography>
      </Box>

      {response.status === 'running' && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="body2">
            Workflow is running...
          </Typography>
        </Box>
      )}

      {response.status === 'error' && response.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {response.error}
        </Alert>
      )}

      {response.result && response.result.messages && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Messages ({response.result.messages.length})
          </Typography>
          
          <List sx={{ p: 0 }}>
            {response.result.messages.map((message, index) => (
              <Accordion key={index} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', mr: 1 }}>
                      {message.source}
                    </Typography>
                    <Chip
                      label={message.type}
                      size="small"
                      variant="outlined"
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                  {message.models_usage && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Token usage: {JSON.stringify(message.models_usage, null, 2)}
                      </Typography>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </List>

          {response.result.stop_reason && (
            <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Stop reason: {response.result.stop_reason}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default WorkflowResults;