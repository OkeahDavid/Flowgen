export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  system_message: string;
  position?: { x: number; y: number };
  config?: {
    // Web search config
    searchQuery?: string;
    maxResults?: number;
    
    // Document search config
    uploadedFiles?: string[];
    processingMode?: string;
    
    // Summarizer config
    summaryType?: string;
    summaryLength?: string;
    focusAreas?: string[];

    // Creative writer config
    writingStyle?: string;
    contentType?: string;
    targetAudience?: string;
  };
}

export interface Connection {
  source_id: string;
  target_id: string;
}

export interface WorkflowRequest {
  agents: AgentConfig[];
  connections: Connection[];
  task: string;
}

export interface WorkflowMessage {
  id?: string;
  source: string;
  content: string | object; // Can be string or object (e.g., tool calls)
  timestamp?: string;
  type?: 'user' | 'agent' | 'system';
  models_usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export interface WorkflowResponse {
  workflow_id: string;
  status: string;
  error?: string;
  result?: {
    messages?: WorkflowMessage[];
    execution_time?: number;
    agent_count?: number;
    stop_reason?: string;
    total_events?: number;
    [key: string]: unknown;
  };
}