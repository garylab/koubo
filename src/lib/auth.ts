import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { cache } from "react";
import { getDb } from "./db/client";
import { user, session, account, verification } from "./db/schema";

export const getAuth = cache(() => {
  const options: BetterAuthOptions = {
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true, autoSignIn: true },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
  };
  return betterAuth(options);
});
