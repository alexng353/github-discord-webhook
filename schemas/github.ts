import { z } from "zod";

const userSchema = z.object({
	type: z.literal("User"),
	login: z.string(),
	avatar_url: z.string(),
	url: z.string(),
});

export const openSchema = z.object({
	action: z.literal("opened"),
	repository: z.object({
		name: z.string().optional().nullable().default("Unknown"),
		full_name: z.string().optional().nullable().default("Unknown"),
	}),
	pull_request: z.object({
		number: z.number(),
		title: z.string(),
		html_url: z.string(),
		user: userSchema,
		body: z.string().optional().nullable(),
		draft: z.boolean().optional().default(false),
	}),
});

export const closedSchema = z.object({
	action: z.literal("closed"),
	repository: z.object({
		name: z.string().optional().nullable().default("Unknown"),
		full_name: z.string().optional().nullable().default("Unknown"),
	}),
	pull_request: z.object({
		number: z.number(),
		title: z.string(),
		html_url: z.string(),
		user: userSchema,
		merged: z.boolean(),
		closed_at: z.coerce.date().nullable(),
		merged_at: z.coerce.date().nullable(),
		merge_commit_sha: z.string().nullable(),
		body: z.string().nullable(),
		merged_by: userSchema.nullable(),
	}),
});

export const synchronizeSchema = z.object({
	action: z.literal("synchronize"),
});

export const editedSchema = z.object({
	action: z.literal("edited"),
});

export const convertedToDraftSchema = z.object({
	action: z.literal("converted_to_draft"),
	repository: z.object({
		name: z.string().optional().nullable().default("Unknown"),
		full_name: z.string().optional().nullable().default("Unknown"),
	}),
	pull_request: z.object({
		number: z.number(),
		title: z.string(),
		html_url: z.string(),
		user: userSchema,
		body: z.string().optional().nullable(),
		draft: z.literal(true),
	}),
});

export const readyForReviewSchema = z.object({
	action: z.literal("ready_for_review"),
	repository: z.object({
		name: z.string().optional().nullable().default("Unknown"),
		full_name: z.string().optional().nullable().default("Unknown"),
	}),
	pull_request: z.object({
		number: z.number(),
		title: z.string(),
		html_url: z.string(),
		user: userSchema,
		body: z.string().optional().nullable(),
		draft: z.literal(false),
	}),
});

export const githubWebhookSchema = z.discriminatedUnion("action", [
	openSchema,
	closedSchema,
	synchronizeSchema,
	editedSchema,
	convertedToDraftSchema,
	readyForReviewSchema,
]);

export type GithubWebhookPayload = z.infer<typeof githubWebhookSchema>;

// Pull Request Review schemas
export const pullRequestReviewSubmittedSchema = z.object({
	action: z.literal("submitted"),
	review: z.object({
		id: z.number(),
		state: z.enum(["approved", "changes_requested", "commented"]),
		body: z.string().nullable(),
		html_url: z.string(),
		user: userSchema,
		submitted_at: z.coerce.date(),
	}),
	pull_request: z.object({
		number: z.number(),
		title: z.string(),
		html_url: z.string(),
		user: userSchema,
	}),
	repository: z.object({
		name: z.string().optional().nullable().default("Unknown"),
		full_name: z.string().optional().nullable().default("Unknown"),
	}),
});

export const pullRequestReviewSchema = z.discriminatedUnion("action", [
	pullRequestReviewSubmittedSchema,
]);

export type PullRequestReviewPayload = z.infer<typeof pullRequestReviewSchema>;

// Pull Request Review Comment schemas
export const pullRequestReviewCommentCreatedSchema = z.object({
	action: z.literal("created"),
	comment: z.object({
		id: z.number(),
		body: z.string(),
		html_url: z.string(),
		path: z.string().nullable(),
		line: z.number().nullable(),
		user: userSchema,
		created_at: z.coerce.date(),
	}),
	pull_request: z.object({
		number: z.number(),
		title: z.string(),
		html_url: z.string(),
		user: userSchema,
	}),
	repository: z.object({
		name: z.string().optional().nullable().default("Unknown"),
		full_name: z.string().optional().nullable().default("Unknown"),
	}),
});

export const pullRequestReviewCommentSchema = z.discriminatedUnion("action", [
	pullRequestReviewCommentCreatedSchema,
]);

export type PullRequestReviewCommentPayload = z.infer<
	typeof pullRequestReviewCommentSchema
>;
