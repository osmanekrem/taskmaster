export type FormElementType =
  | 'boolean'
  | 'static_select_options'
  | 'text'
  | 'default_option'
  | 'paragraph';

export interface SelectOption {
  id?: string;
  name: string;
  icon: string | null;
  order: number;
  [key: string]: string | number | null | undefined;
}

export type IconName = string;
