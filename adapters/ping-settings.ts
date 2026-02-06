import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { pingSettings } from "../schemas/db";

export const EVENT_KEYS = [
	"pr_opened",
	"pr_closed",
	"pr_merged",
	"pr_converted_to_draft",
	"pr_ready_for_review",
	"review_approved",
	"review_changes_requested",
	"review_commented",
] as const;

export type EventKey = (typeof EVENT_KEYS)[number];

export const DEFAULT_PING_SETTINGS: Record<EventKey, boolean> = {
	pr_opened: false,
	pr_closed: false,
	pr_merged: false,
	pr_converted_to_draft: false,
	pr_ready_for_review: false,
	review_approved: true,
	review_changes_requested: true,
	review_commented: false,
};

export interface PingSetting {
	id: string;
	webhookMappingId: string;
	eventKey: string;
	enabled: boolean;
	userId: string | null;
	createdAt: Date;
}

export abstract class PingSettingsAdapter {
	abstract getForMapping(
		webhookMappingId: string,
	): Promise<Record<EventKey, boolean>>;

	abstract upsert(
		webhookMappingId: string,
		eventKey: EventKey,
		enabled: boolean,
	): Promise<void>;

	abstract bulkUpsert(
		webhookMappingId: string,
		settings: Partial<Record<EventKey, boolean>>,
	): Promise<void>;
}

export class DatabasePingSettingsAdapter extends PingSettingsAdapter {
	async getForMapping(
		webhookMappingId: string,
	): Promise<Record<EventKey, boolean>> {
		const db = getDb();
		const rows = await db
			.select()
			.from(pingSettings)
			.where(eq(pingSettings.webhookMappingId, webhookMappingId));

		const result = { ...DEFAULT_PING_SETTINGS };
		for (const row of rows) {
			if (row.eventKey in result) {
				result[row.eventKey as EventKey] = row.enabled;
			}
		}
		return result;
	}

	async upsert(
		webhookMappingId: string,
		eventKey: EventKey,
		enabled: boolean,
	): Promise<void> {
		const db = getDb();
		await db
			.insert(pingSettings)
			.values({ webhookMappingId, eventKey, enabled })
			.onConflictDoUpdate({
				target: [pingSettings.webhookMappingId, pingSettings.eventKey],
				set: { enabled },
			});
	}

	async bulkUpsert(
		webhookMappingId: string,
		settings: Partial<Record<EventKey, boolean>>,
	): Promise<void> {
		const db = getDb();
		const entries = Object.entries(settings) as [EventKey, boolean][];
		for (const [eventKey, enabled] of entries) {
			await db
				.insert(pingSettings)
				.values({ webhookMappingId, eventKey, enabled })
				.onConflictDoUpdate({
					target: [pingSettings.webhookMappingId, pingSettings.eventKey],
					set: { enabled },
				});
		}
	}
}
