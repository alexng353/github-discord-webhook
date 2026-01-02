import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../lib/db";
import { sessions } from "../schemas/db";

/**
 * Session data structure
 */
export interface Session {
	id: string;
	userId: string;
	createdAt: Date;
	expiresAt: Date;
}

/**
 * Abstract session adapter interface
 */
export abstract class SessionAdapter {
	/** Create a new session for a user, returns session ID */
	abstract create(userId: string, ttlSeconds?: number): Promise<string>;

	/** Validate session, returns user ID if valid, null otherwise */
	abstract validate(sessionId: string): Promise<string | null>;

	/** Destroy a session (logout) */
	abstract destroy(sessionId: string): Promise<boolean>;

	/** Destroy all sessions for a user */
	abstract destroyAllForUser(userId: string): Promise<number>;
}

/** Default session TTL: 7 days */
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Database-backed session adapter
 */
export class DatabaseSessionAdapter extends SessionAdapter {
	async create(
		userId: string,
		ttlSeconds: number = DEFAULT_TTL_SECONDS,
	): Promise<string> {
		const db = getDb();
		const now = new Date();
		const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

		const [session] = await db
			.insert(sessions)
			.values({
				userId,
				createdAt: now,
				expiresAt,
			})
			.returning({ id: sessions.id });

		if (!session) {
			throw new Error("Failed to create session");
		}

		return session.id;
	}

	async validate(sessionId: string): Promise<string | null> {
		const db = getDb();
		const now = new Date();

		const [session] = await db
			.select()
			.from(sessions)
			.where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
			.limit(1);

		if (!session) {
			// Clean up expired session
			await this.destroy(sessionId);
			return null;
		}

		return session.userId;
	}

	async destroy(sessionId: string): Promise<boolean> {
		const db = getDb();
		const result = await db
			.delete(sessions)
			.where(eq(sessions.id, sessionId))
			.returning();
		return result.length > 0;
	}

	async destroyAllForUser(userId: string): Promise<number> {
		const db = getDb();
		const result = await db
			.delete(sessions)
			.where(eq(sessions.userId, userId))
			.returning();
		return result.length;
	}
}
