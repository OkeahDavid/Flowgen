import { Box, Typography, Paper } from '@mui/material';
import type { WorkflowResponse } from '../typesTemp';

interface WorkflowResultsProps {
  response: WorkflowResponse | null;
}

const WorkflowResults = ({ response }: WorkflowResultsProps) => {
  return (
    <Box sx={{ height: '100%', p: 3, bgcolor: 'background.default' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, borderBottom: 1, borderColor: 'divider', pb: 2, mb: 3 }}>
        Workflow Results
      </Typography>
      {response ? (
        <Box>
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Workflow ID
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {response.workflow_id}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, bgcolor: response.status === 'running' ? 'info.light' : 'success.light' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Status
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                fontWeight: 600,
                color: response.status === 'running' ? 'info.dark' : 'success.dark',
                textTransform: 'uppercase'
              }}
            >
              {response.status}
            </Typography>
          </Paper>
          {response.status === 'running' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
              Your workflow is being executed...
            </Typography>
          )}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No active workflow
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Execute a workflow to see results and progress here
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default WorkflowResults;