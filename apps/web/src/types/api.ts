import type { RouterInput, RouterOutput } from '@/utils/trpc';

export type { RouterInput, RouterOutput };

export type CreateFieldRequest = RouterInput['fields']['createField'];
export type EditFieldRequest = RouterInput['fields']['editField'];
export type DeleteFieldRequest = RouterInput['fields']['deleteField'];
export type UpdateFieldOptionValueRequest =
  RouterInput['fields']['updateFieldOptionValue'];
export type SaveSelectOptionsRequest =
  RouterInput['fields']['saveSelectOptions'];

export type CreateTicketTypeRequest =
  RouterInput['ticketTypes']['createTicketType'];
export type EditTicketTypeRequest =
  RouterInput['ticketTypes']['editTicketType'];

export type CreateUserRequest = RouterInput['user']['createUser'];
export type EditUserRequest = RouterInput['user']['editUser'];
export type GetUsersRequest = RouterInput['user']['getUsersPaginated'];
