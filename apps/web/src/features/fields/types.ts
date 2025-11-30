import type { RouterOutput } from '@/utils/trpc';

// Base Field from API
export type Field = RouterOutput['fields']['getFields']['data'][number];

// Field with resolved defaults
export type FieldWithDefaults =
  RouterOutput['fields']['getFieldsWithDefaults']['data'][number];

// Field Type from constants (via API)
export type FieldType =
  RouterOutput['fieldTypes']['getFieldTypes']['data'][number];

// Resolved field for issue type
export type ResolvedField =
  RouterOutput['fields']['getIssueTypeFields']['data'][number];

// Issue type with field details
export type IssueTypeField = NonNullable<
  RouterOutput['ticketTypes']['getIssueTypeWithDetailsByIssueTypeId']['data']
>['fields'][number];

// Legacy exports for backward compatibility
export type FieldWithDetails = FieldWithDefaults;
export type FieldWithFieldType = FieldWithDefaults;
export type IssueTypeFieldWithDetails = IssueTypeField;
