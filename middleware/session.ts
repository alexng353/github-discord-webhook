import type { Context } from "hono";
import { sessionAdapter } from "../lib/adapters";
import { clearSessionCookie, getSessionCookie } from "../lib/session";

/** Middleware to validate session and set userId in context */
export async function requireSession(c: Context, next: () => Promise<void>) {
	const sessionId = getSessionCookie(c.req.raw);
	if (!sessionId) {
		return c.json({ error: "Not authenticated" }, 401);
	}

	const userId = await sessionAdapter.validate(sessionId);
	if (!userId) {
		return c.json({ error: "Session expired" }, 401, {
			"Set-Cookie": clearSessionCookie(),
		});
	}

	c.set("userId", userId);
	await next();
}

/** Middleware to validate session and redirect to / if not authenticated (for HTML routes) */
export async function requireSessionRedirect(
	c: Context,
	next: () => Promise<void>,
) {
	const sessionId = getSessionCookie(c.req.raw);
	if (!sessionId) {
		return c.redirect("/");
	}

	const userId = await sessionAdapter.validate(sessionId);
	if (!userId) {
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/",
				"Set-Cookie": clearSessionCookie(),
			},
		});
	}

	c.set("userId", userId);
	await next();
}

/** Helper to get userId from context (use after requireSession middleware) */
export function getUserId(c: Context): string {
	const userId = c.get("userId");
	if (!userId) {
		throw new Error(
			"userId not set in context - ensure requireSession middleware is used",
		);
	}
	return userId;
}
