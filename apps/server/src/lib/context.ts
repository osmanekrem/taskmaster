import type { Context as HonoContext } from "hono";
import { auth } from "./auth";
import { db } from "@/db";
import { container, Container } from "./container";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    session,
    db,
    services: {
      user: container.user,
      field: container.field,
      fieldType: container.fieldType,
      ticketType: container.ticketType,
      status: container.status,
      workflow: container.workflow,
      project: container.project,
      issue: container.issue,
      comment: container.comment,
      notification: container.notification,
      permission: container.permission,
      sprint: container.sprint,
    },
  };
}

export function getContainer(): Container {
  return container;
}

export type Context = Awaited<ReturnType<typeof createContext>>;
