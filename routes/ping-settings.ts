import type { Context } from "hono";
import { Hono } from "hono";
import { EVENT_KEYS, type EventKey } from "../adapters";
import {
	githubDiscordUserAdapter,
	pingSettingsAdapter,
	webhookAdapter,
} from "../lib/adapters";
import { getUserId, requireSession } from "../middleware/session";

type Env = {
	Variables: {
		mappingId: string;
		userId: string;
	};
};

const pingSettingsApp = new Hono<Env>();

/** Middleware to verify mapping ownership */
async function requireMappingOwnership(
	c: Context<Env>,
	next: () => Promise<void>,
) {
	const userId = getUserId(c);
	const mappingId = c.req.param("mappingId");

	if (!mappingId) {
		return c.json({ error: "Missing mappingId parameter" }, 400);
	}

	const mapping = await webhookAdapter.getById(mappingId);
	if (!mapping) {
		return c.json({ error: "Webhook mapping not found" }, 404);
	}

	if (mapping.userId !== userId) {
		return c.json({ error: "Not authorized to access this mapping" }, 403);
	}

	c.set("mappingId", mappingId);
	await next();
}

// GET /ping-settings/:mappingId
pingSettingsApp.get(
	"/:mappingId",
	requireSession,
	requireMappingOwnership,
	async (c) => {
		const mappingId = c.get("mappingId");
		const settings = await pingSettingsAdapter.getForMapping(mappingId);
		return c.json(settings);
	},
);

// PUT /ping-settings/:mappingId
pingSettingsApp.put(
	"/:mappingId",
	requireSession,
	requireMappingOwnership,
	async (c) => {
		const mappingId = c.get("mappingId");
		const body = (await c.req.json()) as Record<string, boolean>;

		const validSettings: Partial<Record<EventKey, boolean>> = {};
		for (const [key, value] of Object.entries(body)) {
			if (EVENT_KEYS.includes(key as EventKey) && typeof value === "boolean") {
				validSettings[key as EventKey] = value;
			}
		}

		if (Object.keys(validSettings).length === 0) {
			return c.json({ error: "No valid event settings provided" }, 400);
		}

		await pingSettingsAdapter.bulkUpsert(mappingId, validSettings);
		const updated = await pingSettingsAdapter.getForMapping(mappingId);
		return c.json(updated);
	},
);

// GET /ping-settings/:mappingId/discord-users
pingSettingsApp.get(
	"/:mappingId/discord-users",
	requireSession,
	requireMappingOwnership,
	async (c) => {
		const mappingId = c.get("mappingId");
		const users =
			await githubDiscordUserAdapter.listByWebhookMapping(mappingId);
		return c.json(users);
	},
);

// POST /ping-settings/:mappingId/discord-users
pingSettingsApp.post(
	"/:mappingId/discord-users",
	requireSession,
	requireMappingOwnership,
	async (c) => {
		const mappingId = c.get("mappingId");
		const body = (await c.req.json()) as {
			githubUsername?: string;
			discordUserId?: string;
		};

		const { githubUsername, discordUserId } = body;

		if (!githubUsername || typeof githubUsername !== "string") {
			return c.json(
				{ error: "Missing or invalid 'githubUsername' field" },
				400,
			);
		}
		if (!discordUserId || typeof discordUserId !== "string") {
			return c.json({ error: "Missing or invalid 'discordUserId' field" }, 400);
		}

		const existing = await githubDiscordUserAdapter.getByGithubUsername(
			mappingId,
			githubUsername,
		);
		if (existing) {
			return c.json(
				{
					error: `Mapping for GitHub user '${githubUsername}' already exists`,
				},
				409,
			);
		}

		const created = await githubDiscordUserAdapter.create(
			mappingId,
			githubUsername,
			discordUserId,
		);
		return c.json(created, 201);
	},
);

// DELETE /ping-settings/:mappingId/discord-users/:id
pingSettingsApp.delete(
	"/:mappingId/discord-users/:id",
	requireSession,
	requireMappingOwnership,
	async (c) => {
		const userMappingId = c.req.param("id");
		if (!userMappingId) {
			return c.json({ error: "Missing id parameter" }, 400);
		}

		const deleted = await githubDiscordUserAdapter.delete(userMappingId);
		if (!deleted) {
			return c.json({ error: "User mapping not found" }, 404);
		}
		return c.json({ deleted: true });
	},
);

export { pingSettingsApp };
