import { Box, Typography, Paper } from '@mui/material';

const AgentPalette = () => {
  return (
    <Paper sx={{ height: '100%', p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Agent Palette
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
          Web Search Agent
        </Box>
        <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
          Document Search Agent
        </Box>
        <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
          Summarizer Agent
        </Box>
      </Box>
    </Paper>
  );
};

export default AgentPalette;