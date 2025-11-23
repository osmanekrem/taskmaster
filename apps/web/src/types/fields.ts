import type { RouterOutput } from '@/utils/trpc';
import type { SelectOption } from './common';

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

export interface FieldOption {
  id: string;
  value: string;
  fieldTypeOption: {
    key?: string;
    type?: string;
    name?: string;
  };
  selectOptions?: SelectOption[];
}

export interface SelectOptionsMap {
  [optionId: string]: SelectOption[];
}

export interface FieldOptionValue {
  id: string;
  value: string | boolean | number;
  fieldTypeOption?: {
    key?: string;
    type?: string;
    name?: string;
  };
}
