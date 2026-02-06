import { $ } from "bun";
import { Hono } from "hono";
import { inviteAdapter } from "./lib/adapters";
import { env } from "./lib/env";
import authApp from "./routes/auth";
import { githubWebhookApp } from "./routes/github-webhook";
import { pingSettingsApp } from "./routes/ping-settings";
import staticApp from "./routes/static";
import { testWebhookApp } from "./routes/test-webhook";
import { webhookMappingApp } from "./routes/webhook";

await $`bunx drizzle-kit migrate`;
console.log();

const app = new Hono();

// Health check endpoint
app.get("/health", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount feature-based routes
app.route("/", staticApp);
app.route("/auth", authApp);
app.route("/webhook", githubWebhookApp);
app.route("/webhooks", webhookMappingApp);
app.route("/ping-settings", pingSettingsApp);
app.route("/webhooks", testWebhookApp);

// Global error handler
app.onError((err, c) => {
	console.error("Server error:", err);
	return c.json({ error: "Internal Server Error" }, 500);
});

// Fallback for unmatched routes
app.notFound((c) => {
	return c.json({ error: "Not Found" }, 404);
});

// Start server
const server = Bun.serve({
	port: env.PORT,
	fetch: app.fetch,
});

console.log(`🚀 Server running at ${server.url}`);
if (env.REGISTRATION === "invite_only") {
	inviteAdapter.createFirst().then((code) => {
		if (code) {
			console.log(`🔑 First invite code: ${code}`);
		}
	});
}
