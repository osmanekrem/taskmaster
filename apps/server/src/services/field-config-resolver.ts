import type { Field, FieldConfig, FieldSelectOption } from '@/db/schema/field';
import type { IssueTypeField } from '@/db/schema/issue-type-fields';
import { getDefaultConfig } from '@taskmaster/constants';

/**
 * Resolved field configuration
 * Field'ın base config'i ve issue type override'ı merge edilmiş hali
 */
export interface ResolvedFieldConfig {
  config: FieldConfig;
  options: FieldSelectOption[];
}

/**
 * Field with resolved configuration for a specific issue type
 */
export interface ResolvedField {
  id: string;
  name: string;
  fieldType: string;
  icon: string | null;
  order: number;
  config: FieldConfig;
  options: FieldSelectOption[];
  // Metadata
  issueTypeFieldId: string;
  hasConfigOverride: boolean;
  hasOptionsOverride: boolean;
}

/**
 * Resolves the effective configuration for a field in an issue type context
 * 
 * Inheritance order:
 * 1. Field type defaults (from constants)
 * 2. Field base config
 * 3. Issue type field override
 */
export function resolveFieldConfig(
  field: Field,
  issueTypeField?: IssueTypeField | null,
): ResolvedFieldConfig {
  // 1. Start with field type defaults
  const fieldTypeDefaults = getDefaultConfig(field.fieldType);

  // 2. Merge with field's base config
  const baseConfig = {
    ...fieldTypeDefaults,
    ...(field.config as FieldConfig ?? {}),
  };

  // 3. Merge with issue type override (if exists)
  const finalConfig = issueTypeField?.configOverride
    ? { ...baseConfig, ...(issueTypeField.configOverride as FieldConfig) }
    : baseConfig;

  // Resolve options
  const finalOptions = (issueTypeField?.optionsOverride as FieldSelectOption[] | null)
    ?? (field.options as FieldSelectOption[] | null)
    ?? [];

  return {
    config: finalConfig,
    options: finalOptions,
  };
}

/**
 * Resolves a field with its effective configuration for an issue type
 */
export function resolveField(
  field: Field,
  issueTypeField: IssueTypeField,
): ResolvedField {
  const { config, options } = resolveFieldConfig(field, issueTypeField);

  return {
    id: field.id,
    name: field.name,
    fieldType: field.fieldType,
    icon: field.icon,
    order: issueTypeField.order,
    config,
    options,
    // Metadata
    issueTypeFieldId: issueTypeField.id,
    hasConfigOverride: issueTypeField.configOverride !== null,
    hasOptionsOverride: issueTypeField.optionsOverride !== null,
  };
}

/**
 * Resolves multiple fields for an issue type
 * Accepts the format returned by repository (issueTypeField with nested field)
 */
export function resolveFieldsForIssueType(
  issueTypeFieldsWithField: Array<{
    field: Field;
    id: string;
    issueTypeId: string;
    fieldId: string;
    order: number;
    configOverride: unknown;
    optionsOverride: unknown;
    createdAt: Date | null;
  }>,
): ResolvedField[] {
  return issueTypeFieldsWithField
    .map((itf) => {
      // Reconstruct IssueTypeField from flat structure
      const issueTypeField: IssueTypeField = {
        id: itf.id,
        issueTypeId: itf.issueTypeId,
        fieldId: itf.fieldId,
        order: itf.order,
        configOverride: itf.configOverride,
        optionsOverride: itf.optionsOverride,
        createdAt: itf.createdAt,
      };
      return resolveField(itf.field, issueTypeField);
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * Gets a specific config value with proper typing
 */
export function getConfigValue<T>(
  config: FieldConfig,
  key: string,
  defaultValue: T,
): T {
  const value = config[key];
  return value !== undefined ? (value as T) : defaultValue;
}

/**
 * Helper to check if a field is required
 */
export function isFieldRequired(config: FieldConfig): boolean {
  return getConfigValue(config, 'isRequired', false);
}

/**
 * Helper to get field placeholder
 */
export function getFieldPlaceholder(config: FieldConfig): string {
  return getConfigValue(config, 'placeholder', '');
}

/**
 * Helper to get field description
 */
export function getFieldDescription(config: FieldConfig): string {
  return getConfigValue(config, 'description', '');
}
