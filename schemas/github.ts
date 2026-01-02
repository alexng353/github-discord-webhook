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

export const githubWebhookSchema = z.discriminatedUnion("action", [
	openSchema,
	closedSchema,
	synchronizeSchema,
	editedSchema,
]);
