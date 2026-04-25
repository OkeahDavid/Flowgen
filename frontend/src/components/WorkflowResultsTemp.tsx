import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Stack,
  Alert,
  Fade,
  Collapse,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  SmartToy as BotIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import type { StreamEvent } from '../services/apiTemp';

// ── Types ───────────────────────────────────────────────────────────────────

export interface WorkflowStep {
  id: string;
  type: 'agent_started' | 'agent_completed' | 'agent_data' | 'output' | 'system' | 'error';
  agentId?: string;
  content?: string;
  timestamp: Date;
}

interface WorkflowResultsProps {
  steps: WorkflowStep[];
  streamEvents: StreamEvent[];
  status: 'idle' | 'running' | 'completed' | 'failed' | 'error';
  error?: string;
  workflowId?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

const WorkflowResults = ({ steps, status, error, workflowId }: WorkflowResultsProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps.length]);

  const isRunning = status === 'running';
  const isDone = status === 'completed';
  const isFailed = status === 'failed' || status === 'error';

  const agentSections = buildAgentSections(steps);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#faf8f5' }}>
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: '#c45d3e', fontSize: '0.6rem', letterSpacing: '0.12em', mb: 0.3 }}
        >
          OUTPUT
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontWeight: 600,
              fontSize: '1rem',
              color: '#1a2b4a',
            }}
          >
            Workflow Results
          </Typography>
          {isRunning && <CircularProgress size={14} sx={{ color: '#c45d3e' }} />}
          {isDone && <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />}
          {isFailed && <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />}
        </Box>
      </Box>

      {/* Steps area */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, pb: 2 }}>
        {/* Empty state */}
        {status === 'idle' && steps.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <BotIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary">
              Run a workflow to see step-by-step results here
            </Typography>
          </Box>
        )}

        {/* Workflow ID */}
        {workflowId && (
          <Fade in>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontFamily: 'monospace',
                color: 'text.disabled',
                fontSize: '0.65rem',
                mb: 1.5,
              }}
            >
              {workflowId}
            </Typography>
          </Fade>
        )}

        {/* Agent sections — one card per agent, collapsible */}
        <Stack spacing={1.5}>
          {agentSections.map((section, idx) => (
            <Fade in key={section.agentId + idx} timeout={400}>
              <div>
                <AgentCard
                  section={section}
                  isLast={idx === agentSections.length - 1}
                  workflowDone={isDone}
                />
              </div>
            </Fade>
          ))}
        </Stack>

        {/* Error banner */}
        {isFailed && error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2, fontSize: '0.8rem' }}>
            {error}
          </Alert>
        )}

        {/* Completion banner */}
        {isDone && (
          <Alert
            severity="success"
            sx={{ mt: 2, borderRadius: 2, fontSize: '0.8rem' }}
            icon={<CheckIcon fontSize="small" />}
          >
            Workflow completed successfully
          </Alert>
        )}

        <div ref={bottomRef} />
      </Box>
    </Box>
  );
};

// ── Collapsible agent card ──────────────────────────────────────────────────

function AgentCard({
  section,
  isLast,
  workflowDone,
}: {
  section: AgentSection;
  isLast: boolean;
  workflowDone: boolean;
}) {
  // Last card starts expanded; earlier cards start collapsed once they have content and are done
  const [expanded, setExpanded] = useState(true);
  const wasActive = useRef(true);

  // Auto-collapse previous cards when they finish (content arrived + no longer active)
  useEffect(() => {
    if (wasActive.current && !section.isActive && section.content && !isLast) {
      // Agent just finished — collapse after a short delay so user sees the content briefly
      const t = setTimeout(() => setExpanded(false), 1200);
      return () => clearTimeout(t);
    }
    wasActive.current = section.isActive;
  }, [section.isActive, section.content, isLast]);

  const toggle = useCallback(() => setExpanded((p) => !p), []);

  const hasContent = !!section.content;
  const isFinal = isLast && workflowDone && hasContent;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: section.isError
          ? 'rgba(244, 67, 54, 0.3)'
          : isFinal
          ? 'rgba(76, 175, 80, 0.3)'
          : 'rgba(26, 43, 74, 0.08)',
        bgcolor: section.isError
          ? 'rgba(244, 67, 54, 0.04)'
          : isFinal
          ? 'rgba(76, 175, 80, 0.04)'
          : 'white',
        overflow: 'hidden',
      }}
    >
      {/* Clickable header */}
      <Box
        onClick={hasContent ? toggle : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          cursor: hasContent ? 'pointer' : 'default',
          bgcolor: section.isError
            ? 'rgba(244, 67, 54, 0.08)'
            : isFinal
            ? 'rgba(76, 175, 80, 0.08)'
            : 'rgba(26, 43, 74, 0.03)',
          borderBottom: expanded && hasContent ? '1px solid rgba(26, 43, 74, 0.06)' : 'none',
          '&:hover': hasContent
            ? { bgcolor: isFinal ? 'rgba(76,175,80,0.12)' : 'rgba(26,43,74,0.05)' }
            : {},
        }}
      >
        {/* Status icon */}
        {section.isError ? (
          <ErrorIcon sx={{ fontSize: 14, color: 'error.main' }} />
        ) : section.isActive ? (
          <CircularProgress size={12} sx={{ color: '#c45d3e' }} />
        ) : hasContent ? (
          <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
        ) : (
          <BotIcon sx={{ fontSize: 14, color: '#5a6578' }} />
        )}

        {/* Agent name */}
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, fontSize: '0.7rem', color: section.isError ? 'error.main' : '#1a2b4a', flex: 1 }}
        >
          {formatAgentName(section.agentId)}
        </Typography>

        {/* Status chip */}
        {section.isActive && (
          <Chip
            label="processing"
            size="small"
            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(196,93,62,0.1)', color: '#c45d3e' }}
          />
        )}
        {!section.isActive && hasContent && !isFinal && (
          <Chip
            label="done"
            size="small"
            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(76,175,80,0.1)', color: 'success.main' }}
          />
        )}
        {isFinal && (
          <Chip
            label="final output"
            size="small"
            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(76,175,80,0.15)', color: 'success.dark' }}
          />
        )}

        {/* Expand chevron */}
        {hasContent && (
          <ExpandMoreIcon
            sx={{
              fontSize: 16,
              color: 'text.disabled',
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'none',
            }}
          />
        )}
      </Box>

      {/* Content — collapsible, with real-time streaming */}
      <Collapse in={expanded && hasContent}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <StreamingContent content={section.content} sectionKey={section.agentId} isStreaming={section.isActive} />
        </Box>
      </Collapse>
    </Paper>
  );
}

// ── Streaming content — renders progressively as tokens arrive ──────────────

function StreamingContent({ content, isStreaming }: { content: string; sectionKey?: string; isStreaming?: boolean }) {
  return (
    <Box sx={mdStyles}>
      <ReactMarkdown>{content}</ReactMarkdown>
      {isStreaming && (
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            bgcolor: '#c45d3e',
            ml: 0.3,
            verticalAlign: 'text-bottom',
            animation: 'blink 1s step-end infinite',
            '@keyframes blink': { '50%': { opacity: 0 } },
          }}
        />
      )}
    </Box>
  );
}

const mdStyles = {
  lineHeight: 1.7,
  fontSize: '0.82rem',
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
  '& li': { mb: 0.3, fontSize: '0.82rem' },
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

// ── Helpers ──────────────────────────────────────────────────────────────────

interface AgentSection {
  agentId: string;
  content: string;
  isActive: boolean;
  isComplete: boolean;
  isError: boolean;
}

function buildAgentSections(steps: WorkflowStep[]): AgentSection[] {
  const sections: AgentSection[] = [];
  const sectionMap: Record<string, number> = {};

  for (const step of steps) {
    const aid = step.agentId || 'system';

    if (step.type === 'agent_started') {
      const idx = sections.length;
      sections.push({
        agentId: aid,
        content: '',
        isActive: true,
        isComplete: false,
        isError: false,
      });
      sectionMap[aid] = idx;
    } else if (step.type === 'agent_data' || step.type === 'output') {
      // Merge data/output into the agent's existing section
      const idx = sectionMap[aid];
      if (idx !== undefined && sections[idx]) {
        sections[idx].content = step.content || '';
        // If output arrived, agent is done
        if (step.type === 'output') {
          sections[idx].isActive = false;
          sections[idx].isComplete = true;
        }
      } else {
        // No section yet (shouldn't happen, but handle gracefully)
        const newIdx = sections.length;
        sections.push({
          agentId: aid,
          content: step.content || '',
          isActive: false,
          isComplete: true,
          isError: false,
        });
        sectionMap[aid] = newIdx;
      }
    } else if (step.type === 'agent_completed') {
      const idx = sectionMap[aid];
      if (idx !== undefined && sections[idx]) {
        sections[idx].isActive = false;
        sections[idx].isComplete = true;
      }
    } else if (step.type === 'error') {
      const idx = sectionMap[aid];
      if (idx !== undefined && sections[idx]) {
        sections[idx].content = step.content || '';
        sections[idx].isActive = false;
        sections[idx].isError = true;
      } else {
        sections.push({
          agentId: aid,
          content: step.content || '',
          isActive: false,
          isComplete: false,
          isError: true,
        });
      }
    }
  }

  return sections;
}

function formatAgentName(id: string): string {
  const parts = id.split('_');
  const cleaned = parts.filter((p) => !/^\d{6,}$/.test(p));
  return cleaned.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default WorkflowResults;
