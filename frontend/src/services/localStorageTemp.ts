/**
 * Local storage service for managing workflows in the browser
 */

import type { AgentConfig, Connection, WorkflowResponse } from '../typesTemp';

export interface StoredWorkflow {
  id: string;
  task: string;
  status: string;
  created_at: string;
  completed_at?: string;
  modified_at?: string;
  agents: AgentConfig[];
  connections: Connection[];
  result?: WorkflowResponse['result'];
  error?: string;
}

class WorkflowLocalStorage {
  private readonly STORAGE_KEY = 'flowgen_workflows';

  /**
   * Get all stored workflows
   */
  getAllWorkflows(): StoredWorkflow[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading workflows from localStorage:', error);
      return [];
    }
  }

  /**
   * Get a specific workflow by ID
   */
  getWorkflow(workflowId: string): StoredWorkflow | null {
    const workflows = this.getAllWorkflows();
    return workflows.find(w => w.id === workflowId) || null;
  }

  /**
   * Save a workflow to local storage
   */
  saveWorkflow(workflow: StoredWorkflow): void {
    try {
      const workflows = this.getAllWorkflows();
      const existingIndex = workflows.findIndex(w => w.id === workflow.id);
      
      if (existingIndex >= 0) {
        // Update existing workflow
        workflows[existingIndex] = { ...workflow, modified_at: new Date().toISOString() };
      } else {
        // Add new workflow
        workflows.unshift({ ...workflow, created_at: workflow.created_at || new Date().toISOString() });
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
      console.log(`Workflow ${workflow.id} saved to localStorage`);
    } catch (error) {
      console.error('Error saving workflow to localStorage:', error);
      throw error;
    }
  }

  /**
   * Update workflow status and results
   */
  updateWorkflowStatus(workflowId: string, status: string, result?: WorkflowResponse['result'], error?: string): void {
    try {
      const workflows = this.getAllWorkflows();
      const workflowIndex = workflows.findIndex(w => w.id === workflowId);
      
      if (workflowIndex >= 0) {
        const workflow = workflows[workflowIndex];
        workflow.status = status;
        workflow.modified_at = new Date().toISOString();
        
        if (status === 'completed' || status === 'failed') {
          workflow.completed_at = new Date().toISOString();
        }
        
        if (result) {
          workflow.result = result;
        }
        
        if (error) {
          workflow.error = error;
        }
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
        console.log(`Workflow ${workflowId} status updated to ${status}`);
      }
    } catch (error) {
      console.error('Error updating workflow status in localStorage:', error);
      throw error;
    }
  }

  /**
   * Delete a workflow from local storage
   */
  deleteWorkflow(workflowId: string): boolean {
    try {
      const workflows = this.getAllWorkflows();
      const filteredWorkflows = workflows.filter(w => w.id !== workflowId);
      
      if (filteredWorkflows.length < workflows.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredWorkflows));
        console.log(`Workflow ${workflowId} deleted from localStorage`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting workflow from localStorage:', error);
      throw error;
    }
  }

  /**
   * Search workflows by status or query
   */
  searchWorkflows(query?: string, status?: string): StoredWorkflow[] {
    let workflows = this.getAllWorkflows();
    
    if (status) {
      workflows = workflows.filter(w => w.status === status);
    }
    
    if (query) {
      const queryLower = query.toLowerCase();
      workflows = workflows.filter(w => 
        w.task.toLowerCase().includes(queryLower) ||
        w.id.toLowerCase().includes(queryLower)
      );
    }
    
    return workflows;
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): { total: number; byStatus: Record<string, number> } {
    const workflows = this.getAllWorkflows();
    const byStatus: Record<string, number> = {};
    
    workflows.forEach(w => {
      byStatus[w.status] = (byStatus[w.status] || 0) + 1;
    });
    
    return {
      total: workflows.length,
      byStatus
    };
  }

  /**
   * Export all workflows as JSON
   */
  exportAllWorkflows(): string {
    const workflows = this.getAllWorkflows();
    return JSON.stringify(workflows, null, 2);
  }

  /**
   * Import workflows from JSON
   */
  importWorkflows(jsonData: string): void {
    try {
      const importedWorkflows = JSON.parse(jsonData);
      
      if (!Array.isArray(importedWorkflows)) {
        throw new Error('Invalid format: expected array of workflows');
      }
      
      const existingWorkflows = this.getAllWorkflows();
      const mergedWorkflows = [...existingWorkflows];
      
      importedWorkflows.forEach((importedWorkflow: StoredWorkflow) => {
        const existingIndex = mergedWorkflows.findIndex(w => w.id === importedWorkflow.id);
        if (existingIndex >= 0) {
          // Update existing
          mergedWorkflows[existingIndex] = importedWorkflow;
        } else {
          // Add new
          mergedWorkflows.push(importedWorkflow);
        }
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mergedWorkflows));
      console.log(`Imported ${importedWorkflows.length} workflows`);
    } catch (error) {
      console.error('Error importing workflows:', error);
      throw error;
    }
  }

  /**
   * Clear all workflows from storage
   */
  clearAllWorkflows(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('All workflows cleared from localStorage');
    } catch (error) {
      console.error('Error clearing workflows:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const workflowStorage = new WorkflowLocalStorage();