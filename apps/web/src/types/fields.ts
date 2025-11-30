import type { RouterOutput } from '@/utils/trpc';

// Base Field type from API
export type Field = RouterOutput['fields']['getFields']['data'][number];

// Field with resolved default config
export type FieldWithDefaults =
  RouterOutput['fields']['getFieldsWithDefaults']['data'][number];

// Field Type from constants (via API)
export type FieldType =
  RouterOutput['fieldTypes']['getFieldTypes']['data'][number];

// Field Type with config schema
export type FieldTypeWithOptions =
  RouterOutput['fieldTypes']['getFieldTypesWithOptions']['data'][number];

// Issue Type Field (resolved field with merged config)
export type IssueTypeField = NonNullable<
  RouterOutput['ticketTypes']['getIssueTypeWithDetailsByIssueTypeId']['data']
>['fields'][number];

// Resolved field from getIssueTypeFields
export type ResolvedField =
  RouterOutput['fields']['getIssueTypeFields']['data'][number];

// Field config type
export interface FieldConfig {
  isRequired?: boolean;
  placeholder?: string;
  description?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string | number | boolean;
  defaultOption?: string;
  granularity?: 'day' | 'hour' | 'minute' | 'second';
  [key: string]: unknown;
}

// Select option for select fields
export interface FieldSelectOption {
  id: string;
  name: string;
  icon?: string;
  order: number;
}

// Legacy types for backward compatibility
export type FieldWithDetails = FieldWithDefaults;
export type FieldWithFieldType = FieldWithDefaults;
export type IssueTypeFieldWithDetails = IssueTypeField;

// Legacy FieldOption type - NO LONGER USED, use FieldConfig instead
export interface FieldOption {
  id: string;
  value: string;
  fieldTypeOption?: {
    key?: string;
    type?: string;
    name?: string;
  };
  selectOptions?: FieldSelectOption[];
}

// Legacy SelectOptionsMap - NO LONGER USED
export interface SelectOptionsMap {
  [optionId: string]: FieldSelectOption[];
}
