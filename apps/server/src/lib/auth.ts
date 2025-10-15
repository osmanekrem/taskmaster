import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {db} from "@/db";
import * as schema from "../db/schema/auth";
import {sendResetPasswordEmail} from "@/lib/mail";
import {admin} from "better-auth/plugins";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",

        schema: schema,
    }),
    trustedOrigins: [
        process.env.CORS_ORIGIN || "",
    ],
    user: {
        additionalFields: {
            firstName: {
                type: "string",
                required: true,
            },
            lastName: {
                type: "string",
                required: true,
            },
        }
    },
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({user, url}) => {
            sendResetPasswordEmail({username: user.name, email: user.email, url});
        },
    },
    plugins: [
        admin()
    ],
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
});



