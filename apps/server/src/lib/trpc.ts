import {initTRPC, TRPCError} from "@trpc/server";
import type {Context} from "./context";
import {z, ZodError} from "zod";
import {errorResponse} from "@/utils/response";

export const t = initTRPC.context<Context>().create({
    errorFormatter({shape, error}) {
        return {
            ...errorResponse(
                error.message,
                error.code,
                error.cause instanceof ZodError ? z.treeifyError(error.cause) : error.cause ?? undefined
            ),
        };
    },
});

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ctx, next}) => {
    if (!ctx.session) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
            cause: "No session",
        });
    }
    return next({
        ctx: {
            ...ctx,
            session: ctx.session,
        },
    });
});

export const adminProcedure = protectedProcedure.use(
    t.middleware(({ctx, next}) => {
        // Admin kontrolü
        if (ctx.session?.user.role !== "user-management") {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Bu işlem için user-management yetkisi gerekiyor",
            });
        }

        return next({ctx});
    })
);
