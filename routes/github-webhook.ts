import { Hono } from "hono";
import { colors } from "../lib/colors";
import { type DiscordEmbed, sendDiscordEmbed } from "../lib/discord";
import { filterBody } from "../lib/filterBody";
import { verifyGitHubSignature } from "../middleware/github-signature";
import {
	type GithubWebhookPayload,
	githubWebhookSchema,
} from "../schemas/github";

const githubWebhookApp = new Hono();

// Type helpers for discriminated union
type OpenPayload = Extract<GithubWebhookPayload, { action: "opened" }>;
type ClosedPayload = Extract<GithubWebhookPayload, { action: "closed" }>;
type ConvertedToDraftPayload = Extract<
	GithubWebhookPayload,
	{ action: "converted_to_draft" }
>;
type ReadyForReviewPayload = Extract<
	GithubWebhookPayload,
	{ action: "ready_for_review" }
>;

// Callback for "opened" action - returns DiscordEmbed
function handleOpened(payload: OpenPayload): DiscordEmbed {
	const pr = payload.pull_request;
	const repoFullName = payload.repository?.full_name ?? "Unknown";
	const isDraft = pr.draft ?? false;

	return {
		title: `[${payload.repository.name}]: ${isDraft ? "Draft " : ""}PR #${pr?.number} Opened: ${pr?.title ?? "Unknown"}`,
		description: pr?.body ? filterBody(pr.body) : "No description",
		url: pr?.html_url,
		color: isDraft ? colors.gray : colors.green,
		footer: { text: repoFullName },
		timestamp: new Date().toISOString(),
		author: {
			name: pr.user.login,
			url: pr.user.url,
			icon_url: pr.user.avatar_url,
		},
		fields: [
			{
				name: "Author",
				value: pr.user.login,
				inline: false,
			},
		],
	};
}

// Callback for "closed" action - returns DiscordEmbed
function handleClosed(payload: ClosedPayload): DiscordEmbed {
	const pr = payload.pull_request;
	const repoFullName = payload.repository.full_name ?? "Unknown";
	const isMerged = pr.merged ?? false;

	return {
		title: `[${payload.repository.name}]: PR #${pr?.number} ${isMerged ? "Merged" : "Closed"}: ${pr?.title ?? "Unknown"}`,
		description: pr?.body ? filterBody(pr.body) : "No description",
		author: {
			name: pr.user.login,
			url: pr.user.url,
			icon_url: pr.user.avatar_url,
		},
		url: pr?.html_url,
		color: isMerged ? colors.purple : colors.red,
		footer: { text: repoFullName },
		timestamp: pr?.closed_at?.toISOString() ?? new Date().toISOString(),
		fields: [
			{
				name: "Author",
				value: pr.user.login,
				inline: false,
			},
			...(isMerged && pr.merge_commit_sha
				? [
						{
							name: "Merged By",
							value: pr.merged_by?.login ?? "unknown",
							inline: true,
						},
						{
							name: "Merge Commit",
							value: pr.merge_commit_sha.substring(0, 7),
							inline: true,
						},
					]
				: []),
		],
	};
}

// Callback for "converted_to_draft" action - returns DiscordEmbed
function handleConvertedToDraft(
	payload: ConvertedToDraftPayload,
): DiscordEmbed {
	const pr = payload.pull_request;
	const repoFullName = payload.repository?.full_name ?? "Unknown";

	return {
		title: `[${payload.repository.name}]: PR #${pr?.number} Converted to Draft: ${pr?.title ?? "Unknown"}`,
		description: pr?.body ? filterBody(pr.body) : "No description",
		url: pr?.html_url,
		color: colors.gray,
		footer: { text: repoFullName },
		timestamp: new Date().toISOString(),
		author: {
			name: pr.user.login,
			url: pr.user.url,
			icon_url: pr.user.avatar_url,
		},
		fields: [
			{
				name: "Author",
				value: pr.user.login,
				inline: false,
			},
		],
	};
}

// Callback for "ready_for_review" action - returns DiscordEmbed
function handleReadyForReview(payload: ReadyForReviewPayload): DiscordEmbed {
	const pr = payload.pull_request;
	const repoFullName = payload.repository?.full_name ?? "Unknown";

	return {
		title: `[${payload.repository.name}]: PR #${pr?.number} Ready for Review: ${pr?.title ?? "Unknown"}`,
		description: pr?.body ? filterBody(pr.body) : "No description",
		url: pr?.html_url,
		color: colors.green,
		footer: { text: repoFullName },
		timestamp: new Date().toISOString(),
		author: {
			name: pr.user.login,
			url: pr.user.url,
			icon_url: pr.user.avatar_url,
		},
		fields: [
			{
				name: "Author",
				value: pr.user.login,
				inline: false,
			},
		],
	};
}

// POST /webhook/github/:id
// Main GitHub webhook receiver endpoint
// Each webhook mapping gets a unique URL with its ID
// Uses X-Hub-Signature-256 HMAC verification for authentication
githubWebhookApp.post("/github/:id", async (c) => {
	const webhookId = c.req.param("id");

	// Parse GitHub event type
	const eventType = c.req.header("X-GitHub-Event");
	if (!eventType) {
		return c.json({ error: "Missing X-GitHub-Event header" }, 400);
	}

	// Verify GitHub signature and get webhook data
	const rawBody = await c.req.text();
	const signature = c.req.header("X-Hub-Signature-256");
	const verifyResult = await verifyGitHubSignature(
		webhookId,
		rawBody,
		signature,
	);

	if (!verifyResult.success) {
		return c.json({ error: verifyResult.error }, verifyResult.status);
	}

	const { body, webhookUrl, repo } = verifyResult.data;

	// Only handle pull_request events for now
	if (eventType !== "pull_request") {
		return c.json({
			ignored: true,
			reason: `Event type '${eventType}' not handled`,
		});
	}

	const {
		success,
		data: parsedBody,
		error,
	} = githubWebhookSchema.safeParse(body);
	if (!success) {
		console.error("Invalid payload", error);
		return c.json({ error: "Invalid payload" }, 400);
	}

	// Use discriminated union to call appropriate callback
	let embed: DiscordEmbed;

	switch (parsedBody.action) {
		case "opened":
			embed = handleOpened(parsedBody);
			break;
		case "closed":
			embed = handleClosed(parsedBody);
			break;
		case "converted_to_draft":
			embed = handleConvertedToDraft(parsedBody);
			break;
		case "ready_for_review":
			embed = handleReadyForReview(parsedBody);
			break;
		case "synchronize":
			return c.json({
				ignored: true,
				reason: `Event type '${eventType}:synchronize' not handled`,
			});
		case "edited":
			return c.json({
				ignored: true,
				reason: `Event type '${eventType}:edited' not handled`,
			});
	}

	const result = await sendDiscordEmbed(webhookUrl, embed);

	if (!result.ok) {
		return c.json(
			{ error: "Failed to send Discord notification", status: result.status },
			502,
		);
	}

	return c.json({
		sent: true,
		event: eventType,
		action: parsedBody.action,
		repo,
	});
});

export { githubWebhookApp };
