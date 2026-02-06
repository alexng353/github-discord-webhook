import type { Context } from "hono";
import { authAdapter } from "../lib/adapters";
import { logger } from "../lib/logger";

/** Extract Bearer token from Authorization header */
function extractBearerToken(req: Request): string | null {
	const authHeader = req.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) return null;
	return authHeader.slice(7);
}

/** Middleware to validate Bearer token authentication */
export async function requireBearerAuth(c: Context, next: () => Promise<void>) {
	const token = extractBearerToken(c.req.raw);
	if (!token || !(await authAdapter.validate(token))) {
		logger.warn({ path: c.req.path }, "Unauthorized request");
		return c.json({ error: "Unauthorized" }, 401);
	}
	await next();
}
