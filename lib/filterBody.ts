export function filterBody(body: string): string {
	// remove everything within <!-- CURSOR_SUMMARY --> and <!-- /CURSOR_SUMMARY -->
	return body
		.replace(/<!--.*?-->/g, "")
		.replace("<sup>", "-# ")
		.replace("</sup>", "")
		.replace("[!NOTE]", "");
}
