import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../lib/db";
import { inviteCodes } from "../schemas/db";

/**
 * Invite code data structure
 */
export interface InviteCode {
	code: string;
	createdBy: string; // userId
	createdAt: Date;
	usedBy: string | null; // userId who used it, null if unused
	usedAt: Date | null;
}

/**
 * Abstract invite code adapter interface
 */
export abstract class InviteAdapter {
	abstract createFirst(): Promise<string | null>;
	/** Create a new invite code, returns the code */
	abstract create(createdBy: string): Promise<string>;

	/** Validate and consume an invite code, returns true if valid and now consumed */
	abstract consume(code: string, usedBy: string): Promise<boolean>;

	/** Check if a code is valid (exists and unused) without consuming it */
	abstract isValid(code: string): Promise<boolean>;

	/** Get invite code details */
	abstract get(code: string): Promise<InviteCode | null>;

	/** List all invite codes created by a user */
	abstract listByUser(userId: string): Promise<InviteCode[]>;

	/** Revoke an unused invite code (only by creator) */
	abstract revoke(code: string, userId: string): Promise<boolean>;
}

/**
 * Database-backed invite code adapter
 */
export class DatabaseInviteAdapter extends InviteAdapter {
	async createFirst(): Promise<string | null> {
		const db = getDb();
		const existing = await db.select().from(inviteCodes).limit(1);

		if (existing.length > 0) {
			return null;
		}

		return this.create("system");
	}

	async create(createdBy: string): Promise<string> {
		const db = getDb();
		// Generate a short, readable code
		const code = Math.random().toString(36).substring(2);

		await db.insert(inviteCodes).values({
			code,
			createdBy: createdBy === "system" ? null : createdBy,
			createdAt: new Date(),
			usedBy: null,
			usedAt: null,
		});

		return code;
	}

	async consume(code: string, usedBy: string): Promise<boolean> {
		const db = getDb();
		const now = new Date();

		const result = await db
			.update(inviteCodes)
			.set({
				usedBy,
				usedAt: now,
			})
			.where(and(eq(inviteCodes.code, code), isNull(inviteCodes.usedBy)))
			.returning();

		return result.length > 0;
	}

	async isValid(code: string): Promise<boolean> {
		const db = getDb();
		const [invite] = await db
			.select()
			.from(inviteCodes)
			.where(and(eq(inviteCodes.code, code), isNull(inviteCodes.usedBy)))
			.limit(1);

		return invite !== undefined;
	}

	async get(code: string): Promise<InviteCode | null> {
		const db = getDb();
		const [invite] = await db
			.select()
			.from(inviteCodes)
			.where(eq(inviteCodes.code, code))
			.limit(1);

		if (!invite) return null;

		return {
			code: invite.code,
			createdBy: invite.createdBy ?? "system",
			createdAt: invite.createdAt,
			usedBy: invite.usedBy ?? null,
			usedAt: invite.usedAt ?? null,
		};
	}

	async listByUser(userId: string): Promise<InviteCode[]> {
		const db = getDb();
		const invites = await db
			.select()
			.from(inviteCodes)
			.where(eq(inviteCodes.createdBy, userId));

		return invites.map((invite) => ({
			code: invite.code,
			createdBy: invite.createdBy ?? "system",
			createdAt: invite.createdAt,
			usedBy: invite.usedBy ?? null,
			usedAt: invite.usedAt ?? null,
		}));
	}

	async revoke(code: string, userId: string): Promise<boolean> {
		const db = getDb();
		const result = await db
			.delete(inviteCodes)
			.where(
				and(
					eq(inviteCodes.code, code),
					eq(inviteCodes.createdBy, userId),
					isNull(inviteCodes.usedBy),
				),
			)
			.returning();

		return result.length > 0;
	}
}
