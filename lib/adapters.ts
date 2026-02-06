import {
	type AuthAdapter,
	DatabaseAuthAdapter,
	DatabaseGitHubDiscordUserAdapter,
	DatabaseInviteAdapter,
	DatabasePingSettingsAdapter,
	DatabaseSessionAdapter,
	DatabaseUserAdapter,
	DatabaseWebhookMappingAdapter,
	type GitHubDiscordUserAdapter,
	type InviteAdapter,
	type PingSettingsAdapter,
	type SessionAdapter,
	type UserAdapter,
	type WebhookMappingAdapter,
} from "../adapters";

// =============================================================================
// ADAPTER COMPOSITION
// Database-backed adapters only
// =============================================================================

export const authAdapter: AuthAdapter = new DatabaseAuthAdapter();

export const webhookAdapter: WebhookMappingAdapter =
	new DatabaseWebhookMappingAdapter();

export const userAdapter: UserAdapter = new DatabaseUserAdapter();

export const sessionAdapter: SessionAdapter = new DatabaseSessionAdapter();

export const inviteAdapter: InviteAdapter = new DatabaseInviteAdapter();

export const githubDiscordUserAdapter: GitHubDiscordUserAdapter =
	new DatabaseGitHubDiscordUserAdapter();

export const pingSettingsAdapter: PingSettingsAdapter =
	new DatabasePingSettingsAdapter();
