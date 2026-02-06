import { webhookAdapter } from "../lib/adapters";

export interface GitHubWebhookData {
	body: unknown;
	webhookUrl: string;
	repo: string;
	webhookMappingId: string;
}

export type GitHubSignatureResult =
	| { success: true; data: GitHubWebhookData }
	| { success: false; error: string; status: 400 | 401 | 404 };

/**
 * Verify GitHub webhook signature using HMAC-SHA256
 * GitHub sends the signature in the X-Hub-Signature-256 header
 * Format: sha256=<hex_digest>
 */
async function verifySignature(
	secret: string,
	payload: string,
	signature: string,
): Promise<boolean> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signatureBytes = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(payload),
	);

	const expectedSignature = `sha256=${Array.from(new Uint8Array(signatureBytes))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")}`;

	// Use timing-safe comparison to prevent timing attacks
	if (signature.length !== expectedSignature.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < signature.length; i++) {
		result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
	}
	return result === 0;
}

/**
 * Verify GitHub webhook signature using the webhook ID to look up the secret
 * This is more secure than parsing the payload first
 */
export async function verifyGitHubSignature(
	webhookId: string,
	rawBody: string,
	signature: string | undefined,
): Promise<GitHubSignatureResult> {
	// Look up the webhook by ID first (before parsing untrusted payload)
	const webhookData = await webhookAdapter.getById(webhookId);
	if (!webhookData) {
		return {
			success: false,
			error: "Webhook not found",
			status: 404,
		};
	}

	if (!signature) {
		return {
			success: false,
			error: "Missing X-Hub-Signature-256 header",
			status: 401,
		};
	}

	// Verify the signature before parsing the body
	const isValid = await verifySignature(webhookData.secret, rawBody, signature);
	if (!isValid) {
		return { success: false, error: "Invalid signature", status: 401 };
	}

	// Now parse the verified body
	let body: unknown;
	try {
		body = JSON.parse(rawBody);
	} catch {
		return { success: false, error: "Invalid JSON payload", status: 400 };
	}

	return {
		success: true,
		data: {
			body,
			webhookUrl: webhookData.webhookUrl,
			repo: webhookData.repo,
			webhookMappingId: webhookData.id,
		},
	};
}
