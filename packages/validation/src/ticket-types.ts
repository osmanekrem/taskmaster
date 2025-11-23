import { z } from 'zod';

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
  ticketTypeId: z.string().min(1, "Bilet türü ID'si zorunludur"),
  name: z.string().min(1, 'Bilet türü adı zorunludur'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export type EditTicketTypeSchema = z.infer<typeof editTicketTypeSchema>;

