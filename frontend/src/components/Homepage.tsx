import {
  Box,
  Typography,
  Button,
  Paper,
  alpha,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Search as SearchIcon,
  Description as DocumentIcon,
  Summarize as SummaryIcon,
  Edit as WriterIcon,
  ArrowForward as ArrowIcon,
  Hub as WorkflowIcon,
  Bolt as BoltIcon,
  Layers as LayersIcon,
} from '@mui/icons-material';

interface HomepageProps {
  onGetStarted: () => void;
  onViewWorkflows?: () => void;
}

const Homepage = ({ onGetStarted, onViewWorkflows }: HomepageProps) => {
  const agentTypes = [
    {
      icon: <SearchIcon sx={{ fontSize: 28 }} />,
      name: 'Web Search',
      description: 'Real-time web intelligence with source citations',
      color: '#2d4a7a',
      tag: 'Search',
    },
    {
      icon: <DocumentIcon sx={{ fontSize: 28 }} />,
      name: 'Document Search',
      description: 'Semantic vector search across your uploaded files',
      color: '#c45d3e',
      tag: 'RAG',
    },
    {
      icon: <SummaryIcon sx={{ fontSize: 28 }} />,
      name: 'Summarizer',
      description: 'Structured summaries that capture key insights',
      color: '#2e7d4f',
      tag: 'Synthesis',
    },
    {
      icon: <WriterIcon sx={{ fontSize: 28 }} />,
      name: 'Creative Writer',
      description: 'Original content, stories, and compelling copy',
      color: '#7b5ea7',
      tag: 'Generation',
    },
  ];

  const features = [
    {
      icon: <WorkflowIcon sx={{ fontSize: 32, color: '#1a2b4a' }} />,
      title: 'Visual Graph Builder',
      description: 'Drag agents onto a canvas, draw connections, and define complex multi-step workflows without writing code.',
    },
    {
      icon: <BoltIcon sx={{ fontSize: 32, color: '#c45d3e' }} />,
      title: 'Agent Framework Powered',
      description: 'Built on Microsoft Agent Framework — typed workflows, data-flow orchestration, and production-grade reliability.',
    },
    {
      icon: <LayersIcon sx={{ fontSize: 32, color: '#2e7d4f' }} />,
      title: 'Live Execution',
      description: 'Watch agents collaborate in real-time. Stream results, track token usage, and inspect every message.',
    },
  ];

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100vh', 
      overflow: 'auto',
      bgcolor: '#faf8f5',
    }}>
      {/* Hero Section */}
      <Box sx={{ 

        py: { xs: 8, md: 10 },
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle background texture */}
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 50%, rgba(26,43,74,0.03) 0%, transparent 70%), radial-gradient(ellipse at 80% 20%, rgba(196,93,62,0.03) 0%, transparent 60%)',
        }} />
        
        {/* Decorative vertical line */}
        <Box sx={{
          position: 'absolute', left: { xs: 24, md: '8%' }, top: '15%', bottom: '15%',
          width: 1, bgcolor: 'rgba(26,43,74,0.08)',
          display: { xs: 'none', md: 'block' },
        }} />

        <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 3, sm: 5, md: '8%', lg: '10%' }, width: '100%' }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: { xs: 4, md: 8 },
          }}>
            {/* Left — Title */}
            <Box sx={{ flex: { md: '0 0 55%' }, maxWidth: { md: '55%' } }}>
              <Typography variant="subtitle2" sx={{ 
                color: '#c45d3e', mb: 2, fontSize: '0.7rem',
                letterSpacing: '0.12em',
              }}>
                AI WORKFLOW ORCHESTRATION
              </Typography>
              <Typography variant="h1" sx={{
                fontSize: { xs: '2.8rem', sm: '3.5rem', md: '4.2rem' },
                lineHeight: 1.08,
                mb: 3,
                color: '#1a2b4a',
              }}>
                Build intelligent
                <br />
                <Box component="span" sx={{ 
                  color: '#c45d3e',
                  fontStyle: 'italic',
                  fontWeight: 500,
                }}>
                  agent workflows
                </Box>
              </Typography>
              <Typography variant="body1" sx={{
                fontSize: { xs: '1rem', md: '1.1rem' },
                color: '#5a6578',
                maxWidth: 460,
                mb: 4,
                lineHeight: 1.8,
              }}>
                Connect specialized AI agents into powerful pipelines. 
                Drag, connect, execute — watch your agents collaborate 
                to solve complex tasks in real&nbsp;time.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={onGetStarted}
                  startIcon={<PlayIcon />}
                  sx={{
                    py: 1.5, px: 4,
                    fontSize: '0.95rem',
                    bgcolor: '#1a2b4a',
                    '&:hover': { bgcolor: '#2d4a7a', transform: 'translateY(-1px)' },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Start Building
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onViewWorkflows || onGetStarted}
                  endIcon={<ArrowIcon />}
                  sx={{
                    py: 1.5, px: 4,
                    fontSize: '0.95rem',
                    borderColor: 'rgba(26,43,74,0.2)',
                    color: '#1a2b4a',
                    '&:hover': { 
                      borderColor: '#1a2b4a',
                      bgcolor: 'rgba(26,43,74,0.03)',
                    },
                  }}
                >
                  View Workflows
                </Button>
              </Box>
            </Box>

            {/* Right — Agent cards stacked */}
            <Box sx={{ 
              flex: 1, 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              width: '100%',
            }}>
              {agentTypes.map((agent) => (
                <Paper
                  key={agent.name}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: '1px solid',
                    borderColor: alpha(agent.color, 0.12),
                    borderRadius: 2,
                    transition: 'all 0.25s ease',
                    cursor: 'default',
                    '&:hover': {
                      borderColor: alpha(agent.color, 0.35),
                      transform: 'translateY(-3px)',
                      boxShadow: `0 8px 24px ${alpha(agent.color, 0.1)}`,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ color: agent.color, mt: 0.25 }}>{agent.icon}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontSize: '0.9rem', color: '#1a1a1a' }}>
                          {agent.name}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: agent.color, 
                          fontSize: '0.6rem', 
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          bgcolor: alpha(agent.color, 0.06),
                          px: 1, py: 0.25,
                          borderRadius: 1,
                        }}>
                          {agent.tag}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#5a6578', lineHeight: 1.5 }}>
                        {agent.description}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: '#ffffff' }}>
        <Box sx={{ px: { xs: 3, sm: 5, md: '8%', lg: '10%' } }}>
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
            <Typography variant="subtitle2" sx={{ color: '#c45d3e', mb: 1.5 }}>
              CAPABILITIES
            </Typography>
            <Typography variant="h2" sx={{
              fontSize: { xs: '2rem', md: '2.8rem' },
              color: '#1a2b4a',
              mb: 2,
            }}>
              Everything you need
            </Typography>
            <Typography variant="body1" sx={{ color: '#5a6578', maxWidth: 520, mx: 'auto' }}>
              From visual design to live execution, Flowgen gives you complete control over your AI agent orchestration.
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 4,
          }}>
            {features.map((feature, index) => (
              <Box key={index} sx={{ 
                p: 4,
                borderTop: '2px solid',
                borderColor: index === 0 ? '#1a2b4a' : index === 1 ? '#c45d3e' : '#2e7d4f',
              }}>
                <Box sx={{ mb: 2.5 }}>{feature.icon}</Box>
                <Typography variant="h5" sx={{ fontSize: '1.15rem', mb: 1.5, color: '#1a1a1a' }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#5a6578', lineHeight: 1.7 }}>
                  {feature.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, bgcolor: '#faf8f5', borderTop: '1px solid rgba(26,43,74,0.06)' }}>
        <Box sx={{ px: { xs: 3, sm: 5, md: '8%', lg: '10%' } }}>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ fontSize: '0.8rem' }}>
            Flowgen — Powered by Microsoft Agent Framework
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Homepage;
