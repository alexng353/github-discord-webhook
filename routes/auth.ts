import { Hono } from "hono";
import {
	authAdapter,
	inviteAdapter,
	sessionAdapter,
	userAdapter,
} from "../lib/adapters";
import { env } from "../lib/env";
import {
	clearSessionCookie,
	createSessionCookie,
	getSessionCookie,
} from "../lib/session";
import { getUserId, requireSession } from "../middleware/session";

const authApp = new Hono();

// POST /auth/tokens
// Create a new Bearer token for webhook authentication
authApp.post("/tokens", requireSession, async (c) => {
	const token = await authAdapter.create();
	return c.json({ token }, 201);
});

// DELETE /auth/tokens/:token
// Revoke an existing Bearer token
authApp.delete("/tokens/:token", requireSession, async (c) => {
	const token = c.req.param("token");
	const revoked = await authAdapter.revoke(token);
	if (!revoked) {
		return c.json({ error: "Token not found" }, 404);
	}
	return c.json({ revoked: true });
});

// GET /auth/registration-mode
// Get the current registration mode
authApp.get("/registration-mode", (c) => {
	return c.json({ mode: env.REGISTRATION });
});

// POST /auth/register
// Create a new user account
authApp.post("/register", async (c) => {
	// Check registration mode
	if (env.REGISTRATION === "closed") {
		return c.json({ error: "Registration is currently closed" }, 403);
	}

	const body = (await c.req.json()) as {
		username?: string;
		password?: string;
		inviteCode?: string;
	};
	const { username, password, inviteCode } = body;

	// Validate invite code if required
	if (env.REGISTRATION === "invite_only") {
		if (!inviteCode) {
			return c.json({ error: "Invite code required" }, 400);
		}
		if (!(await inviteAdapter.isValid(inviteCode))) {
			return c.json({ error: "Invalid or expired invite code" }, 400);
		}
	}

	if (!username || typeof username !== "string" || username.length < 3) {
		return c.json({ error: "Username must be at least 3 characters" }, 400);
	}
	if (!password || typeof password !== "string" || password.length < 8) {
		return c.json({ error: "Password must be at least 8 characters" }, 400);
	}

	if (await userAdapter.usernameExists(username)) {
		return c.json({ error: "Username already exists" }, 409);
	}

	const userId = await userAdapter.create(username, password);

	// Consume invite code after successful registration
	if (env.REGISTRATION === "invite_only" && inviteCode) {
		await inviteAdapter.consume(inviteCode, userId);
	}

	return c.json({ userId, username }, 201);
});

// POST /auth/login
// Login with username/password, returns session cookie
authApp.post("/login", async (c) => {
	const body = (await c.req.json()) as {
		username?: string;
		password?: string;
	};
	const { username, password } = body;

	if (!username || !password) {
		return c.json({ error: "Username and password required" }, 400);
	}

	const userId = await userAdapter.validateCredentials(username, password);
	if (!userId) {
		return c.json({ error: "Invalid username or password" }, 401);
	}

	// Create session (7 days TTL)
	const ttlSeconds = 7 * 24 * 60 * 60;
	const sessionId = await sessionAdapter.create(userId, ttlSeconds);

	return c.json({ success: true, userId }, 200, {
		"Set-Cookie": createSessionCookie(sessionId, ttlSeconds),
	});
});

// POST /auth/logout
// Logout current session, clears session cookie
authApp.post("/logout", async (c) => {
	const sessionId = getSessionCookie(c.req.raw);
	if (sessionId) {
		await sessionAdapter.destroy(sessionId);
	}

	return c.json({ success: true }, 200, {
		"Set-Cookie": clearSessionCookie(),
	});
});

// GET /auth/me
// Get current authenticated user info
authApp.get("/me", requireSession, async (c) => {
	const userId = getUserId(c);
	const user = await userAdapter.getById(userId);
	if (!user) {
		return c.json({ error: "User not found" }, 404);
	}

	return c.json({
		id: user.id,
		username: user.username,
		createdAt: user.createdAt,
	});
});

// POST /auth/invites
// Create a new invite code (requires session, only when invite_only mode)
authApp.post("/invites", requireSession, async (c) => {
	if (env.REGISTRATION !== "invite_only") {
		return c.json(
			{ error: "Invite codes are only available in invite_only mode" },
			400,
		);
	}

	const userId = getUserId(c);
	const code = await inviteAdapter.create(userId);
	return c.json({ code }, 201);
});

// GET /auth/invites
// List invite codes created by current user
authApp.get("/invites", requireSession, async (c) => {
	const userId = getUserId(c);
	const invites = await inviteAdapter.listByUser(userId);
	return c.json({
		invites: invites.map((inv) => ({
			code: inv.code,
			createdAt: inv.createdAt,
			used: inv.usedBy !== null,
			usedAt: inv.usedAt,
		})),
	});
});

// DELETE /auth/invites/:code
// Revoke an unused invite code (only by creator)
authApp.delete("/invites/:code", requireSession, async (c) => {
	const userId = getUserId(c);
	const code = c.req.param("code");
	const revoked = await inviteAdapter.revoke(code, userId);

	if (!revoked) {
		return c.json(
			{ error: "Invite code not found, already used, or not owned by you" },
			404,
		);
	}

	return c.json({ revoked: true, code });
});

export default authApp;
