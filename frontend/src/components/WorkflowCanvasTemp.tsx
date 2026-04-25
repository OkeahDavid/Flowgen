import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  Description as DocumentIcon,
  Summarize as SummaryIcon,
  Edit as WriterIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { DndContext, useDraggable, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { AgentConfig, Connection } from '../typesTemp';

const DELETE_ZONE_HEIGHT = 64;

const getAgentIcon = (type: string) => {
  switch (type) {
    case 'web_search': return <SearchIcon sx={{ fontSize: 20 }} />;
    case 'document_search': return <DocumentIcon sx={{ fontSize: 20 }} />;
    case 'summarizer': return <SummaryIcon sx={{ fontSize: 20 }} />;
    case 'creative_writer': return <WriterIcon sx={{ fontSize: 20 }} />;
    default: return <SearchIcon sx={{ fontSize: 20 }} />;
  }
};

const getAgentColor = (type: string) => {
  switch (type) {
    case 'web_search': return '#2d4a7a';
    case 'document_search': return '#c45d3e';
    case 'summarizer': return '#2e7d4f';
    case 'creative_writer': return '#7b5ea7';
    default: return '#2d4a7a';
  }
};

const getAgentLabel = (type: string) => {
  switch (type) {
    case 'web_search': return 'Web Search';
    case 'document_search': return 'Document Search';
    case 'summarizer': return 'Summarizer';
    case 'creative_writer': return 'Creative Writer';
    default: return 'Agent';
  }
};

interface WorkflowCanvasProps {
  agents: AgentConfig[];
  connections: Connection[];
  onAddConnection: (sourceId: string, targetId: string) => void;
  onRemoveConnection: (sourceId: string, targetId: string) => void;
  onRemoveAgent: (agentId: string) => void;
  onUpdateAgent: (agentId: string, updates: Partial<AgentConfig>) => void;
  onDropAgent?: (agentType: string, position: { x: number; y: number }) => void;
}

interface AgentNodeProps {
  agent: AgentConfig;
  onStartConnection: (sourceId: string) => void;
  onCompleteConnection: (targetId: string) => void;
  onCancelConnection: () => void;
  connectingFrom: string | null;
  nodeRef?: (id: string, el: HTMLElement | null) => void;
  onDragConnectStart?: (sourceId: string, startX: number, startY: number) => void;
}

const AgentNode: React.FC<AgentNodeProps> = ({ 
  agent,
  onStartConnection, onCompleteConnection, onCancelConnection,
  connectingFrom,
  nodeRef,
  onDragConnectStart,
}) => {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: agent.id,
    data: { type: 'agent' },
  });

  const combinedRef = React.useCallback((el: HTMLElement | null) => {
    setDragRef(el);
    nodeRef?.(agent.id, el);
  }, [setDragRef, nodeRef, agent.id]);

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const agentColor = getAgentColor(agent.type);

  return (
    <Box
      ref={combinedRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (connectingFrom && connectingFrom !== agent.id) onCompleteConnection(agent.id);
        else if (!connectingFrom) onStartConnection(agent.id);
        else if (connectingFrom === agent.id) onCancelConnection();
      }}
      sx={{
        position: 'absolute',
        left: agent.position?.x || 100,
        top: agent.position?.y || 100,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: '#ffffff',
        border: '1.5px solid',
        borderColor: alpha(agentColor, 0.18),
        borderRadius: '40px',
        px: 1.5,
        py: 0.8,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.4 : 1,
        userSelect: 'none',
        boxShadow: `0 1px 4px ${alpha(agentColor, 0.08)}`,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.15s ease',
        '&:hover': {
          boxShadow: `0 4px 16px ${alpha(agentColor, 0.14)}`,
          borderColor: alpha(agentColor, 0.35),
        },
        zIndex: isDragging ? 1000 : 2,
      }}
    >
      {/* Icon */}
      <Box sx={{
        width: 32, height: 32, borderRadius: '50%',
        bgcolor: alpha(agentColor, 0.08),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: agentColor, flexShrink: 0,
      }}>
        {getAgentIcon(agent.type)}
      </Box>

      {/* Label */}
      <Typography sx={{
        fontSize: '0.8rem', fontWeight: 600, color: '#1a2b4a',
        whiteSpace: 'nowrap', lineHeight: 1.2,
      }}>
        {getAgentLabel(agent.type)}
      </Typography>

      {/* Output handle (right) */}
      <button
        onClick={(e) => {
          e.preventDefault(); e.stopPropagation();
          if (connectingFrom === agent.id) onCancelConnection();
          else if (connectingFrom) onCompleteConnection(agent.id);
          else onStartConnection(agent.id);
        }}
        onPointerDown={(e) => {
          e.stopPropagation(); e.preventDefault();
          onDragConnectStart?.(agent.id, e.clientX, e.clientY);
        }}
        style={{
          position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          backgroundColor: connectingFrom === agent.id ? agentColor : '#ffffff',
          border: `2px solid ${connectingFrom === agent.id ? agentColor : alpha(agentColor, 0.35)}`,
          cursor: 'pointer', zIndex: 100, outline: 'none',
          boxShadow: connectingFrom === agent.id ? `0 0 6px ${alpha(agentColor, 0.4)}` : '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '7px', fontWeight: 'bold',
          color: connectingFrom === agent.id ? '#ffffff' : agentColor,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-50%) scale(1.3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(-50%)'; }}
        title={connectingFrom === agent.id ? 'Cancel' : 'Drag to connect'}
      >
        {connectingFrom === agent.id ? '×' : '→'}
      </button>

      {/* Input handle (left) */}
      <button
        onClick={(e) => {
          e.preventDefault(); e.stopPropagation();
          if (connectingFrom && connectingFrom !== agent.id) onCompleteConnection(agent.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)',
          width: connectingFrom && connectingFrom !== agent.id ? 16 : 12,
          height: connectingFrom && connectingFrom !== agent.id ? 16 : 12,
          borderRadius: '50%',
          backgroundColor: connectingFrom && connectingFrom !== agent.id ? '#2e7d4f' : '#ffffff',
          border: `2px solid ${connectingFrom && connectingFrom !== agent.id ? '#2e7d4f' : 'rgba(0,0,0,0.1)'}`,
          cursor: connectingFrom && connectingFrom !== agent.id ? 'pointer' : 'default',
          opacity: connectingFrom && connectingFrom !== agent.id ? 1 : 0.4,
          zIndex: 100, outline: 'none',
          boxShadow: connectingFrom && connectingFrom !== agent.id ? '0 0 8px rgba(46,125,79,0.4)' : 'none',
          animation: connectingFrom && connectingFrom !== agent.id ? 'pulse 0.8s infinite' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '6px', fontWeight: 'bold',
          color: connectingFrom && connectingFrom !== agent.id ? '#ffffff' : '#bbb',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => { if (connectingFrom && connectingFrom !== agent.id) e.currentTarget.style.transform = 'translateY(-50%) scale(1.3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(-50%)'; }}
        title={connectingFrom && connectingFrom !== agent.id ? 'Connect here' : 'Input'}
      >
        {connectingFrom && connectingFrom !== agent.id ? '✓' : '●'}
      </button>
    </Box>
  );
};

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ 
  agents, connections, onAddConnection, onRemoveConnection,
  onRemoveAgent, onUpdateAgent, onDropAgent,
}) => {
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [isDraggingAgent, setIsDraggingAgent] = useState(false);
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false);
  const [dragLine, setDragLine] = useState<{ sourceId: string; mx: number; my: number } | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const draggingIdRef = React.useRef<string | null>(null);
  const nodeElsRef = React.useRef<Map<string, HTMLElement>>(new Map());

  const handleNodeRef = React.useCallback((id: string, el: HTMLElement | null) => {
    if (el) nodeElsRef.current.set(id, el);
    else nodeElsRef.current.delete(id);
  }, []);

  const getNodeWidth = (agentId: string): number => {
    const el = nodeElsRef.current.get(agentId);
    return el ? el.offsetWidth : 160;
  };

  const getNodeHeight = (agentId: string): number => {
    const el = nodeElsRef.current.get(agentId);
    return el ? el.offsetHeight : 48;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleNativeDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/flowgen-agent')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleNativeDrop = (e: React.DragEvent) => {
    const agentType = e.dataTransfer.getData('application/flowgen-agent');
    if (agentType && onDropAgent && canvasRef.current) {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      onDropAgent(agentType, {
        x: Math.max(0, e.clientX - rect.left - 100),
        y: Math.max(0, e.clientY - rect.top - 25),
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    draggingIdRef.current = event.active.id as string;
    setIsDraggingAgent(true);
    setIsOverDeleteZone(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const agentId = active.id as string;

    // Check if dropped in delete zone
    if (canvasRef.current && delta) {
      const agent = agents.find(a => a.id === agentId);
      if (agent && agent.position) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const finalY = agent.position.y + delta.y;
        if (finalY > canvasRect.height - DELETE_ZONE_HEIGHT - 20) {
          onRemoveAgent(agentId);
          setIsDraggingAgent(false);
          setIsOverDeleteZone(false);
          draggingIdRef.current = null;
          return;
        }
      }
    }

    if (active && delta) {
      const agent = agents.find(a => a.id === agentId);
      if (agent && agent.position) {
        onUpdateAgent(agentId, {
          position: {
            x: Math.max(0, agent.position.x + delta.x),
            y: Math.max(0, agent.position.y + delta.y),
          },
        });
      }
    }

    setIsDraggingAgent(false);
    setIsOverDeleteZone(false);
    draggingIdRef.current = null;
  };

  // Track mouse during dnd-kit drag to detect delete zone hover
  React.useEffect(() => {
    if (!isDraggingAgent) return;
    const handlePointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      setIsOverDeleteZone(relY > rect.height - DELETE_ZONE_HEIGHT - 10);
    };
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [isDraggingAgent]);

  // Drag-to-connect: start from output handle, draw rubber band, release on target
  const handleDragConnectStart = React.useCallback((sourceId: string, _startX: number, _startY: number) => {
    setConnectingFrom(sourceId);
    // Initial mouse position doesn't matter — pointermove updates it immediately
    setDragLine({ sourceId, mx: _startX, my: _startY });
  }, []);

  React.useEffect(() => {
    if (!dragLine) return;

    const handleMove = (e: PointerEvent) => {
      setDragLine(prev => prev ? { ...prev, mx: e.clientX, my: e.clientY } : null);
    };

    const handleUp = (e: PointerEvent) => {
      if (!canvasRef.current) { cleanup(); return; }

      // Hit-test: find if pointer is over any other agent node
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      let targetId: string | null = null;
      for (const agent of agents) {
        if (agent.id === dragLine.sourceId) continue;
        const el = nodeElsRef.current.get(agent.id);
        if (!el) continue;
        const ax = agent.position?.x || 100;
        const ay = agent.position?.y || 100;
        const aw = el.offsetWidth;
        const ah = el.offsetHeight;
        // Generous hit area (30px padding around node)
        if (canvasX >= ax - 30 && canvasX <= ax + aw + 30 && canvasY >= ay - 15 && canvasY <= ay + ah + 15) {
          targetId = agent.id;
          break;
        }
      }

      if (targetId) {
        onAddConnection(dragLine.sourceId, targetId);
      }

      cleanup();
    };

    const cleanup = () => {
      setDragLine(null);
      setConnectingFrom(null);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragLine?.sourceId]);  // Only re-attach on new drag start



  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box
        ref={canvasRef}
        onClick={() => setConnectingFrom(null)}
        onDragOver={handleNativeDragOver}
        onDrop={handleNativeDrop}
        sx={{
          height: '100%', width: '100%', position: 'relative',
          bgcolor: connectingFrom ? alpha('#c45d3e', 0.03) : '#faf8f5',
          backgroundImage: 'radial-gradient(circle, rgba(26,43,74,0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          transition: 'background-color 0.2s ease',
          overflow: 'hidden',
          cursor: connectingFrom ? 'crosshair' : 'default',
          '@keyframes pulse': {
            '0%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.15)' },
            '100%': { transform: 'scale(1)' },
          },
        }}
      >
        {agents.length === 0 ? (
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <Typography variant="h4" sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 400, color: 'rgba(26,43,74,0.2)', mb: 1.5 }}>
              Workflow Canvas
            </Typography>
            <Typography variant="body2" sx={{ color: '#5a6578', maxWidth: 360 }}>
              Drag agents from the palette or click them to add to your workflow
            </Typography>
          </Box>
        ) : (
          <>
            {agents.map((agent) => (
              <AgentNode
                key={agent.id}
                agent={agent}
                onStartConnection={(id) => setConnectingFrom(id)}
                onCompleteConnection={(targetId) => {
                  if (connectingFrom && connectingFrom !== targetId) {
                    onAddConnection(connectingFrom, targetId);
                    setConnectingFrom(null);
                  }
                }}
                onCancelConnection={() => setConnectingFrom(null)}
                connectingFrom={connectingFrom}
                nodeRef={handleNodeRef}
                onDragConnectStart={handleDragConnectStart}
              />
            ))}

            {/* Connection SVGs */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
              {connections.map((conn, i) => {
                const src = agents.find(a => a.id === conn.source_id);
                const tgt = agents.find(a => a.id === conn.target_id);
                if (!src || !tgt) return null;

                const srcW = getNodeWidth(src.id);
                const srcH = getNodeHeight(src.id);
                const tgtH = getNodeHeight(tgt.id);
                const sx = (src.position?.x || 100) + srcW;
                const sy = (src.position?.y || 100) + srcH / 2;
                const tx = tgt.position?.x || 100;
                const ty = (tgt.position?.y || 100) + tgtH / 2;
                const dx = tx - sx;
                const cpOffset = Math.min(Math.abs(dx) * 0.4, 80);
                const path = `M ${sx} ${sy} C ${sx + cpOffset} ${sy}, ${tx - cpOffset} ${ty}, ${tx} ${ty}`;

                return (
                  <g key={i}>
                    <path d={path} stroke="rgba(26,43,74,0.08)" strokeWidth="5" fill="none" />
                    <path d={path} stroke="url(#connGrad)" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
                    <circle r="2.5" fill="#fff" stroke="#1a2b4a" strokeWidth="1">
                      <animateMotion dur="3s" repeatCount="indefinite" path={path} />
                    </circle>
                  </g>
                );
              })}
              {/* Drag-to-connect rubber band line */}
              {dragLine && (() => {
                const src = agents.find(a => a.id === dragLine.sourceId);
                if (!src || !canvasRef.current) return null;
                const srcW = getNodeWidth(src.id);
                const srcH = getNodeHeight(src.id);
                const lsx = (src.position?.x || 100) + srcW;
                const lsy = (src.position?.y || 100) + srcH / 2;
                const cRect = canvasRef.current.getBoundingClientRect();
                const lmx = dragLine.mx - cRect.left;
                const lmy = dragLine.my - cRect.top;
                const ldx = lmx - lsx;
                const cpOff = Math.min(Math.abs(ldx) * 0.4, 80);
                const tempPath = `M ${lsx} ${lsy} C ${lsx + cpOff} ${lsy}, ${lmx - cpOff} ${lmy}, ${lmx} ${lmy}`;
                return (
                  <path d={tempPath} stroke="#c45d3e" strokeWidth="2" strokeDasharray="6 3" fill="none" opacity="0.7" />
                );
              })()}
              <defs>
                <linearGradient id="connGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: '#2d4a7a', stopOpacity: 0.6 }} />
                  <stop offset="100%" style={{ stopColor: '#1a2b4a', stopOpacity: 0.85 }} />
                </linearGradient>
                <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <path d="M 0 0 L 8 3 L 0 6 L 2 3 Z" fill="#1a2b4a" />
                </marker>
              </defs>
            </svg>

            {/* Connection remove buttons */}
            {connections.map((conn, i) => {
              const src = agents.find(a => a.id === conn.source_id);
              const tgt = agents.find(a => a.id === conn.target_id);
              if (!src || !tgt) return null;
              const srcW = getNodeWidth(src.id);
              const srcH = getNodeHeight(src.id);
              const tgtH = getNodeHeight(tgt.id);
              const mx = ((src.position?.x || 100) + srcW + (tgt.position?.x || 100)) / 2;
              const my = ((src.position?.y || 100) + srcH / 2 + (tgt.position?.y || 100) + tgtH / 2) / 2;
              return (
                <button
                  key={`rm-${i}`}
                  onClick={(e) => { e.stopPropagation(); onRemoveConnection(conn.source_id, conn.target_id); }}
                  style={{
                    position: 'absolute', left: mx - 8, top: my - 8,
                    width: 16, height: 16, borderRadius: '50%',
                    backgroundColor: '#fff', border: '1.5px solid #d32f2f',
                    cursor: 'pointer', zIndex: 10, outline: 'none',
                    fontSize: '10px', fontWeight: 'bold', color: '#d32f2f',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#d32f2f'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#d32f2f'; e.currentTarget.style.transform = 'scale(1)'; }}
                  title="Remove connection"
                >×</button>
              );
            })}

            {/* Status overlay */}
            <Box sx={{
              position: 'absolute', top: 10, right: 10,
              bgcolor: 'rgba(255,255,255,0.9)', px: 1.5, py: 0.5,
              borderRadius: '20px', backdropFilter: 'blur(4px)',
              border: '1px solid rgba(26,43,74,0.06)',
            }}>
              <Typography variant="caption" sx={{ color: '#5a6578', fontWeight: 500, fontSize: '0.65rem' }}>
                {agents.length} agent{agents.length !== 1 ? 's' : ''} · {connections.length} connection{connections.length !== 1 ? 's' : ''}
              </Typography>
              {connectingFrom && (
                <Typography variant="caption" sx={{ display: 'block', color: '#c45d3e', fontWeight: 600, fontSize: '0.6rem', mt: 0.25 }}>
                  Connecting from {agents.find(a => a.id === connectingFrom)?.name}
                </Typography>
              )}
            </Box>
          </>
        )}

        {/* Delete zone — slides up when dragging an agent */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: DELETE_ZONE_HEIGHT,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
            bgcolor: isOverDeleteZone ? 'rgba(211, 47, 47, 0.12)' : 'rgba(211, 47, 47, 0.04)',
            borderTop: `2px dashed ${isOverDeleteZone ? '#d32f2f' : 'rgba(211, 47, 47, 0.25)'}`,
            transform: isDraggingAgent ? 'translateY(0)' : `translateY(${DELETE_ZONE_HEIGHT + 2}px)`,
            transition: 'transform 0.25s ease, background-color 0.15s ease, border-color 0.15s ease',
            pointerEvents: 'none',
            zIndex: 999,
          }}
        >
          <DeleteIcon sx={{ 
            color: isOverDeleteZone ? '#d32f2f' : 'rgba(211, 47, 47, 0.45)',
            fontSize: 22,
            transition: 'color 0.15s ease, transform 0.15s ease',
            transform: isOverDeleteZone ? 'scale(1.2)' : 'scale(1)',
          }} />
          <Typography sx={{
            color: isOverDeleteZone ? '#d32f2f' : 'rgba(211, 47, 47, 0.5)',
            fontSize: '0.8rem', fontWeight: 600,
            transition: 'color 0.15s ease',
          }}>
            {isOverDeleteZone ? 'Release to remove' : 'Drag here to remove'}
          </Typography>
        </Box>
      </Box>
    </DndContext>
  );
};

export default WorkflowCanvas;
