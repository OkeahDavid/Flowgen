export interface AgentConfig {
  id: string;
  name: string;
  type: 'web_search' | 'document_search' | 'summarizer';
  system_message: string;
  position?: { x: number; y: number };
}

export interface Connection {
  source_id: string;
  target_id: string;
  condition?: string;
}

export interface WorkflowRequest {
  agents: AgentConfig[];
  connections: Connection[];
  task: string;
}

export interface WorkflowResponse {
  workflow_id: string;
  status: 'running' | 'completed' | 'error';
  result?: {
    messages: Array<{
      source: string;
      content: string;
      type: string;
      models_usage?: Record<string, unknown>;
    }>;
    stop_reason: string;
  };
  error?: string;
}

export interface AgentType {
  name: string;
  system_message: string;
}