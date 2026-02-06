/** Discord embed type with all supported fields */
export type DiscordEmbed = {
	title?: string;
	description?: string;
	url?: string;
	timestamp?: string;
	color?: number;
	footer?: {
		text: string;
		icon_url?: string;
		proxy_icon_url?: string;
	};
	image?: {
		url: string;
		proxy_url?: string;
		height?: number;
		width?: number;
	};
	thumbnail?: {
		url: string;
		proxy_url?: string;
		height?: number;
		width?: number;
	};
	author?: {
		name: string;
		url?: string;
		icon_url?: string;
		proxy_icon_url?: string;
	};
	fields?: Array<{
		name: string;
		value: string;
		inline?: boolean;
	}>;
};

/** Send an embed to a Discord webhook, with optional content for pings */
export async function sendDiscordEmbed(
	webhookUrl: string,
	embed: DiscordEmbed,
	content?: string,
): Promise<{ ok: boolean; status: number }> {
	const payload: { embeds: DiscordEmbed[]; content?: string } = {
		embeds: [embed],
	};
	if (content) {
		payload.content = content;
	}
	const response = await fetch(webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return { ok: response.ok, status: response.status };
}
