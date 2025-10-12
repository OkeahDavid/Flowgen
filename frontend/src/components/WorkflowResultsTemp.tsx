import { Box, Typography, Paper } from '@mui/material';
import type { WorkflowResponse } from '../typesTemp';

interface WorkflowResultsProps {
  response: WorkflowResponse | null;
}

const WorkflowResults = ({ response }: WorkflowResultsProps) => {
  return (
    <Paper sx={{ height: '100%', p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Workflow Results
      </Typography>
      {response ? (
        <Box>
          <Typography variant="body2" gutterBottom>
            ID: {response.workflow_id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Status: {response.status}
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Execute a workflow to see results here
        </Typography>
      )}
    </Paper>
  );
};

export default WorkflowResults;