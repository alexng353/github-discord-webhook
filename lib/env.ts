import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Environment configuration using t3-oss/env
export const env = createEnv({
	server: {
		PORT: z.coerce.number().default(3000),
		NODE_ENV: z.enum(["development", "production"]).default("development"),
		REGISTRATION: z.enum(["open", "closed", "invite_only"]).default("open"),
		DATABASE_URL: z
			.string()
			.refine(
				(val) =>
					val.startsWith("postgres://") || val.startsWith("postgresql://"),
				{
					message: "DATABASE_URL must be a valid postgres:// URL",
				},
			),
		RAILWAY_PUBLIC_DOMAIN: z.string().optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
