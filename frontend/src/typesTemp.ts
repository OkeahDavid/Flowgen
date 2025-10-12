export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  system_message: string;
  position?: { x: number; y: number };
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