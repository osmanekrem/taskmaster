import { z } from "zod";

export const createTicketTypeRequestSchema = z.object({
  name: z.string().min(1, "Bilet türü adı zoruludur"),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export const editTicketTypeRequestSchema = z.object({
  ticketTypeId: z.string(),
  name: z.string().min(1, "Bilet türü adı zoruludur"),
  description: z.string().optional(),
  icon: z.string().optional(),
});
