import type { WorkflowRequest, AgentConfig } from '../typesTemp';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEMO_TOKEN = import.meta.env.VITE_DEMO_TOKEN || '';

// Agent type configuration from backend
export interface AgentTypeConfig {
  name: string;
  system_message: string;
}

export interface AgentTypesResponse {
  [key: string]: AgentTypeConfig;
}

// Get available agent types and their default configurations
export const getAgentTypes = async (): Promise<AgentTypesResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/agent-types`, {
      headers: {
        ...(DEMO_TOKEN && { 'Authorization': DEMO_TOKEN }),
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch {
    // Fallback data if backend is not available
    return {
      web_search: {
        name: "Web Search Agent",
        system_message: "You are a web search agent. Search for information on the web related to the given query and provide comprehensive results with sources."
      },
      document_search: {
        name: "Document Search Agent", 
        system_message: "You are a document search agent. Search through documents and extract relevant information based on the query. Provide detailed summaries of findings."
      },
      summarizer: {
        name: "Summarizer Agent",
        system_message: "You are a summarizer agent. Take the provided information and create concise, well-structured summaries that capture the key points."
      }
    };
  }
};

// Create a new agent with default configuration from backend
export const createAgentFromType = async (type: string, position?: { x: number; y: number }): Promise<AgentConfig> => {
  const agentTypes = await getAgentTypes();
  const typeConfig = agentTypes[type];
  
  if (!typeConfig) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  
  const newAgent = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: typeConfig.name,
    type: type,
    system_message: typeConfig.system_message,
    position: position || { x: 100, y: 100 },
    config: {}
  };
  
  return newAgent;
};

// Workflow API functions
export const createWorkflow = async (request: WorkflowRequest) => {
  const response = await fetch(`${API_BASE_URL}/workflow/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(DEMO_TOKEN && { 'Authorization': DEMO_TOKEN }),
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `HTTP error ${response.status}`);
  }
  
  return await response.json();
};

export const getWorkflowStatus = async (workflowId: string) => {
  const response = await fetch(`${API_BASE_URL}/workflow/${workflowId}`);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `HTTP error ${response.status}`);
  }
  return await response.json();
};

export const listWorkflows = async () => {
  const response = await fetch(`${API_BASE_URL}/workflows`);
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }
  return await response.json();
};

export const deleteWorkflow = async (workflowId: string) => {
  const response = await fetch(`${API_BASE_URL}/workflow/${workflowId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

// SSE streaming types
export interface StreamEvent {
  type: string;
  workflow_id?: string;
  executor_id?: string;
  message?: string;
  content?: string;
  chunk?: string;
  source?: string;
  error?: string;
  iteration?: number;
  result?: {
    messages: Array<{ source: string; content: string }>;
    total_events: number;
    stop_reason: string;
  };
  data?: string;
}

export type StreamEventHandler = (event: StreamEvent) => void;

/**
 * Stream a workflow execution via SSE.
 * Returns an AbortController so the caller can cancel.
 */
export const streamWorkflow = (
  request: WorkflowRequest,
  onEvent: StreamEventHandler,
  onError: (error: Error) => void,
  onDone: () => void,
): AbortController => {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/workflow/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(DEMO_TOKEN && { 'Authorization': DEMO_TOKEN }),
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(trimmed.slice(6));
              onEvent(event);
            } catch {
              // skip malformed JSON
            }
          }
        }
      }

      onDone();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError(err as Error);
      }
    }
  })();

  return controller;
};