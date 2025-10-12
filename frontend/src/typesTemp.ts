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

export interface WorkflowResponse {
  workflow_id: string;
  status: string;
}