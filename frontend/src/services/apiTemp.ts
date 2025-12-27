import type { WorkflowRequest, AgentConfig } from '../typesTemp';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEMO_TOKEN = import.meta.env.VITE_DEMO_TOKEN || '';

// Debug logging
console.log('[apiTemp] API_BASE_URL:', API_BASE_URL);
console.log('[apiTemp] DEMO_TOKEN present:', !!DEMO_TOKEN);

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
  } catch (error) {
    console.error('Error fetching agent types:', error);
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
  console.log('Creating agent of type:', type);
  const agentTypes = await getAgentTypes();
  console.log('Fetched agent types:', agentTypes);
  const typeConfig = agentTypes[type];
  console.log('Type config for', type, ':', typeConfig);
  
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
  
  console.log('Created agent:', newAgent);
  return newAgent;
};

// Workflow API functions
export const createWorkflow = async (request: WorkflowRequest) => {
  try {
    const response = await fetch(`${API_BASE_URL}/workflow/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(DEMO_TOKEN && { 'Authorization': DEMO_TOKEN }),
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating workflow:', error);
    // Fallback for development
    return { workflow_id: 'temp', status: 'running' as const };
  }
};

export const getWorkflowStatus = async (workflowId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/workflow/${workflowId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting workflow status:', error);
    return { workflow_id: workflowId, status: 'completed' as const };
  }
};

export const listWorkflows = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/workflows`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error listing workflows:', error);
    return [];
  }
};

export const deleteWorkflow = async (workflowId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/workflow/${workflowId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting workflow:', error);
    throw error;
  }
};