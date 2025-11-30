export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters?: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  paginated: (params?: {
    limit?: number;
    offset?: number;
    globalSearch?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => [...userKeys.lists(), 'paginated', params] as const,
  infinite: (params?: {
    searchField?: 'name' | 'email';
    searchValue?: string;
    limit?: number;
    searchOperator?: 'contains' | 'starts_with' | 'ends_with';
  }) => [...userKeys.lists(), 'infinite', params] as const,
};

export const fieldKeys = {
  all: ['fields'] as const,
  lists: () => [...fieldKeys.all, 'list'] as const,
  list: () => [...fieldKeys.lists()] as const,
  details: () => [...fieldKeys.all, 'detail'] as const,
  detail: (id: string) => [...fieldKeys.details(), id] as const,
  withDefaults: () => [...fieldKeys.lists(), 'withDefaults'] as const,
  // Issue type fields
  issueTypeFields: () => [...fieldKeys.all, 'issueTypeFields'] as const,
  issueTypeFieldsByIssueTypeId: (issueTypeId: string) =>
    [...fieldKeys.issueTypeFields(), issueTypeId] as const,
  // Legacy keys for backward compatibility
  withDetails: () => [...fieldKeys.withDefaults()] as const,
  withFieldType: () => [...fieldKeys.withDefaults()] as const,
  withDetailsById: (id: string) =>
    [...fieldKeys.details(), id, 'withDefaults'] as const,
  withFieldTypeById: (id: string) =>
    [...fieldKeys.details(), id, 'withDefaults'] as const,
};

export const fieldTypeKeys = {
  all: ['fieldTypes'] as const,
  lists: () => [...fieldTypeKeys.all, 'list'] as const,
  list: () => [...fieldTypeKeys.lists()] as const,
  details: () => [...fieldTypeKeys.all, 'detail'] as const,
  detail: (id: string) => [...fieldTypeKeys.details(), id] as const,
};

export const ticketTypeKeys = {
  all: ['ticketTypes'] as const,
  lists: () => [...ticketTypeKeys.all, 'list'] as const,
  list: () => [...ticketTypeKeys.lists()] as const,
  details: () => [...ticketTypeKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketTypeKeys.details(), id] as const,
  issueTypeWithDetails: (id: string) =>
    [...ticketTypeKeys.details(), id, 'withDetails'] as const,
};

export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};
