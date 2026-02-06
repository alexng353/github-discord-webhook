import { Hono } from "hono";
import type { EventKey } from "../adapters";
import { githubDiscordUserAdapter, pingSettingsAdapter } from "../lib/adapters";
import { colors } from "../lib/colors";
import { type DiscordEmbed, sendDiscordEmbed } from "../lib/discord";
import { filterBody } from "../lib/filterBody";
import { verifyGitHubSignature } from "../middleware/github-signature";
import {
	type GithubWebhookPayload,
	githubWebhookSchema,
	type PullRequestReviewPayload,
	pullRequestReviewSchema,
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
type ReviewSubmittedPayload = Extract<
	PullRequestReviewPayload,
	{ action: "submitted" }
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

// Callback for pull_request_review "submitted" action - returns DiscordEmbed
function handleReviewSubmitted(payload: ReviewSubmittedPayload): DiscordEmbed {
	const review = payload.review;
	const pr = payload.pull_request;
	const repoFullName = payload.repository?.full_name ?? "Unknown";

	const stateLabels: Record<typeof review.state, string> = {
		approved: "Approved",
		changes_requested: "Changes Requested",
		commented: "Commented",
	};

	const stateColors: Record<typeof review.state, number> = {
		approved: 0x238636, // green
		changes_requested: 0xd29922, // yellow/orange
		commented: 0x6e7681, // gray
	};

	return {
		title: `[${payload.repository.name}]: PR #${pr.number} Review: ${stateLabels[review.state]}`,
		description: review.body ? filterBody(review.body) : "No comment",
		url: review.html_url,
		color: stateColors[review.state],
		footer: { text: repoFullName },
		timestamp: review.submitted_at.toISOString(),
		author: {
			name: review.user.login,
			url: review.user.url,
			icon_url: review.user.avatar_url,
		},
		fields: [
			{
				name: "PR Title",
				value: pr.title,
				inline: false,
			},
			{
				name: "Reviewer",
				value: review.user.login,
				inline: true,
			},
			{
				name: "PR Author",
				value: pr.user.login,
				inline: true,
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

	const { body, webhookUrl, repo, webhookMappingId } = verifyResult.data;

	let embed: DiscordEmbed;
	let action: string;
	let eventKey: EventKey | undefined;
	let pingGithubUsername: string | undefined;

	if (eventType === "pull_request") {
		const {
			success,
			data: parsedBody,
			error,
		} = githubWebhookSchema.safeParse(body);
		if (!success) {
			console.error("Invalid payload", error);
			return c.json({ error: "Invalid payload" }, 400);
		}

		action = parsedBody.action;

		switch (parsedBody.action) {
			case "opened":
				embed = handleOpened(parsedBody);
				eventKey = "pr_opened";
				pingGithubUsername = parsedBody.pull_request.user.login;
				break;
			case "closed":
				embed = handleClosed(parsedBody);
				eventKey = parsedBody.pull_request.merged ? "pr_merged" : "pr_closed";
				pingGithubUsername = parsedBody.pull_request.user.login;
				break;
			case "converted_to_draft":
				embed = handleConvertedToDraft(parsedBody);
				eventKey = "pr_converted_to_draft";
				pingGithubUsername = parsedBody.pull_request.user.login;
				break;
			case "ready_for_review":
				embed = handleReadyForReview(parsedBody);
				eventKey = "pr_ready_for_review";
				pingGithubUsername = parsedBody.pull_request.user.login;
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
	} else if (eventType === "pull_request_review") {
		const {
			success,
			data: parsedBody,
			error,
		} = pullRequestReviewSchema.safeParse(body);
		if (!success) {
			console.error("Invalid payload", error);
			return c.json({ error: "Invalid payload" }, 400);
		}

		action = parsedBody.action;

		switch (parsedBody.action) {
			case "submitted": {
				embed = handleReviewSubmitted(parsedBody);
				const reviewState = parsedBody.review.state;
				if (reviewState === "approved") {
					eventKey = "review_approved";
				} else if (reviewState === "changes_requested") {
					eventKey = "review_changes_requested";
				} else if (reviewState === "commented") {
					eventKey = "review_commented";
				}
				pingGithubUsername = parsedBody.pull_request.user.login;
				break;
			}
		}
	} else {
		return c.json({
			ignored: true,
			reason: `Event type '${eventType}' not handled`,
		});
	}

	// Resolve ping content if applicable
	let pingContent: string | undefined;
	if (eventKey && pingGithubUsername) {
		try {
			const settings =
				await pingSettingsAdapter.getForMapping(webhookMappingId);
			if (settings[eventKey]) {
				const userMapping = await githubDiscordUserAdapter.getByGithubUsername(
					webhookMappingId,
					pingGithubUsername,
				);
				if (userMapping) {
					pingContent = `<@${userMapping.discordUserId}>`;
				}
			}
		} catch (err) {
			console.error("Failed to resolve ping:", err);
		}
	}

	const result = await sendDiscordEmbed(webhookUrl, embed, pingContent);

	if (!result.ok) {
		return c.json(
			{ error: "Failed to send Discord notification", status: result.status },
			502,
		);
	}

	return c.json({
		sent: true,
		event: eventType,
		action,
		repo,
		pinged: !!pingContent,
	});
});

export { githubWebhookApp };
