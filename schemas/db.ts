import {
	boolean,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	username: varchar("username", { length: 255 }).notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	expiresAt: timestamp("expires_at").notNull(),
});

export const authTokens = pgTable("auth_tokens", {
	token: uuid("token").primaryKey().defaultRandom(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const webhookMappings = pgTable("webhook_mappings", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	repo: varchar("repo", { length: 500 }).notNull().unique(),
	webhookUrl: text("webhook_url").notNull(),
	secret: text("secret").notNull(),
});

export const inviteCodes = pgTable("invite_codes", {
	code: varchar("code", { length: 50 }).primaryKey(),
	createdBy: uuid("created_by").references(() => users.id, {
		onDelete: "cascade",
	}),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
	usedAt: timestamp("used_at"),
});

export const githubDiscordUsers = pgTable(
	"github_discord_users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		webhookMappingId: uuid("webhook_mapping_id")
			.notNull()
			.references(() => webhookMappings.id, { onDelete: "cascade" }),
		githubUsername: varchar("github_username", { length: 255 }).notNull(),
		discordUserId: varchar("discord_user_id", { length: 255 }).notNull(),
		userId: uuid("user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [unique().on(t.webhookMappingId, t.githubUsername)],
);

export const pingSettings = pgTable(
	"ping_settings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		webhookMappingId: uuid("webhook_mapping_id")
			.notNull()
			.references(() => webhookMappings.id, { onDelete: "cascade" }),
		eventKey: varchar("event_key", { length: 100 }).notNull(),
		enabled: boolean("enabled").notNull().default(true),
		userId: uuid("user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [unique().on(t.webhookMappingId, t.eventKey)],
);
