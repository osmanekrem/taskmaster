// =============================================================================
// FIELD VALIDATION UTILITY
// =============================================================================
// Centralized field value validation logic extracted from IssueService
// This ensures validation logic is reusable and testable

import { db } from '@/db';
import { user } from '@/db/schema/auth';
import { versions } from '@/db/schema/versions';
import { components } from '@/db/schema/components';
import { labels } from '@/db/schema/labels';
import { sprints } from '@/db/schema/sprints';
import { issues } from '@/db/schema/issues';
import { eq, and, or, inArray, isNull } from 'drizzle-orm';
import { createAppError } from '@/lib/errors';
import type { FieldValue } from '@/db/schema/issues';

// =============================================================================
// TYPES
// =============================================================================

export interface FieldDefinition {
  fieldType: string;
  name: string;
  options?: unknown[] | null;
}

export interface FieldConfig {
  isRequired?: boolean;
  minLength?: number | null;
  maxLength?: number | null;
  min?: number | null;
  max?: number | null;
  minSelections?: number | null;
  maxSelections?: number | null;
  maxRating?: number;
  allowMultiple?: boolean;
  sameProjectOnly?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// =============================================================================
// TYPE-SPECIFIC VALIDATORS
// =============================================================================

const validators: Record<
  string,
  (
    field: FieldDefinition,
    value: FieldValue,
    config: FieldConfig,
  ) => ValidationResult
> = {
  'text-input': validateText,
  'text-area': validateText,
  'rich-text': validateText,
  'number-input': validateNumber,
  'single-select': validateSingleSelect,
  'multi-select': validateMultiSelect,
  checkbox: validateCheckbox,
  'date-picker': validateDate,
  'user-picker': validateUserPicker,
  'user-multi-picker': validateUserMultiPicker,
  'url-input': validateUrl,
  'email-input': validateEmail,
  rating: validateRating,
  'color-picker': validateColor,
  'version-picker': validateEntityPicker,
  'component-picker': validateEntityPicker,
  'label-picker': validateEntityPicker,
  'sprint-picker': validateEntityPicker,
  'issue-picker': validateEntityPicker,
};

// =============================================================================
// VALIDATOR IMPLEMENTATIONS
// =============================================================================

function validateText(
  field: FieldDefinition,
  value: FieldValue,
  config: FieldConfig,
): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, error: `${field.name} must be a string` };
  }

  if (config.minLength != null && value.length < config.minLength) {
    return {
      valid: false,
      error: `${field.name} must be at least ${config.minLength} characters`,
    };
  }

  if (config.maxLength != null && value.length > config.maxLength) {
    return {
      valid: false,
      error: `${field.name} must be at most ${config.maxLength} characters`,
    };
  }

  return { valid: true };
}

function validateNumber(
  field: FieldDefinition,
  value: FieldValue,
  config: FieldConfig,
): ValidationResult {
  if (typeof value !== 'number') {
    return { valid: false, error: `${field.name} must be a number` };
  }

  if (config.min != null && value < config.min) {
    return {
      valid: false,
      error: `${field.name} must be at least ${config.min}`,
    };
  }

  if (config.max != null && value > config.max) {
    return {
      valid: false,
      error: `${field.name} must be at most ${config.max}`,
    };
  }

  return { valid: true };
}

function validateSingleSelect(
  field: FieldDefinition,
  value: FieldValue,
  _config: FieldConfig,
): ValidationResult {
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: `${field.name} must be a string (option ID)`,
    };
  }

  if (field.options && Array.isArray(field.options)) {
    const optionIds = (field.options as { id: string }[]).map((o) => o.id);
    if (!optionIds.includes(value)) {
      return { valid: false, error: `Invalid option for ${field.name}` };
    }
  }

  return { valid: true };
}

function validateMultiSelect(
  field: FieldDefinition,
  value: FieldValue,
  config: FieldConfig,
): ValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, error: `${field.name} must be an array` };
  }

  if (config.minSelections != null && value.length < config.minSelections) {
    return {
      valid: false,
      error: `${field.name} requires at least ${config.minSelections} selections`,
    };
  }

  if (config.maxSelections != null && value.length > config.maxSelections) {
    return {
      valid: false,
      error: `${field.name} allows at most ${config.maxSelections} selections`,
    };
  }

  if (field.options && Array.isArray(field.options)) {
    const optionIds = new Set(
      (field.options as { id: string }[]).map((o) => o.id),
    );
    for (const v of value) {
      if (typeof v !== 'string' || !optionIds.has(v)) {
        return { valid: false, error: `Invalid option in ${field.name}` };
      }
    }
  }

  return { valid: true };
}

function validateCheckbox(
  field: FieldDefinition,
  value: FieldValue,
  _config: FieldConfig,
): ValidationResult {
  if (typeof value !== 'boolean') {
    return { valid: false, error: `${field.name} must be a boolean` };
  }
  return { valid: true };
}

function validateDate(
  field: FieldDefinition,
  value: FieldValue,
  _config: FieldConfig,
): ValidationResult {
  if (typeof value === 'string') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return { valid: false, error: `${field.name} must be a valid date` };
    }
  } else if (!(value instanceof Date)) {
    return { valid: false, error: `${field.name} must be a date` };
  }
  return { valid: true };
}

function validateUserPicker(
  field: FieldDefinition,
  value: FieldValue,
  _config: FieldConfig,
): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, error: `${field.name} must be a user ID` };
  }
  return { valid: true };
}

function validateUserMultiPicker(
  field: FieldDefinition,
  value: FieldValue,
  _config: FieldConfig,
): ValidationResult {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      error: `${field.name} must be an array of user IDs`,
    };
  }
  for (const v of value) {
    if (typeof v !== 'string') {
      return {
        valid: false,
        error: `${field.name} must contain valid user IDs`,
      };
    }
  }
  return { valid: true };
}

function validateUrl(
  field: FieldDefinition,
  value: FieldValue,
  _config: FieldConfig,
): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, error: `${field.name} must be a string` };
  }
  try {
    new URL(value);
  } catch {
    return { valid: false, error: `${field.name} must be a valid URL` };
  }
  return { valid: true };
}

function validateEmail(
  field: FieldDefinition,
  value: FieldValue,
  _config: FieldConfig,
): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, error: `${field.name} must be a string` };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { valid: false, error: `${field.name} must be a valid email` };
  }
  return { valid: true };
}

function validateRating(
  field: FieldDefinition,
  value: FieldValue,
  config: FieldConfig,
): ValidationResult {
  if (typeof value !== 'number') {
    return { valid: false, error: `${field.name} must be a number` };
  }
  const maxRating = config.maxRating || 5;
  if (value < 0 || value > maxRating) {
    return {
      valid: false,
      error: `${field.name} must be between 0 and ${maxRating}`,
    };
  }
  return { valid: true };
}

function validateColor(
  field: FieldDefinition,
  value: FieldValue,
  _config: FieldConfig,
): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, error: `${field.name} must be a string` };
  }
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexRegex.test(value)) {
    return { valid: false, error: `${field.name} must be a valid hex color` };
  }
  return { valid: true };
}

function validateEntityPicker(
  field: FieldDefinition,
  value: FieldValue,
  config: FieldConfig,
): ValidationResult {
  const allowMultiple = config.allowMultiple === true;

  if (allowMultiple) {
    if (!Array.isArray(value)) {
      return { valid: false, error: `${field.name} must be an array` };
    }
    for (const v of value) {
      if (typeof v !== 'string') {
        return { valid: false, error: `${field.name} must contain valid IDs` };
      }
    }
    return { valid: true };
  }

  // Single value mode
  if (typeof value !== 'string') {
    return { valid: false, error: `${field.name} must be an ID string` };
  }

  return { valid: true };
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validate a field value based on field type and configuration
 */
export function validateFieldValue(
  field: FieldDefinition,
  value: FieldValue,
  config: FieldConfig = {},
): ValidationResult {
  // Handle required validation
  if (
    config.isRequired &&
    (value === null || value === undefined || value === '')
  ) {
    return { valid: false, error: `${field.name} is required` };
  }

  // If value is null/undefined and not required, it's valid
  if (value === null || value === undefined) {
    return { valid: true };
  }

  // Get the validator for this field type
  const validator = validators[field.fieldType];

  if (validator) {
    return validator(field, value, config);
  }

  // For unknown field types, accept any value
  return { valid: true };
}

// =============================================================================
// ENTITY EXISTENCE VALIDATION
// =============================================================================

/**
 * Validate that referenced entities exist in the database
 */
export async function validateEntityExists(
  fieldType: string,
  fieldName: string,
  value: FieldValue,
  projectId: string,
  config: FieldConfig = {},
): Promise<void> {
  const allowMultiple = config.allowMultiple === true;

  // Extract IDs from value
  let ids: string[] = [];
  if (allowMultiple && Array.isArray(value)) {
    ids = value as string[];
  } else if (typeof value === 'string') {
    ids = [value];
  }

  if (ids.length === 0) return;

  const entityValidators: Record<string, () => Promise<void>> = {
    'user-picker': () => validateUsers(ids, fieldName),
    'user-multi-picker': () => validateUsers(ids, fieldName),
    'version-picker': () => validateVersions(ids, projectId, fieldName),
    'component-picker': () => validateComponents(ids, projectId, fieldName),
    'label-picker': () => validateLabels(ids, projectId, fieldName),
    'sprint-picker': () => validateSprints(ids, projectId, fieldName),
    'issue-picker': () =>
      validateIssues(ids, projectId, fieldName, config.sameProjectOnly),
  };

  const validator = entityValidators[fieldType];
  if (validator) {
    await validator();
  }
}

// =============================================================================
// ENTITY VALIDATORS
// =============================================================================

async function validateUsers(ids: string[], fieldName: string): Promise<void> {
  const existingUsers = await db.query.user.findMany({
    where: inArray(user.id, ids),
    columns: { id: true },
  });

  const existingIds = new Set(existingUsers.map((u) => u.id));
  const invalidIds = ids.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    throw createAppError(
      `Invalid user(s) in ${fieldName}: ${invalidIds.join(', ')}`,
      { statusCode: 400, code: 'VALIDATION_ERROR' },
    );
  }
}

async function validateVersions(
  ids: string[],
  projectId: string,
  fieldName: string,
): Promise<void> {
  const existingVersions = await db.query.versions.findMany({
    where: and(inArray(versions.id, ids), eq(versions.projectId, projectId)),
    columns: { id: true },
  });

  const existingIds = new Set(existingVersions.map((v) => v.id));
  const invalidIds = ids.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    throw createAppError(
      `Invalid or inaccessible version(s) in ${fieldName}: ${invalidIds.join(
        ', ',
      )}`,
      { statusCode: 400, code: 'VALIDATION_ERROR' },
    );
  }
}

async function validateComponents(
  ids: string[],
  projectId: string,
  fieldName: string,
): Promise<void> {
  const existingComponents = await db.query.components.findMany({
    where: and(
      inArray(components.id, ids),
      eq(components.projectId, projectId),
    ),
    columns: { id: true },
  });

  const existingIds = new Set(existingComponents.map((c) => c.id));
  const invalidIds = ids.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    throw createAppError(
      `Invalid or inaccessible component(s) in ${fieldName}: ${invalidIds.join(
        ', ',
      )}`,
      { statusCode: 400, code: 'VALIDATION_ERROR' },
    );
  }
}

async function validateLabels(
  ids: string[],
  projectId: string,
  fieldName: string,
): Promise<void> {
  const existingLabels = await db.query.labels.findMany({
    where: and(
      inArray(labels.id, ids),
      or(isNull(labels.projectId), eq(labels.projectId, projectId)),
    ),
    columns: { id: true },
  });

  const existingIds = new Set(existingLabels.map((l) => l.id));
  const invalidIds = ids.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    throw createAppError(
      `Invalid or inaccessible label(s) in ${fieldName}: ${invalidIds.join(
        ', ',
      )}`,
      { statusCode: 400, code: 'VALIDATION_ERROR' },
    );
  }
}

async function validateSprints(
  ids: string[],
  projectId: string,
  fieldName: string,
): Promise<void> {
  const existingSprints = await db.query.sprints.findMany({
    where: and(inArray(sprints.id, ids), eq(sprints.projectId, projectId)),
    columns: { id: true },
  });

  const existingIds = new Set(existingSprints.map((s) => s.id));
  const invalidIds = ids.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    throw createAppError(
      `Invalid or inaccessible sprint(s) in ${fieldName}: ${invalidIds.join(
        ', ',
      )}`,
      { statusCode: 400, code: 'VALIDATION_ERROR' },
    );
  }
}

async function validateIssues(
  ids: string[],
  projectId: string,
  fieldName: string,
  sameProjectOnly?: boolean,
): Promise<void> {
  const conditions = [inArray(issues.id, ids)];
  if (sameProjectOnly) {
    conditions.push(eq(issues.projectId, projectId));
  }

  const existingIssues = await db.query.issues.findMany({
    where: and(...conditions),
    columns: { id: true },
  });

  const existingIds = new Set(existingIssues.map((i) => i.id));
  const invalidIds = ids.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    throw createAppError(
      `Invalid or inaccessible issue(s) in ${fieldName}: ${invalidIds.join(
        ', ',
      )}`,
      { statusCode: 400, code: 'VALIDATION_ERROR' },
    );
  }
}
