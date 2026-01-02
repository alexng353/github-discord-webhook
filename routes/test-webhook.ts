import { Hono } from "hono";
import { type DiscordEmbed, sendDiscordEmbed } from "../lib/discord";
import { requireSession } from "../middleware/session";

const testWebhookApp = new Hono();

// POST /webhooks/test
// Test endpoint to send a Discord embed with custom data
testWebhookApp.post("/test", requireSession, async (c) => {
	const body = (await c.req.json()) as {
		webhookUrl?: string;
		embed?: DiscordEmbed;
	};

	const { webhookUrl, embed } = body;

	if (!webhookUrl || typeof webhookUrl !== "string") {
		return c.json({ error: "Missing or invalid 'webhookUrl' field" }, 400);
	}

	if (!embed) {
		return c.json({ error: "Missing 'embed' field" }, 400);
	}

	// Basic validation that it looks like a Discord webhook URL
	if (!webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
		return c.json(
			{ error: "webhookUrl must be a valid Discord webhook URL" },
			400,
		);
	}

	// Validate embed has at least one field
	if (!embed.title && !embed.description && !embed.fields?.length) {
		return c.json(
			{ error: "Embed must have at least title, description, or fields" },
			400,
		);
	}

	const result = await sendDiscordEmbed(webhookUrl, embed);

	if (!result.ok) {
		return c.json(
			{
				error: "Failed to send Discord notification",
				status: result.status,
			},
			502,
		);
	}

	return c.json({ sent: true, status: result.status });
});

export { testWebhookApp };
