import { Hono } from "hono";
import { webhookAdapter } from "../lib/adapters";
import { env } from "../lib/env";
import { getUserId, requireSession } from "../middleware/session";

const webhookMappingApp = new Hono();

/** Generate the full GitHub webhook URL for a given webhook ID */
function getGitHubWebhookUrl(
	c: { req: { url: string } },
	webhookId: string,
): string {
	// Try to use RAILWAY_PUBLIC_DOMAIN if available, otherwise derive from request
	if (env.RAILWAY_PUBLIC_DOMAIN) {
		return `https://${env.RAILWAY_PUBLIC_DOMAIN}/webhook/github/${webhookId}`;
	}

	const url = new URL(c.req.url);
	return `${url.protocol}//${url.host}/webhook/github/${webhookId}`;
}

/** Redact a Discord webhook URL for safe display */
function redactDiscordUrl(url: string): string {
	return url.replace(/\/webhooks\/\d+\/.*$/, "/webhooks/***");
}

// POST /webhooks/mapping
// Create a new repo->Discord webhook mapping (owned by current user)
// Returns the generated GitHub webhook URL to configure in GitHub
webhookMappingApp.post("/mapping", requireSession, async (c) => {
	const userId = getUserId(c);
	const body = (await c.req.json()) as {
		repo?: string;
		webhookUrl?: string;
		secret?: string;
	};
	const { repo, webhookUrl, secret } = body;

	if (!repo || typeof repo !== "string") {
		return c.json({ error: "Missing or invalid 'repo' field" }, 400);
	}
	if (!webhookUrl || typeof webhookUrl !== "string") {
		return c.json({ error: "Missing or invalid 'webhookUrl' field" }, 400);
	}
	if (!secret || typeof secret !== "string") {
		return c.json(
			{ error: "Missing or invalid 'secret' field (GitHub webhook secret)" },
			400,
		);
	}

	// Basic validation that it looks like a Discord webhook URL
	if (!webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
		return c.json(
			{ error: "webhookUrl must be a valid Discord webhook URL" },
			400,
		);
	}

	// Check if mapping already exists
	const existing = await webhookAdapter.getByRepo(repo);
	if (existing) {
		return c.json({ error: `Mapping for repo '${repo}' already exists` }, 409);
	}

	const webhookId = await webhookAdapter.create(
		userId,
		repo,
		webhookUrl,
		secret,
	);
	const githubWebhookUrl = getGitHubWebhookUrl(c, webhookId);

	return c.json(
		{
			created: true,
			repo,
			id: webhookId,
			githubWebhookUrl,
		},
		201,
	);
});

// GET /webhooks/mapping
// List all webhook mappings owned by the current user (with redacted Discord URLs)
webhookMappingApp.get("/mapping", requireSession, async (c) => {
	const userId = getUserId(c);
	const mappings = await webhookAdapter.listByUser(userId);

	return c.json(
		mappings.map((m) => ({
			id: m.id,
			repo: m.repo,
			discordWebhookUrl: redactDiscordUrl(m.webhookUrl),
			githubWebhookUrl: getGitHubWebhookUrl(c, m.id),
		})),
	);
});

// GET /webhooks/mapping/*
// Get webhook info for a specific repo (must be owned by current user)
webhookMappingApp.get("/mapping/*", requireSession, async (c) => {
	const userId = getUserId(c);
	const repo = c.req.param("*");
	if (!repo) {
		return c.json({ error: "Missing repo parameter" }, 400);
	}

	const mapping = await webhookAdapter.getByRepo(repo);
	if (!mapping) {
		return c.json({ error: `No mapping found for repo '${repo}'` }, 404);
	}

	// Check ownership
	if (mapping.userId !== userId) {
		return c.json({ error: "Not authorized to view this mapping" }, 403);
	}

	return c.json({
		id: mapping.id,
		repo: mapping.repo,
		discordWebhookUrl: redactDiscordUrl(mapping.webhookUrl),
		githubWebhookUrl: getGitHubWebhookUrl(c, mapping.id),
	});
});

// DELETE /webhooks/mapping/*
// Remove a repo->webhook mapping (must be owned by current user)
webhookMappingApp.delete("/mapping/*", requireSession, async (c) => {
	const userId = getUserId(c);
	const repo = c.req.param("*");
	if (!repo) {
		return c.json({ error: "Missing repo parameter" }, 400);
	}

	// Check if mapping exists
	const mapping = await webhookAdapter.getByRepo(repo);
	if (!mapping) {
		return c.json({ error: `No mapping found for repo '${repo}'` }, 404);
	}

	// Check ownership
	if (mapping.userId !== userId) {
		return c.json({ error: "Not authorized to delete this mapping" }, 403);
	}

	const deleted = await webhookAdapter.delete(userId, repo);
	if (!deleted) {
		return c.json(
			{ error: `Failed to delete mapping for repo '${repo}'` },
			500,
		);
	}
	return c.json({ deleted: true, repo });
});

// PATCH /webhooks/mapping/*/secret
// Update the secret for a webhook mapping (must be owned by current user)
webhookMappingApp.patch("/mapping/*/secret", requireSession, async (c) => {
	const userId = getUserId(c);
	const repo = c.req.param("*");
	if (!repo) {
		return c.json({ error: "Missing repo parameter" }, 400);
	}

	const body = (await c.req.json()) as { secret?: string };
	const { secret } = body;

	if (!secret || typeof secret !== "string") {
		return c.json({ error: "Missing or invalid 'secret' field" }, 400);
	}

	// Check if mapping exists and user owns it
	const mapping = await webhookAdapter.getByRepo(repo);
	if (!mapping) {
		return c.json({ error: `No mapping found for repo '${repo}'` }, 404);
	}

	if (mapping.userId !== userId) {
		return c.json({ error: "Not authorized to update this mapping" }, 403);
	}

	const updated = await webhookAdapter.updateSecret(userId, repo, secret);
	if (!updated) {
		return c.json({ error: `Failed to update secret for repo '${repo}'` }, 500);
	}

	return c.json({ updated: true, repo });
});

export { webhookMappingApp };
