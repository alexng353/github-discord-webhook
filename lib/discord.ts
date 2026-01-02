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

/** Send an embed to a Discord webhook */
export async function sendDiscordEmbed(
	webhookUrl: string,
	embed: DiscordEmbed,
): Promise<{ ok: boolean; status: number }> {
	const response = await fetch(webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ embeds: [embed] }),
	});
	return { ok: response.ok, status: response.status };
}
