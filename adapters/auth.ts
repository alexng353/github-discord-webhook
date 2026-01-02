import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { authTokens } from "../schemas/db";

/**
 * Abstract authentication adapter interface
 */
export abstract class AuthAdapter {
	/** Generate and store a new secure token */
	abstract create(): Promise<string>;

	/** Check if a token is valid */
	abstract validate(token: string): Promise<boolean>;

	/** Revoke a token, returns true if it existed */
	abstract revoke(token: string): Promise<boolean>;
}

/**
 * Database-backed Bearer token authentication adapter
 */
export class DatabaseAuthAdapter extends AuthAdapter {
	async create(): Promise<string> {
		const db = getDb();
		const [tokenRecord] = await db
			.insert(authTokens)
			.values({})
			.returning({ token: authTokens.token });
		if (!tokenRecord) {
			throw new Error("Failed to create auth token");
		}
		return tokenRecord.token;
	}

	async validate(token: string): Promise<boolean> {
		const db = getDb();
		const [tokenRecord] = await db
			.select()
			.from(authTokens)
			.where(eq(authTokens.token, token))
			.limit(1);
		return tokenRecord !== undefined;
	}

	async revoke(token: string): Promise<boolean> {
		const db = getDb();
		const result = await db
			.delete(authTokens)
			.where(eq(authTokens.token, token))
			.returning();
		return result.length > 0;
	}
}
