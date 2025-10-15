import "dotenv/config";
import {trpcServer} from "@hono/trpc-server";
import {createContext} from "./lib/context";
import {appRouter} from "./routers/index";
import {auth} from "./lib/auth";
import {Hono} from "hono";
import {cors} from "hono/cors";
import {logger} from "hono/logger";
import {honoErrorMiddleware} from "@osmanekrem/error-handler/hono";

const app = new Hono();

app.use(logger());
app.use(honoErrorMiddleware({
    logErrors: true,
    includeStack: process.env.NODE_ENV === 'development',
    sanitizeContext: true
}))
app.use("/*", cors({
    origin: process.env.CORS_ORIGIN || "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));


app.use("/trpc/*", trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
        return createContext({context});
    },
}));

app.get("/", (c) => {
    return c.text("OK");
});

export default app;
