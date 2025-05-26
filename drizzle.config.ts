import type { Config } from "drizzle-kit";

import { env } from "./src/env";

console.log(env.NODE_ENV);
console.log(env.DATABASE_URL);
console.log(env.TURSO_AUTH_TOKEN);
export default {
	schema: "./src/server/db/schema.ts",
	dialect: env.NODE_ENV === "production" ? "turso" : "sqlite",
	dbCredentials: {
		url: env.DATABASE_URL,
		authToken: env.TURSO_AUTH_TOKEN,
	},
} satisfies Config;
