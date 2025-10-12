
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  AutoAwesome as MagicIcon,
  Speed as SpeedIcon,
  Psychology as BrainIcon,
  Search as SearchIcon,
  Description as DocumentIcon,
  Summarize as SummaryIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';

interface HomepageProps {
  onGetStarted: () => void;
}

const Homepage = ({ onGetStarted }: HomepageProps) => {
  const theme = useTheme();

  const features = [
    {
      icon: <MagicIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Drag & Drop Workflow',
      description: 'Build complex AI workflows with an intuitive visual interface',
    },
    {
      icon: <BrainIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'AutoGen Powered',
      description: 'Leverage Microsoft\'s AutoGen framework with GraphFlow orchestration',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Real-time Execution',
      description: 'Watch your AI agents work together and see results instantly',
    },
  ];

  const agentTypes = [
    {
      icon: <SearchIcon sx={{ fontSize: 32 }} />,
      name: 'Web Search Agent',
      description: 'Searches the web for current information and data',
      color: '#2196f3',
    },
    {
      icon: <DocumentIcon sx={{ fontSize: 32 }} />,
      name: 'Document Search Agent',
      description: 'Analyzes and extracts information from documents',
      color: '#ff9800',
    },
    {
      icon: <SummaryIcon sx={{ fontSize: 32 }} />,
      name: 'Summarizer Agent',
      description: 'Creates concise summaries from multiple sources',
      color: '#4caf50',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', width: '100%' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '4rem' },
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
              }}
            >
              Flowgen
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: '1.5rem', md: '2rem' },
                fontWeight: 400,
                color: 'text.secondary',
                mb: 3,
                maxWidth: '800px',
                mx: 'auto',
              }}
            >
              AI Agent Workflow Builder
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '1.1rem', md: '1.3rem' },
                fontWeight: 300,
                color: 'text.secondary',
                mb: 4,
                maxWidth: '600px',
                mx: 'auto',
              }}
            >
              Build, orchestrate, and execute complex AI agent workflows with an intuitive drag-and-drop interface powered by AutoGen GraphFlow
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={onGetStarted}
              startIcon={<PlayIcon />}
              endIcon={<ArrowIcon />}
              sx={{
                py: 2,
                px: 4,
                fontSize: '1.2rem',
                borderRadius: 3,
                textTransform: 'none',
                boxShadow: theme.shadows[8],
                '&:hover': {
                  boxShadow: theme.shadows[12],
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Get Started
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h3"
          textAlign="center"
          gutterBottom
          sx={{ mb: 6, fontWeight: 600 }}
        >
          Why Choose Flowgen?
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 8, justifyContent: 'center' }}>
          {features.map((feature, index) => (
            <Card
              key={index}
              sx={{
                flex: { xs: '1 1 100%', md: '1 1 300px' },
                maxWidth: 400,
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Agent Types Section */}
        <Typography
          variant="h3"
          textAlign="center"
          gutterBottom
          sx={{ mb: 6, fontWeight: 600 }}
        >
          Available AI Agents
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 8, justifyContent: 'center' }}>
          {agentTypes.map((agent, index) => (
            <Paper
              key={index}
              sx={{
                p: 3,
                flex: { xs: '1 1 100%', md: '1 1 300px' },
                maxWidth: 400,
                borderRadius: 3,
                transition: 'all 0.3s ease',
                border: `2px solid ${alpha(agent.color, 0.2)}`,
                '&:hover': {
                  borderColor: agent.color,
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 32px ${alpha(agent.color, 0.3)}`,
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2,
                  color: agent.color,
                }}
              >
                {agent.icon}
                <Typography
                  variant="h6"
                  sx={{ ml: 1, fontWeight: 600, color: 'text.primary' }}
                >
                  {agent.name}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {agent.description}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* CTA Section */}
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            borderRadius: 4,
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Ready to Build Your First Workflow?
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: '600px', mx: 'auto' }}
          >
            Start creating powerful AI agent workflows in minutes. Drag, drop, connect, and execute - it's that simple!
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Chip label="No Coding Required" variant="outlined" />
            <Chip label="Visual Interface" variant="outlined" />
            <Chip label="Real-time Results" variant="outlined" />
            <Chip label="AutoGen Powered" variant="outlined" />
          </Box>
          <Button
            variant="contained"
            size="large"
            onClick={onGetStarted}
            sx={{
              mt: 4,
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              borderRadius: 3,
              textTransform: 'none',
            }}
          >
            Launch Workflow Builder
          </Button>
        </Paper>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          bgcolor: 'grey.50',
          py: 4,
          mt: 8,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
          >
            © 2025 Flowgen - AI Agent Workflow Builder. Powered by AutoGen GraphFlow.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Homepage;