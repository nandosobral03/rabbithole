import type { WikipediaLink } from "../types/graph";

export const generateNodeColor = (title: string): string => {
	let hash = 0;
	for (let i = 0; i < title.length; i++) {
		hash = title.charCodeAt(i) + ((hash << 5) - hash);
	}
	const hue = Math.abs(hash) % 360;
	return `hsl(${hue}, 70%, 60%)`;
};

export const calculateNodeSize = (
	content: string,
	outgoingLinks: WikipediaLink[] = [],
	isRoot = false,
): number => {
	const MIN_SIZE = 6;
	const MAX_SIZE = 40;

	// Base size on content length (characters)
	const contentLength = content.length;

	// Use a more aggressive scaling function for better differentiation
	// Short articles: 200-1000 chars, Medium: 1000-5000, Long: 5000+
	let scaledSize: number;

	if (contentLength < 500) {
		// Very short articles - smaller nodes
		scaledSize = MIN_SIZE + (contentLength / 500) * 8;
	} else if (contentLength < 2000) {
		// Short to medium articles
		scaledSize = MIN_SIZE + 8 + ((contentLength - 500) / 1500) * 12;
	} else if (contentLength < 10000) {
		// Medium to long articles
		scaledSize = MIN_SIZE + 20 + ((contentLength - 2000) / 8000) * 12;
	} else {
		// Very long articles - largest nodes
		scaledSize =
			MIN_SIZE + 32 + Math.min(8, Math.log(contentLength / 10000) * 4);
	}

	// Count only Wikipedia article links (filter out external links, files, categories, etc.)
	const wikipediaLinksCount = outgoingLinks.filter((link) => {
		const title = link.title.toLowerCase();
		// Exclude common non-article namespaces
		return (
			!title.startsWith("file:") &&
			!title.startsWith("category:") &&
			!title.startsWith("template:") &&
			!title.startsWith("help:") &&
			!title.startsWith("wikipedia:") &&
			!title.startsWith("user:") &&
			!title.startsWith("talk:") &&
			!title.includes(":") && // Most namespaced pages have colons
			title.length > 1
		); // Exclude very short titles
	}).length;

	// Factor in Wikipedia links - articles with more connections are more important
	// Scale links count: 0-10 links = no bonus, 10-50 = small bonus, 50+ = larger bonus
	let linkBonus = 0;
	if (wikipediaLinksCount > 10) {
		if (wikipediaLinksCount < 50) {
			linkBonus = ((wikipediaLinksCount - 10) / 40) * 6; // Up to 6px bonus
		} else {
			linkBonus = 6 + Math.min(4, Math.log(wikipediaLinksCount / 50) * 3); // Up to 10px total bonus
		}
	}

	// Combine content size and link bonus
	const finalSize = scaledSize + linkBonus;

	// Clamp to min/max bounds
	return Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, finalSize)));
};
