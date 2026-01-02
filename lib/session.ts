import { env } from "./env";

export const SESSION_COOKIE_NAME =
	env.NODE_ENV === "production" ? "__Secure-ghdw-session" : "ghdw-session-dev";

/** Extract session ID from cookie */
export function getSessionCookie(req: Request): string | null {
	const cookieHeader = req.headers.get("Cookie");
	if (!cookieHeader) return null;

	const cookies = Object.fromEntries(
		cookieHeader.split(";").map((c) => {
			const [key, ...val] = c.trim().split("=");
			return [key, val.join("=")];
		}),
	);

	return cookies[SESSION_COOKIE_NAME] || null;
}

/** Create a Set-Cookie header for the session */
export function createSessionCookie(
	sessionId: string,
	maxAgeSecs: number,
): string {
	const secure = env.NODE_ENV === "production" ? "; Secure" : "";
	return `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSecs}${secure}`;
}

/** Create a Set-Cookie header to clear the session */
export function clearSessionCookie(): string {
	const secure = env.NODE_ENV === "production" ? "; Secure" : "";
	return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}
