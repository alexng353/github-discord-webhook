import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { users } from "../schemas/db";

/**
 * User data structure
 */
export interface User {
	id: string;
	username: string;
	passwordHash: string;
	createdAt: Date;
}

/**
 * Abstract user adapter interface
 */
export abstract class UserAdapter {
	/** Create a new user, returns the user ID */
	abstract create(username: string, password: string): Promise<string>;

	/** Validate credentials, returns user ID if valid, null otherwise */
	abstract validateCredentials(
		username: string,
		password: string,
	): Promise<string | null>;

	/** Get user by ID (without password hash) */
	abstract getById(id: string): Promise<Omit<User, "passwordHash"> | null>;

	/** Check if username exists */
	abstract usernameExists(username: string): Promise<boolean>;
}

/**
 * Database-backed user adapter
 */
export class DatabaseUserAdapter extends UserAdapter {
	async create(username: string, password: string): Promise<string> {
		const db = getDb();
		const passwordHash = await Bun.password.hash(password);

		const [user] = await db
			.insert(users)
			.values({
				username,
				passwordHash,
			})
			.returning({ id: users.id });
		if (!user) {
			throw new Error("Failed to create user");
		}

		return user.id;
	}

	async validateCredentials(
		username: string,
		password: string,
	): Promise<string | null> {
		const db = getDb();
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.username, username))
			.limit(1);

		if (!user) return null;

		const valid = await Bun.password.verify(password, user.passwordHash);
		return valid ? user.id : null;
	}

	async getById(id: string): Promise<Omit<User, "passwordHash"> | null> {
		const db = getDb();
		const [user] = await db
			.select({
				id: users.id,
				username: users.username,
				createdAt: users.createdAt,
			})
			.from(users)
			.where(eq(users.id, id))
			.limit(1);

		return user ?? null;
	}

	async usernameExists(username: string): Promise<boolean> {
		const db = getDb();
		const [user] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.username, username))
			.limit(1);

		return user !== undefined;
	}
}
