import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

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
