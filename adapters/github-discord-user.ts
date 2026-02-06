import { and, eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { githubDiscordUsers } from "../schemas/db";

export interface GitHubDiscordUser {
	id: string;
	webhookMappingId: string;
	githubUsername: string;
	discordUserId: string;
	userId: string | null;
	createdAt: Date;
}

export abstract class GitHubDiscordUserAdapter {
	abstract create(
		webhookMappingId: string,
		githubUsername: string,
		discordUserId: string,
		userId?: string,
	): Promise<GitHubDiscordUser>;

	abstract getByGithubUsername(
		webhookMappingId: string,
		username: string,
	): Promise<GitHubDiscordUser | undefined>;

	abstract listByWebhookMapping(
		webhookMappingId: string,
	): Promise<GitHubDiscordUser[]>;

	abstract delete(id: string): Promise<boolean>;

	abstract update(
		id: string,
		githubUsername: string,
		discordUserId: string,
	): Promise<boolean>;
}

export class DatabaseGitHubDiscordUserAdapter extends GitHubDiscordUserAdapter {
	async create(
		webhookMappingId: string,
		githubUsername: string,
		discordUserId: string,
		userId?: string,
	): Promise<GitHubDiscordUser> {
		const db = getDb();
		const [result] = await db
			.insert(githubDiscordUsers)
			.values({ webhookMappingId, githubUsername, discordUserId, userId })
			.returning();

		if (!result) {
			throw new Error("Failed to create GitHub-Discord user mapping");
		}
		return result;
	}

	async getByGithubUsername(
		webhookMappingId: string,
		username: string,
	): Promise<GitHubDiscordUser | undefined> {
		const db = getDb();
		const [result] = await db
			.select()
			.from(githubDiscordUsers)
			.where(
				and(
					eq(githubDiscordUsers.webhookMappingId, webhookMappingId),
					eq(githubDiscordUsers.githubUsername, username),
				),
			)
			.limit(1);

		return result;
	}

	async listByWebhookMapping(
		webhookMappingId: string,
	): Promise<GitHubDiscordUser[]> {
		const db = getDb();
		return db
			.select()
			.from(githubDiscordUsers)
			.where(eq(githubDiscordUsers.webhookMappingId, webhookMappingId));
	}

	async delete(id: string): Promise<boolean> {
		const db = getDb();
		const result = await db
			.delete(githubDiscordUsers)
			.where(eq(githubDiscordUsers.id, id))
			.returning();
		return result.length > 0;
	}

	async update(
		id: string,
		githubUsername: string,
		discordUserId: string,
	): Promise<boolean> {
		const db = getDb();
		const result = await db
			.update(githubDiscordUsers)
			.set({ githubUsername, discordUserId })
			.where(eq(githubDiscordUsers.id, id))
			.returning();
		return result.length > 0;
	}
}
