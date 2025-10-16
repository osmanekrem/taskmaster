import z from "zod";

export const createTicketTypeSchema = z.object({
  name: z.string().min(1, "Bilet türü adı zorunludur"),
  description: z.string(),
  icon: z.string().min(1, "Bilet türü simgesi zorunludur"),
});

export type CreateTicketTypeSchema = z.infer<typeof createTicketTypeSchema>;

export const editTicketTypeSchema = z.object({
  ticketTypeId: z.string(),
  name: z.string().min(1, "Bilet türü adı zorunludur"),
  description: z.string(),
  icon: z.string().min(1, "Bilet türü simgesi zorunludur"),
});

export type EditTicketTypeSchema = z.infer<typeof editTicketTypeSchema>;
