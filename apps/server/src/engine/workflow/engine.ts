// =============================================================================
// WORKFLOW ENGINE
// Main orchestrator for workflow transition execution
// =============================================================================

import type {
  WorkflowContext,
  Condition,
  Validator,
  PostFunction,
  TransitionExecutionResult,
  ConditionResult,
  ValidatorResult,
  PostFunctionResult,
} from './types';
import { evaluateConditions } from './conditions';
import { validateTransition } from './validators';
import { executePostFunctions, type PostFunctionChanges } from './post-functions';

/**
 * Workflow transition definition
 */
export interface WorkflowTransition {
  id: string;
  name: string;
  fromStatusId: string | null; // null = any status (global transition)
  toStatusId: string;
  conditions: Condition[];
  validators: Validator[];
  postFunctions: PostFunction[];
  screenId?: string; // Screen to show during transition (Phase 11)
}

/**
 * Available transition for display to user
 */
export interface AvailableTransition {
  id: string;
  name: string;
  toStatusId: string;
  toStatusName?: string;
  hasScreen: boolean;
  screenId?: string;
}

/**
 * Transition request input
 */
export interface TransitionRequest {
  transitionId: string;
  screenData?: Record<string, unknown>;
  fieldValues?: Record<string, unknown>;
  resolutionId?: string | null;
  comment?: string;
}

/**
 * WorkflowEngine class
 * Handles condition evaluation, validation, and post-function execution
 */
export class WorkflowEngine {
  private transitions: Map<string, WorkflowTransition> = new Map();
  
  /**
   * Load transitions for a workflow
   */
  loadTransitions(transitions: WorkflowTransition[]): void {
    this.transitions.clear();
    for (const transition of transitions) {
      this.transitions.set(transition.id, transition);
    }
  }
  
  /**
   * Get a transition by ID
   */
  getTransition(transitionId: string): WorkflowTransition | undefined {
    return this.transitions.get(transitionId);
  }
  
  /**
   * Get all loaded transitions
   */
  getAllTransitions(): WorkflowTransition[] {
    return Array.from(this.transitions.values());
  }
  
  /**
   * Get available transitions for an issue based on current status
   * Evaluates conditions to determine which transitions the user can execute
   */
  async getAvailableTransitions(
    context: Omit<WorkflowContext, 'transitionId' | 'toStatusId'>
  ): Promise<AvailableTransition[]> {
    const available: AvailableTransition[] = [];
    const currentStatusId = context.fromStatusId;
    
    for (const transition of this.transitions.values()) {
      // Check if transition applies to current status
      // null fromStatusId means global transition (from any status)
      if (transition.fromStatusId !== null && transition.fromStatusId !== currentStatusId) {
        continue;
      }
      
      // Create context for condition evaluation
      const fullContext: WorkflowContext = {
        ...context,
        transitionId: transition.id,
        toStatusId: transition.toStatusId,
      };
      
      // Evaluate conditions
      const { allPassed } = await evaluateConditions(transition.conditions, fullContext);
      
      if (allPassed) {
        available.push({
          id: transition.id,
          name: transition.name,
          toStatusId: transition.toStatusId,
          hasScreen: !!transition.screenId,
          screenId: transition.screenId,
        });
      }
    }
    
    return available;
  }
  
  /**
   * Check if a specific transition is available for the user
   */
  async isTransitionAvailable(
    transitionId: string,
    context: Omit<WorkflowContext, 'transitionId' | 'toStatusId'>
  ): Promise<{ available: boolean; reasons: string[] }> {
    const transition = this.transitions.get(transitionId);
    
    if (!transition) {
      return { available: false, reasons: ['Transition not found'] };
    }
    
    // Check status match
    if (transition.fromStatusId !== null && transition.fromStatusId !== context.fromStatusId) {
      return { 
        available: false, 
        reasons: [`Transition not available from current status`] 
      };
    }
    
    // Create full context
    const fullContext: WorkflowContext = {
      ...context,
      transitionId: transition.id,
      toStatusId: transition.toStatusId,
    };
    
    // Evaluate conditions
    const { allPassed, results } = await evaluateConditions(transition.conditions, fullContext);
    
    if (!allPassed) {
      const reasons = results
        .filter(r => !r.passed)
        .map(r => r.message || `Condition ${r.conditionType} failed`);
      return { available: false, reasons };
    }
    
    return { available: true, reasons: [] };
  }
  
  /**
   * Validate a transition before execution
   * Does NOT execute - just checks if transition would succeed
   */
  async validateTransitionRequest(
    request: TransitionRequest,
    baseContext: Omit<WorkflowContext, 'transitionId' | 'toStatusId' | 'screenData' | 'fieldValues' | 'resolutionId' | 'comment'>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const transition = this.transitions.get(request.transitionId);
    
    if (!transition) {
      return { valid: false, errors: ['Transition not found'] };
    }
    
    // Create full context
    const context: WorkflowContext = {
      ...baseContext,
      transitionId: request.transitionId,
      toStatusId: transition.toStatusId,
      screenData: request.screenData,
      fieldValues: request.fieldValues,
      resolutionId: request.resolutionId,
      comment: request.comment,
    };
    
    // First check conditions
    const { available, reasons } = await this.isTransitionAvailable(
      request.transitionId,
      baseContext
    );
    
    if (!available) {
      return { valid: false, errors: reasons };
    }
    
    // Then run validators
    const { allValid, results } = await validateTransition(transition.validators, context);
    
    if (!allValid) {
      const errors = results
        .filter(r => !r.valid)
        .map(r => r.errorMessage || `Validation ${r.validatorType} failed`);
      return { valid: false, errors };
    }
    
    return { valid: true, errors: [] };
  }
  
  /**
   * Execute a transition
   * Returns the changes to be applied to the issue
   */
  async executeTransition(
    request: TransitionRequest,
    baseContext: Omit<WorkflowContext, 'transitionId' | 'toStatusId' | 'screenData' | 'fieldValues' | 'resolutionId' | 'comment'>
  ): Promise<TransitionExecutionResult & { changes: PostFunctionChanges }> {
    const transition = this.transitions.get(request.transitionId);
    
    if (!transition) {
      return {
        success: false,
        conditionResults: [],
        validatorResults: [],
        postFunctionResults: [],
        errors: ['Transition not found'],
        changes: [],
      } as any;
    }
    
    // Create full context
    const context: WorkflowContext = {
      ...baseContext,
      transitionId: request.transitionId,
      toStatusId: transition.toStatusId,
      screenData: request.screenData,
      fieldValues: request.fieldValues,
      resolutionId: request.resolutionId,
      comment: request.comment,
    };
    
    const conditionResults: ConditionResult[] = [];
    const validatorResults: ValidatorResult[] = [];
    const postFunctionResults: PostFunctionResult[] = [];
    const errors: string[] = [];
    
    // Step 1: Evaluate conditions
    const conditionsResult = await evaluateConditions(transition.conditions, context);
    conditionResults.push(...conditionsResult.results);
    
    if (!conditionsResult.allPassed) {
      conditionResults
        .filter(r => !r.passed)
        .forEach(r => errors.push(r.message || `Condition ${r.conditionType} failed`));
      
      return {
        success: false,
        conditionResults,
        validatorResults,
        postFunctionResults,
        errors,
        changes: [],
      } as any;
    }
    
    // Step 2: Run validators
    const validatorsResult = await validateTransition(transition.validators, context);
    validatorResults.push(...validatorsResult.results);
    
    if (!validatorsResult.allValid) {
      validatorResults
        .filter(r => !r.valid)
        .forEach(r => errors.push(r.errorMessage || `Validation ${r.validatorType} failed`));
      
      return {
        success: false,
        conditionResults,
        validatorResults,
        postFunctionResults,
        errors,
        changes: [],
      } as any;
    }
    
    // Step 3: Execute post-functions
    const postFunctionsResult = await executePostFunctions(transition.postFunctions, context);
    postFunctionResults.push(...postFunctionsResult.results);
    
    // Collect all changes
    const allChanges: { field: string; oldValue: unknown; newValue: unknown }[] = [];
    
    // Status change
    allChanges.push({
      field: 'status',
      oldValue: context.fromStatusId,
      newValue: context.toStatusId,
    });
    
    // Issue updates from post-functions
    for (const [field, value] of Object.entries(postFunctionsResult.changes.issueUpdates)) {
      const oldValue = context.issue[field as keyof typeof context.issue];
      if (oldValue !== value) {
        allChanges.push({ field, oldValue, newValue: value });
      }
    }
    
    return {
      success: postFunctionsResult.success,
      conditionResults,
      validatorResults,
      postFunctionResults,
      errors: postFunctionsResult.success ? [] : ['Post-function execution failed'],
      changes: allChanges,
      // Also return the structured changes for the service to apply
      ...(postFunctionsResult.changes as any),
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new WorkflowEngine instance
 */
export function createWorkflowEngine(): WorkflowEngine {
  return new WorkflowEngine();
}

// =============================================================================
// SINGLETON INSTANCE (optional)
// =============================================================================

let defaultEngine: WorkflowEngine | null = null;

export function getDefaultWorkflowEngine(): WorkflowEngine {
  if (!defaultEngine) {
    defaultEngine = createWorkflowEngine();
  }
  return defaultEngine;
}
