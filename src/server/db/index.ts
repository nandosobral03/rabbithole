import { type Client, createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { config } from "dotenv";
import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */

config({ path: ".env" });

const globalForDb = globalThis as unknown as {
	client: Client | undefined;
};

export const client =
	globalForDb.client ??
	createClient({ url: env.DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
if (env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
