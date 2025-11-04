import type { RouterOutput } from '@/utils/trpc';

export type Field = RouterOutput['fields']['getFields']['data'][number];
export type FieldWithDetails =
  RouterOutput['fields']['getFieldsWithDetails']['data'][number];
export type FieldWithFieldType =
  RouterOutput['fields']['getFieldsWithFieldType']['data'][number];
export type FieldType =
  RouterOutput['fieldTypes']['getFieldTypes']['data'][number];
export type IssueTypeFieldWithDetails = NonNullable<
  RouterOutput['ticketTypes']['getIssueTypeWithDetailsByIssueTypeId']['data']
>['fields'][number];
