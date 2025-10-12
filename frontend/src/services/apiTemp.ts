import type { WorkflowRequest } from '../typesTemp';

// Temporary API service
export const createWorkflow = async (request: WorkflowRequest) => {
  console.log('Creating workflow:', request);
  return { workflow_id: 'temp', status: 'running' as const };
};

export const getWorkflowStatus = async (workflowId: string) => {
  console.log('Getting workflow status:', workflowId);
  return { workflow_id: workflowId, status: 'completed' as const };
};