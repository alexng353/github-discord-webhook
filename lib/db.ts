import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schemas/db";
import { env } from "./env";

let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
	if (db) return db;

	if (!client) {
		client = postgres(env.DATABASE_URL);
	}

	db = drizzle(client, { schema });
	return db;
}

export function closeDb() {
	if (client) {
		client.end();
		client = null;
		db = null;
	}
}
