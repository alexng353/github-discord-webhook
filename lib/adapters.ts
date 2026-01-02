import {
	type AuthAdapter,
	DatabaseAuthAdapter,
	DatabaseInviteAdapter,
	DatabaseSessionAdapter,
	DatabaseUserAdapter,
	DatabaseWebhookMappingAdapter,
	type InviteAdapter,
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
