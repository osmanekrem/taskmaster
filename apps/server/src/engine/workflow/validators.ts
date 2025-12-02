// =============================================================================
// VALIDATOR HANDLERS
// =============================================================================

import { db } from '@/db';
import { issues, changeGroups, changeItems } from '@/db/schema/issues';
import { issueLinks, issueLinkTypes } from '@/db/schema';
import { statuses } from '@/db/schema/statuses';
import { eq, and, desc, isNotNull, inArray } from 'drizzle-orm';
import type {
  Validator,
  ValidatorResult,
  WorkflowContext,
  FieldRequiredValidator,
  FieldIsEmptyValidator,
  FieldHasValueValidator,
  FieldChangedValidator,
  ResolutionSetValidator,
  DateComparisonValidator,
  RegexCheckValidator,
  NumericRangeValidator,
  PreviousStatusValidator,
  AllSubtasksResolvedValidator,
  ParentStatusCheckValidator,
  LinkedIssuesResolvedValidator,
} from './types';

/**
 * Validator handler interface
 */
export interface ValidatorHandler<T extends Validator = Validator> {
  type: T['type'];
  validate(validator: T, context: WorkflowContext): Promise<ValidatorResult>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getFieldValue(fieldId: string, context: WorkflowContext): unknown {
  // First check screen data (values submitted with transition)
  if (context.screenData?.[fieldId] !== undefined) {
    return context.screenData[fieldId];
  }
  
  // Then check field values
  if (context.fieldValues?.[fieldId] !== undefined) {
    return context.fieldValues[fieldId];
  }
  
  // Finally check issue itself (for built-in fields)
  const issueField = fieldId as keyof typeof context.issue;
  if (issueField in context.issue) {
    return context.issue[issueField];
  }
  
  // TODO: Check custom field values from issue_field_values table
  return undefined;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

// =============================================================================
// HANDLER IMPLEMENTATIONS
// =============================================================================

export const fieldRequiredHandler: ValidatorHandler<FieldRequiredValidator> = {
  type: 'field_required',
  async validate(validator, context): Promise<ValidatorResult> {
    const value = getFieldValue(validator.fieldId, context);
    const valid = !isEmptyValue(value);
    
    return {
      valid,
      validatorType: 'field_required',
      errorMessage: valid 
        ? undefined 
        : validator.errorMessage || `${validator.fieldName || validator.fieldId} is required`,
      fieldId: validator.fieldId,
    };
  },
};

export const fieldIsEmptyHandler: ValidatorHandler<FieldIsEmptyValidator> = {
  type: 'field_is_empty',
  async validate(validator, context): Promise<ValidatorResult> {
    const value = getFieldValue(validator.fieldId, context);
    const valid = isEmptyValue(value);
    
    return {
      valid,
      validatorType: 'field_is_empty',
      errorMessage: valid 
        ? undefined 
        : validator.errorMessage || `${validator.fieldName || validator.fieldId} must be empty`,
      fieldId: validator.fieldId,
    };
  },
};

export const fieldHasValueHandler: ValidatorHandler<FieldHasValueValidator> = {
  type: 'field_has_value',
  async validate(validator, context): Promise<ValidatorResult> {
    const value = getFieldValue(validator.fieldId, context);
    const operator = validator.operator || '=';
    let valid = false;
    
    switch (operator) {
      case '=':
        valid = value === validator.expectedValue;
        break;
      case '!=':
        valid = value !== validator.expectedValue;
        break;
      case '>':
        valid = Number(value) > Number(validator.expectedValue);
        break;
      case '<':
        valid = Number(value) < Number(validator.expectedValue);
        break;
      case '>=':
        valid = Number(value) >= Number(validator.expectedValue);
        break;
      case '<=':
        valid = Number(value) <= Number(validator.expectedValue);
        break;
      case 'contains':
        valid = String(value).includes(String(validator.expectedValue));
        break;
      case 'not_contains':
        valid = !String(value).includes(String(validator.expectedValue));
        break;
    }
    
    return {
      valid,
      validatorType: 'field_has_value',
      errorMessage: valid 
        ? undefined 
        : validator.errorMessage || `${validator.fieldName || validator.fieldId} must ${operator} ${validator.expectedValue}`,
      fieldId: validator.fieldId,
    };
  },
};

export const fieldChangedHandler: ValidatorHandler<FieldChangedValidator> = {
  type: 'field_changed',
  async validate(validator, context): Promise<ValidatorResult> {
    // Check if field value is different in screenData/fieldValues vs issue
    const currentValue = context.issue[validator.fieldId as keyof typeof context.issue];
    const newValue = context.screenData?.[validator.fieldId] ?? context.fieldValues?.[validator.fieldId];
    
    const valid = newValue !== undefined && newValue !== currentValue;
    
    return {
      valid,
      validatorType: 'field_changed',
      errorMessage: valid 
        ? undefined 
        : validator.errorMessage || `${validator.fieldName || validator.fieldId} must be changed`,
      fieldId: validator.fieldId,
    };
  },
};

export const resolutionSetHandler: ValidatorHandler<ResolutionSetValidator> = {
  type: 'resolution_set',
  async validate(validator, context): Promise<ValidatorResult> {
    const resolutionId = context.resolutionId ?? context.screenData?.resolutionId;
    
    if (!resolutionId) {
      return {
        valid: false,
        validatorType: 'resolution_set',
        errorMessage: validator.errorMessage || 'A resolution must be selected',
      };
    }
    
    // Check if resolution is in allowed list
    if (validator.allowedResolutions && validator.allowedResolutions.length > 0) {
      const valid = validator.allowedResolutions.includes(resolutionId as string);
      return {
        valid,
        validatorType: 'resolution_set',
        errorMessage: valid ? undefined : 'Selected resolution is not allowed',
      };
    }
    
    return {
      valid: true,
      validatorType: 'resolution_set',
    };
  },
};

export const dateComparisonHandler: ValidatorHandler<DateComparisonValidator> = {
  type: 'date_comparison',
  async validate(validator, context): Promise<ValidatorResult> {
    const fieldValue = getFieldValue(validator.fieldId, context);
    
    if (!fieldValue) {
      return {
        valid: false,
        validatorType: 'date_comparison',
        errorMessage: validator.errorMessage || `${validator.fieldName || validator.fieldId} is required`,
        fieldId: validator.fieldId,
      };
    }
    
    const fieldDate = new Date(fieldValue as string | number | Date);
    let compareDate: Date;
    
    if (validator.compareWith === 'now') {
      compareDate = new Date();
    } else if (validator.compareFieldId) {
      const compareValue = getFieldValue(validator.compareFieldId, context);
      if (!compareValue) {
        return {
          valid: false,
          validatorType: 'date_comparison',
          errorMessage: `Comparison field ${validator.compareFieldId} has no value`,
          fieldId: validator.fieldId,
        };
      }
      compareDate = new Date(compareValue as string | number | Date);
    } else {
      return {
        valid: false,
        validatorType: 'date_comparison',
        errorMessage: 'Invalid date comparison configuration',
        fieldId: validator.fieldId,
      };
    }
    
    let valid = false;
    switch (validator.operator) {
      case '>':
        valid = fieldDate > compareDate;
        break;
      case '<':
        valid = fieldDate < compareDate;
        break;
      case '>=':
        valid = fieldDate >= compareDate;
        break;
      case '<=':
        valid = fieldDate <= compareDate;
        break;
      case '=':
        valid = fieldDate.toDateString() === compareDate.toDateString();
        break;
    }
    
    return {
      valid,
      validatorType: 'date_comparison',
      errorMessage: valid 
        ? undefined 
        : validator.errorMessage || `Date comparison failed`,
      fieldId: validator.fieldId,
    };
  },
};

export const regexCheckHandler: ValidatorHandler<RegexCheckValidator> = {
  type: 'regex_check',
  async validate(validator, context): Promise<ValidatorResult> {
    const value = getFieldValue(validator.fieldId, context);
    
    if (isEmptyValue(value)) {
      return {
        valid: true, // Empty values pass regex check (use field_required for required)
        validatorType: 'regex_check',
        fieldId: validator.fieldId,
      };
    }
    
    try {
      const regex = new RegExp(validator.pattern, validator.flags);
      const valid = regex.test(String(value));
      
      return {
        valid,
        validatorType: 'regex_check',
        errorMessage: valid 
          ? undefined 
          : validator.errorMessage || `${validator.fieldName || validator.fieldId} format is invalid`,
        fieldId: validator.fieldId,
      };
    } catch {
      return {
        valid: false,
        validatorType: 'regex_check',
        errorMessage: 'Invalid regex pattern',
        fieldId: validator.fieldId,
      };
    }
  },
};

export const numericRangeHandler: ValidatorHandler<NumericRangeValidator> = {
  type: 'numeric_range',
  async validate(validator, context): Promise<ValidatorResult> {
    const value = getFieldValue(validator.fieldId, context);
    
    if (isEmptyValue(value)) {
      return {
        valid: true, // Empty values pass (use field_required for required)
        validatorType: 'numeric_range',
        fieldId: validator.fieldId,
      };
    }
    
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return {
        valid: false,
        validatorType: 'numeric_range',
        errorMessage: `${validator.fieldName || validator.fieldId} must be a number`,
        fieldId: validator.fieldId,
      };
    }
    
    let valid = true;
    let message = '';
    
    if (validator.min !== undefined && numValue < validator.min) {
      valid = false;
      message = `must be at least ${validator.min}`;
    }
    
    if (validator.max !== undefined && numValue > validator.max) {
      valid = false;
      message = `must be at most ${validator.max}`;
    }
    
    return {
      valid,
      validatorType: 'numeric_range',
      errorMessage: valid 
        ? undefined 
        : validator.errorMessage || `${validator.fieldName || validator.fieldId} ${message}`,
      fieldId: validator.fieldId,
    };
  },
};

export const previousStatusHandler: ValidatorHandler<PreviousStatusValidator> = {
  type: 'previous_status',
  async validate(validator, context): Promise<ValidatorResult> {
    // Check change history for previous statuses
    // Find all status transitions for this issue
    const statusChanges = await db
      .select({
        oldValue: changeItems.oldValue,
        newValue: changeItems.newValue,
      })
      .from(changeItems)
      .innerJoin(changeGroups, eq(changeItems.changeGroupId, changeGroups.id))
      .where(
        and(
          eq(changeGroups.issueId, context.issue.id),
          eq(changeItems.field, 'Status')
        )
      )
      .orderBy(desc(changeGroups.createdAt));

    // Collect all statuses the issue has been in
    const previousStatuses = new Set<string>();
    
    // Add current status
    if (context.fromStatusId) {
      previousStatuses.add(context.fromStatusId);
    }
    
    // Add all historical statuses
    for (const change of statusChanges) {
      if (change.oldValue) previousStatuses.add(change.oldValue);
      if (change.newValue) previousStatuses.add(change.newValue);
    }

    // Check if any of the required statuses are in history
    const valid = validator.statusIds.some(statusId => previousStatuses.has(statusId));
    
    return {
      valid,
      validatorType: 'previous_status',
      errorMessage: valid 
        ? undefined 
        : validator.errorMessage || 'Issue must have been in a specific status',
    };
  },
};

export const allSubtasksResolvedHandler: ValidatorHandler<AllSubtasksResolvedValidator> = {
  type: 'all_subtasks_resolved',
  async validate(validator, context): Promise<ValidatorResult> {
    // Find all subtasks of this issue
    const subtasks = await db
      .select({
        id: issues.id,
        key: issues.key,
        statusId: issues.statusId,
        resolutionId: issues.resolutionId,
      })
      .from(issues)
      .where(eq(issues.parentId, context.issue.id));

    // If no subtasks, validation passes
    if (subtasks.length === 0) {
      return {
        valid: true,
        validatorType: 'all_subtasks_resolved',
      };
    }

    // Check if all subtasks have a resolution (resolved)
    const unresolvedSubtasks = subtasks.filter(s => !s.resolutionId);
    const valid = unresolvedSubtasks.length === 0;

    return {
      valid,
      validatorType: 'all_subtasks_resolved',
      errorMessage: valid 
        ? undefined 
        : validator.errorMessage || 
          `${unresolvedSubtasks.length} subtask(s) must be resolved: ${unresolvedSubtasks.map(s => s.key).join(', ')}`,
    };
  },
};

export const parentStatusCheckHandler: ValidatorHandler<ParentStatusCheckValidator> = {
  type: 'parent_status_check',
  async validate(validator, context): Promise<ValidatorResult> {
    if (!context.issue.parentId) {
      return {
        valid: true, // No parent means check passes
        validatorType: 'parent_status_check',
      };
    }
    
    // Lookup parent issue status
    const parent = await db
      .select({
        id: issues.id,
        key: issues.key,
        statusId: issues.statusId,
        statusName: statuses.name,
      })
      .from(issues)
      .innerJoin(statuses, eq(issues.statusId, statuses.id))
      .where(eq(issues.id, context.issue.parentId))
      .limit(1);

    if (!parent[0]) {
      return {
        valid: true, // Parent not found (edge case, shouldn't happen)
        validatorType: 'parent_status_check',
      };
    }

    const valid = validator.allowedStatuses.includes(parent[0].statusId);

    return {
      valid,
      validatorType: 'parent_status_check',
      errorMessage: valid 
        ? undefined 
        : validator.errorMessage || 
          `Parent issue ${parent[0].key} must be in an allowed status (current: ${parent[0].statusName})`,
    };
  },
};

export const linkedIssuesResolvedHandler: ValidatorHandler<LinkedIssuesResolvedValidator> = {
  type: 'linked_issues_resolved',
  async validate(validator, context): Promise<ValidatorResult> {
    // Get link type IDs to check
    // If no specific types provided, use "Blocks" type
    let linkTypeIds: string[] = validator.linkTypes || [];
    
    if (linkTypeIds.length === 0) {
      // Find "Blocks" link type by name
      const blocksType = await db
        .select({ id: issueLinkTypes.id })
        .from(issueLinkTypes)
        .where(eq(issueLinkTypes.name, 'Blocks'))
        .limit(1);
      
      if (blocksType[0]) {
        linkTypeIds = [blocksType[0].id];
      }
    }

    if (linkTypeIds.length === 0) {
      // No link types to check
      return {
        valid: true,
        validatorType: 'linked_issues_resolved',
      };
    }

    // Find issues that block this issue (this issue is the target)
    const blockingLinks = await db
      .select({
        sourceIssueId: issueLinks.sourceIssueId,
      })
      .from(issueLinks)
      .where(
        and(
          eq(issueLinks.targetIssueId, context.issue.id),
          inArray(issueLinks.linkTypeId, linkTypeIds)
        )
      );

    if (blockingLinks.length === 0) {
      return {
        valid: true,
        validatorType: 'linked_issues_resolved',
      };
    }

    // Check if all blocking issues are resolved
    const blockingIssueIds = blockingLinks.map(l => l.sourceIssueId);
    const unresolvedBlockers = await db
      .select({
        id: issues.id,
        key: issues.key,
      })
      .from(issues)
      .where(
        and(
          inArray(issues.id, blockingIssueIds),
          eq(issues.resolutionId, null as any) // Not resolved
        )
      );

    // Actually check for null resolutionId properly
    const unresolvedBlockersQuery = await db
      .select({
        id: issues.id,
        key: issues.key,
        resolutionId: issues.resolutionId,
      })
      .from(issues)
      .where(inArray(issues.id, blockingIssueIds));

    const unresolved = unresolvedBlockersQuery.filter(i => !i.resolutionId);
    const valid = unresolved.length === 0;

    return {
      valid,
      validatorType: 'linked_issues_resolved',
      errorMessage: valid 
        ? undefined 
        : validator.errorMessage || 
          `Blocking issue(s) must be resolved: ${unresolved.map(i => i.key).join(', ')}`,
    };
  },
};

// =============================================================================
// VALIDATOR REGISTRY
// =============================================================================

const validatorHandlers = new Map<string, ValidatorHandler>();

// Register built-in handlers
validatorHandlers.set('field_required', fieldRequiredHandler);
validatorHandlers.set('field_is_empty', fieldIsEmptyHandler);
validatorHandlers.set('field_has_value', fieldHasValueHandler);
validatorHandlers.set('field_changed', fieldChangedHandler);
validatorHandlers.set('resolution_set', resolutionSetHandler);
validatorHandlers.set('date_comparison', dateComparisonHandler);
validatorHandlers.set('regex_check', regexCheckHandler);
validatorHandlers.set('numeric_range', numericRangeHandler);
validatorHandlers.set('previous_status', previousStatusHandler);
validatorHandlers.set('all_subtasks_resolved', allSubtasksResolvedHandler);
validatorHandlers.set('parent_status_check', parentStatusCheckHandler);
validatorHandlers.set('linked_issues_resolved', linkedIssuesResolvedHandler);

/**
 * Register a custom validator handler
 */
export function registerValidatorHandler(handler: ValidatorHandler): void {
  validatorHandlers.set(handler.type, handler);
}

/**
 * Get a validator handler by type
 */
export function getValidatorHandler(type: string): ValidatorHandler | undefined {
  return validatorHandlers.get(type);
}

/**
 * Validate all validators for a transition
 * Returns false if ANY validator fails (AND logic)
 */
export async function validateTransition(
  validators: Validator[],
  context: WorkflowContext
): Promise<{ allValid: boolean; results: ValidatorResult[] }> {
  const results: ValidatorResult[] = [];
  
  for (const validator of validators) {
    const handler = validatorHandlers.get(validator.type);
    
    if (!handler) {
      results.push({
        valid: false,
        validatorType: validator.type,
        errorMessage: `Unknown validator type: ${validator.type}`,
      });
      continue;
    }
    
    const result = await handler.validate(validator, context);
    results.push(result);
  }
  
  const allValid = results.every(r => r.valid);
  
  return { allValid, results };
}
