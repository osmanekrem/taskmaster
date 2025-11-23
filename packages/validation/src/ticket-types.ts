import { z } from 'zod';
import { idSchema } from './general';

// Create Ticket Type Schema (merged from web and server versions)
// Using server version with optional description and icon for flexibility
export const createTicketTypeSchema = z.object({
  name: z.string().min(1, 'Bilet türü adı zorunludur'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export type CreateTicketTypeSchema = z.infer<typeof createTicketTypeSchema>;

// Edit Ticket Type Schema (merged from web and server versions)
// Using server version with optional description and icon for flexibility
export const editTicketTypeSchema = z.object({
  ticketTypeId: idSchema,
  name: z.string().min(1, 'Bilet türü adı zorunludur'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export type EditTicketTypeSchema = z.infer<typeof editTicketTypeSchema>;

export const getTicketTypeByIdRequestSchema = z.object({
  ticketTypeId: idSchema,
});

export type GetTicketTypeByIdRequestSchema = z.infer<
  typeof getTicketTypeByIdRequestSchema
>;

export const deleteTicketTypeRequestSchema = z.object({
  ticketTypeId: idSchema,
});

export type DeleteTicketTypeRequestSchema = z.infer<
  typeof deleteTicketTypeRequestSchema
>;

export const getFieldsForTicketTypeRequestSchema = z.object({
  ticketTypeId: idSchema,
});

export type GetFieldsForTicketTypeRequestSchema = z.infer<
  typeof getFieldsForTicketTypeRequestSchema
>;

export const getIssueTypeWithDetailsByIssueTypeIdRequestSchema = z.object({
  issueTypeId: idSchema,
});

export type GetIssueTypeWithDetailsByIssueTypeIdRequestSchema = z.infer<
  typeof getIssueTypeWithDetailsByIssueTypeIdRequestSchema
>;
