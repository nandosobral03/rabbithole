import type { Config } from "drizzle-kit";

import { env } from "./src/env";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: env.NODE_ENV === "production" ? "turso" : "sqlite",
  dbCredentials: {
    url: env.DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
