import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { requireSessionRedirect } from "../middleware/session";

const staticApp = new Hono();

// GET /
// Serve index.html
staticApp.get("/", (c) => {
	const file = Bun.file("www/index.html");
	return c.body(file.stream(), undefined, {
		"Content-Type": file.type || "text/html",
	});
});

// GET /dashboard.html
// Serve dashboard.html (requires authentication)
staticApp.get("/dashboard.html", requireSessionRedirect, async (c) => {
	const file = Bun.file("www/dashboard.html");
	return c.body(file.stream(), undefined, {
		"Content-Type": file.type || "text/html",
	});
});

// GET /test-webhook.html
// Serve test-webhook.html (requires authentication)
staticApp.get("/test-webhook.html", requireSessionRedirect, async (c) => {
	const file = Bun.file("www/test-webhook.html");
	return c.body(file.stream(), undefined, {
		"Content-Type": file.type || "text/html",
	});
});

// serve the assets folder
staticApp.get("/assets/*", serveStatic({ root: "./assets" }));

export default staticApp;
