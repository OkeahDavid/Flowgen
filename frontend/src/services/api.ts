import axios from 'axios';
import type { WorkflowRequest, WorkflowResponse, AgentType } from '../types';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const createWorkflow = async (request: WorkflowRequest): Promise<WorkflowResponse> => {
  const response = await api.post<WorkflowResponse>('/workflow/create', request);
  return response.data;
};

export const getWorkflowStatus = async (workflowId: string): Promise<WorkflowResponse> => {
  const response = await api.get<WorkflowResponse>(`/workflow/${workflowId}`);
  return response.data;
};

export const listWorkflows = async () => {
  const response = await api.get('/workflows');
  return response.data;
};

export const deleteWorkflow = async (workflowId: string) => {
  const response = await api.delete(`/workflow/${workflowId}`);
  return response.data;
};

export const getAgentTypes = async (): Promise<Record<string, AgentType>> => {
  const response = await api.get<Record<string, AgentType>>('/agent-types');
  return response.data;
};

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const deleteDocument = async (filename: string) => {
  const response = await api.delete(`/documents/${encodeURIComponent(filename)}`);
  return response.data;
};