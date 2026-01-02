import { and, eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { webhookMappings } from "../schemas/db";

export interface WebhookMapping {
	id: string;
	userId: string;
	repo: string;
	webhookUrl: string;
	secret: string;
}

export interface WebhookMappingWithoutSecret {
	id: string;
	userId: string;
	repo: string;
	webhookUrl: string;
}

/**
 * Abstract webhook mapping adapter interface
 * Maps GitHub repo full names (owner/repo) to Discord webhook URLs and secrets
 * All modification operations require user ownership
 */
export abstract class WebhookMappingAdapter {
	/** Create a repo->webhook mapping with secret, returns the webhook ID */
	abstract create(
		userId: string,
		repo: string,
		webhookUrl: string,
		secret: string,
	): Promise<string>;

	/** Get webhook data by ID (includes secret for signature verification) */
	abstract getById(id: string): Promise<WebhookMapping | undefined>;

	/** Get webhook data by repo name (without secret) */
	abstract getByRepo(
		repo: string,
	): Promise<WebhookMappingWithoutSecret | undefined>;

	/** Delete a mapping by repo, requires ownership. Returns true if deleted, false if not found or not owned */
	abstract delete(userId: string, repo: string): Promise<boolean>;

	/** Update the secret for a repo, requires ownership. Returns true if updated, false if not found or not owned */
	abstract updateSecret(
		userId: string,
		repo: string,
		secret: string,
	): Promise<boolean>;

	/** Update webhook URL and/or secret for a repo, requires ownership. Returns true if updated */
	abstract update(
		userId: string,
		repo: string,
		webhookUrl: string,
		secret: string,
	): Promise<boolean>;

	/** List all mappings for a specific user (without secrets) */
	abstract listByUser(userId: string): Promise<WebhookMappingWithoutSecret[]>;

	/** Check if user owns a mapping for a repo */
	abstract isOwner(userId: string, repo: string): Promise<boolean>;
}

/**
 * Database-backed webhook mapping adapter
 */
export class DatabaseWebhookMappingAdapter extends WebhookMappingAdapter {
	async create(
		userId: string,
		repo: string,
		webhookUrl: string,
		secret: string,
	): Promise<string> {
		const db = getDb();
		const [result] = await db
			.insert(webhookMappings)
			.values({ userId, repo, webhookUrl, secret })
			.returning({ id: webhookMappings.id });

		if (!result) {
			throw new Error("Failed to create webhook mapping");
		}
		return result.id;
	}

	async getById(id: string): Promise<WebhookMapping | undefined> {
		const db = getDb();
		const [mapping] = await db
			.select()
			.from(webhookMappings)
			.where(eq(webhookMappings.id, id))
			.limit(1);

		if (!mapping) return undefined;
		return {
			id: mapping.id,
			userId: mapping.userId,
			repo: mapping.repo,
			webhookUrl: mapping.webhookUrl,
			secret: mapping.secret,
		};
	}

	async getByRepo(
		repo: string,
	): Promise<WebhookMappingWithoutSecret | undefined> {
		const db = getDb();
		const [mapping] = await db
			.select({
				id: webhookMappings.id,
				userId: webhookMappings.userId,
				repo: webhookMappings.repo,
				webhookUrl: webhookMappings.webhookUrl,
			})
			.from(webhookMappings)
			.where(eq(webhookMappings.repo, repo))
			.limit(1);

		return mapping;
	}

	async delete(userId: string, repo: string): Promise<boolean> {
		const db = getDb();
		const result = await db
			.delete(webhookMappings)
			.where(
				and(eq(webhookMappings.repo, repo), eq(webhookMappings.userId, userId)),
			)
			.returning();
		return result.length > 0;
	}

	async updateSecret(
		userId: string,
		repo: string,
		secret: string,
	): Promise<boolean> {
		const db = getDb();
		const result = await db
			.update(webhookMappings)
			.set({ secret })
			.where(
				and(eq(webhookMappings.repo, repo), eq(webhookMappings.userId, userId)),
			)
			.returning();
		return result.length > 0;
	}

	async update(
		userId: string,
		repo: string,
		webhookUrl: string,
		secret: string,
	): Promise<boolean> {
		const db = getDb();
		const result = await db
			.update(webhookMappings)
			.set({ webhookUrl, secret })
			.where(
				and(eq(webhookMappings.repo, repo), eq(webhookMappings.userId, userId)),
			)
			.returning();
		return result.length > 0;
	}

	async listByUser(userId: string): Promise<WebhookMappingWithoutSecret[]> {
		const db = getDb();
		return db
			.select({
				id: webhookMappings.id,
				userId: webhookMappings.userId,
				repo: webhookMappings.repo,
				webhookUrl: webhookMappings.webhookUrl,
			})
			.from(webhookMappings)
			.where(eq(webhookMappings.userId, userId));
	}

	async isOwner(userId: string, repo: string): Promise<boolean> {
		const db = getDb();
		const [mapping] = await db
			.select({ id: webhookMappings.id })
			.from(webhookMappings)
			.where(
				and(eq(webhookMappings.repo, repo), eq(webhookMappings.userId, userId)),
			)
			.limit(1);
		return mapping !== undefined;
	}
}
