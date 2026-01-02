import type { Context } from "hono";
import { authAdapter } from "../lib/adapters";

/** Extract Bearer token from Authorization header */
function extractBearerToken(req: Request): string | null {
	const authHeader = req.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) return null;
	return authHeader.slice(7);
}

/** Middleware to validate Bearer token authentication */
export async function requireBearerAuth(c: Context, next: () => Promise<void>) {
	const token = extractBearerToken(c.req.raw);
	console.log("token", token);
	if (!token || !(await authAdapter.validate(token))) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	await next();
}
