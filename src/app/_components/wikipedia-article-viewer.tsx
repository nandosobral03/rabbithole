"use client";

import DOMPurify from "dompurify";
import { useCallback, useEffect, useMemo, useState } from "react";

interface WikipediaArticleViewerProps {
	htmlContent: string;
	title: string;
	onLinkClick?: (title: string) => void;
	onMiddleClick?: (title: string) => void;
	loadingLinks?: Set<string>;
}

// Memoize the article title extraction logic
const extractArticleTitle = (href: string): string => {
	if (href.startsWith("./")) {
		return decodeURIComponent(href.replace("./", "")).replace(/_/g, " ");
	}
	if (href.startsWith("/wiki/")) {
		return decodeURIComponent(href.replace("/wiki/", "")).replace(/_/g, " ");
	}
	if (href.includes("wikipedia.org/wiki/")) {
		const match = href.match(/\/wiki\/([^#?]+)/);
		if (match?.[1]) {
			return decodeURIComponent(match[1]).replace(/_/g, " ");
		}
	}
	return "";
};

// Check if a link is a Wikipedia link
const isWikipediaLink = (href: string): boolean => {
	return (
		href.startsWith("./") ||
		href.startsWith("/wiki/") ||
		href.includes("wikipedia.org/wiki/")
	);
};

export function WikipediaArticleViewer({
	htmlContent,
	title,
	onLinkClick,
	onMiddleClick,
	loadingLinks,
}: WikipediaArticleViewerProps) {
	const [sanitizedHtml, setSanitizedHtml] = useState("");

	// Memoize the DOMPurify configuration
	const purifyConfig = useMemo(
		() => ({
			ALLOWED_TAGS: [
				"div",
				"p",
				"span",
				"a",
				"h1",
				"h2",
				"h3",
				"h4",
				"h5",
				"h6",
				"ul",
				"ol",
				"li",
				"table",
				"thead",
				"tbody",
				"tr",
				"td",
				"th",
				"blockquote",
				"em",
				"strong",
				"b",
				"i",
				"u",
				"s",
				"br",
				"hr",
				"img",
				"figure",
				"figcaption",
				"caption",
				"dl",
				"dt",
				"dd",
				"section",
				"article",
				"aside",
				"nav",
				"header",
				"footer",
				"sup",
				"sub",
				"cite",
				"code",
				"pre",
				"kbd",
				"samp",
				"var",
			],
			ALLOWED_ATTR: [
				"class",
				"id",
				"href",
				"title",
				"alt",
				"src",
				"width",
				"height",
				"data-*",
				"aria-*",
				"role",
				"tabindex",
				"colspan",
				"rowspan",
			],
			FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
			FORBID_ATTR: ["onclick", "onerror", "onload", "onmouseover"],
			KEEP_CONTENT: true,
			ALLOW_DATA_ATTR: true,
		}),
		[],
	);

	// Memoize the sanitized HTML to avoid re-sanitizing on every render
	const memoizedSanitizedHtml = useMemo(() => {
		if (typeof window === "undefined" || !htmlContent) return "";
		return DOMPurify.sanitize(htmlContent, purifyConfig);
	}, [htmlContent, purifyConfig]);

	useEffect(() => {
		setSanitizedHtml(memoizedSanitizedHtml);
	}, [memoizedSanitizedHtml]);

	// Memoize the container ID to avoid recalculating
	const containerId = useMemo(
		() => `wikipedia-content-${title.replace(/\s+/g, "-")}`,
		[title],
	);

	// Optimized click handler
	const handleLinkClick = useCallback(
		(e: Event) => {
			const target = e.target as HTMLElement;
			const mouseEvent = e as MouseEvent;
			const anchor = target.closest("a");

			if (!anchor) return;

			const href = anchor.getAttribute("href");
			if (!href || !isWikipediaLink(href)) {
				// External link - ensure it opens in new tab
				anchor.setAttribute("target", "_blank");
				anchor.setAttribute("rel", "noopener noreferrer");
				return;
			}

			// Wikipedia link - prevent default and handle custom logic
			e.preventDefault();
			e.stopPropagation();

			const articleTitle = extractArticleTitle(href);
			if (!articleTitle?.trim()) return;

			// Handle middle click vs regular click
			if (mouseEvent.button === 1 && onMiddleClick) {
				onMiddleClick(articleTitle);
			} else if (onLinkClick) {
				onLinkClick(articleTitle);
			}
		},
		[onLinkClick, onMiddleClick],
	);

	// Handle middle clicks
	const handleAuxClick = useCallback(
		(e: Event) => {
			const mouseEvent = e as MouseEvent;
			if (mouseEvent.button === 1) {
				handleLinkClick(e);
			}
		},
		[handleLinkClick],
	);

	// Prevent default middle-click behavior
	const handleMouseDown = useCallback((e: Event) => {
		const mouseEvent = e as MouseEvent;
		const target = e.target as HTMLElement;
		const anchor = target.closest("a");

		if (anchor && mouseEvent.button === 1) {
			const href = anchor.getAttribute("href");
			if (href && isWikipediaLink(href)) {
				e.preventDefault();
				e.stopPropagation();
			}
		}
	}, []);

	// Set up event listeners
	useEffect(() => {
		if (!sanitizedHtml || !onLinkClick) return;

		const container = document.getElementById(containerId);
		if (!container) return;

		container.addEventListener("click", handleLinkClick, true);
		container.addEventListener("auxclick", handleAuxClick, true);
		container.addEventListener("mousedown", handleMouseDown, true);

		return () => {
			container.removeEventListener("click", handleLinkClick, true);
			container.removeEventListener("auxclick", handleAuxClick, true);
			container.removeEventListener("mousedown", handleMouseDown, true);
		};
	}, [
		sanitizedHtml,
		onLinkClick,
		containerId,
		handleLinkClick,
		handleAuxClick,
		handleMouseDown,
	]);

	// Optimized link styling - batch process links and prioritize visible ones
	useEffect(() => {
		const container = document.getElementById(containerId);
		if (!container || !sanitizedHtml) return;

		const links = Array.from(
			container.querySelectorAll("a[href]"),
		) as HTMLAnchorElement[];
		const hasLoadingLinks = loadingLinks && loadingLinks.size > 0;

		// Process links in batches to avoid blocking the main thread
		const BATCH_SIZE = 50;
		let currentBatch = 0;
		const totalBatches = Math.ceil(links.length / BATCH_SIZE);

		// Create an intersection observer to prioritize visible links (if supported)
		const visibleLinks = new Set<HTMLAnchorElement>();
		let observer: IntersectionObserver | null = null;

		if (typeof IntersectionObserver !== "undefined") {
			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							visibleLinks.add(entry.target as HTMLAnchorElement);
						} else {
							visibleLinks.delete(entry.target as HTMLAnchorElement);
						}
					}
				},
				{
					root: container,
					rootMargin: "100px", // Process links slightly before they come into view
					threshold: 0,
				},
			);

			// Start observing all links
			for (const link of links) {
				observer.observe(link);
			}

			// Give the observer a moment to detect visible links, then start processing
			setTimeout(() => {
				processBatches();
			}, 10);
		} else {
			// No intersection observer support, start immediately
			processBatches();
		}

		const processLinkBatch = (batchIndex: number) => {
			const startIndex = batchIndex * BATCH_SIZE;
			const endIndex = Math.min(startIndex + BATCH_SIZE, links.length);
			const batchLinks = links.slice(startIndex, endIndex);

			// Process visible links first if we have intersection observer, otherwise process in order
			let orderedBatchLinks = batchLinks;
			if (observer && visibleLinks.size > 0) {
				const visibleBatchLinks = batchLinks.filter((link) =>
					visibleLinks.has(link),
				);
				const nonVisibleBatchLinks = batchLinks.filter(
					(link) => !visibleLinks.has(link),
				);
				orderedBatchLinks = [...visibleBatchLinks, ...nonVisibleBatchLinks];
			}

			for (const link of orderedBatchLinks) {
				const href = link.getAttribute("href");
				if (!href) continue;

				if (isWikipediaLink(href)) {
					link.classList.add("wikipedia-link");
					link.classList.remove("external-link");

					// Only process loading states if there are loading links
					if (hasLoadingLinks) {
						const articleTitle = extractArticleTitle(href);
						link.classList.remove("loading-link", "disabled-link");

						if (articleTitle && loadingLinks.has(articleTitle)) {
							link.classList.add("loading-link");
						} else {
							link.classList.add("disabled-link");
						}
					} else {
						link.classList.remove("loading-link", "disabled-link");
					}
				} else {
					// External link
					link.classList.add("external-link");
					link.classList.remove(
						"wikipedia-link",
						"loading-link",
						"disabled-link",
					);
					link.setAttribute("target", "_blank");
					link.setAttribute("rel", "noopener noreferrer");
				}
			}
		};

		function processBatches() {
			if (currentBatch < totalBatches) {
				// Use requestAnimationFrame to avoid blocking the main thread
				requestAnimationFrame(() => {
					processLinkBatch(currentBatch);
					currentBatch++;

					// Schedule next batch with a small delay to keep UI responsive
					if (currentBatch < totalBatches) {
						setTimeout(processBatches, 0);
					}
				});
			}
		}

		// Cleanup function
		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	}, [loadingLinks, containerId, sanitizedHtml]);

	if (!sanitizedHtml) {
		return (
			<div className="text-muted-foreground">Loading article content...</div>
		);
	}

	return (
		<div
			id={containerId}
			className="wikipedia-article-content prose prose-sm max-w-none"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
			dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
			style={
				{
					// Custom CSS to style Wikipedia content
					"--tw-prose-body": "rgb(55 65 81)",
					"--tw-prose-headings": "rgb(17 24 39)",
					"--tw-prose-links": "rgb(37 99 235)",
					"--tw-prose-bold": "rgb(17 24 39)",
					"--tw-prose-counters": "rgb(107 114 128)",
					"--tw-prose-bullets": "rgb(209 213 219)",
					"--tw-prose-hr": "rgb(229 231 235)",
					"--tw-prose-quotes": "rgb(17 24 39)",
					"--tw-prose-quote-borders": "rgb(229 231 235)",
					"--tw-prose-captions": "rgb(107 114 128)",
					"--tw-prose-code": "rgb(17 24 39)",
					"--tw-prose-pre-code": "rgb(229 231 235)",
					"--tw-prose-pre-bg": "rgb(249 250 251)",
					"--tw-prose-th-borders": "rgb(209 213 219)",
					"--tw-prose-td-borders": "rgb(229 231 235)",
				} as React.CSSProperties
			}
		/>
	);
}

// Add custom CSS for Wikipedia-specific styling
export const wikipediaStyles = `
  .wikipedia-article-content {
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.6;
  }

  /* Base link styling */
  .wikipedia-article-content a {
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .wikipedia-article-content a:hover {
    text-decoration: underline;
  }

  /* Wikipedia links - green color with high specificity */
  .wikipedia-article-content a.wikipedia-link,
  .wikipedia-article-content a.wikipedia-link:link,
  .wikipedia-article-content a.wikipedia-link:visited {
    color: oklch(0.7686 0.1647 70.0804) !important;
  }

  .wikipedia-article-content a.wikipedia-link:hover {
    color: oklch(0.7686 0.1647 70.0804) !important;
    border-bottom-color: oklch(0.7686 0.1647 70.0804) !important;
  }

  /* External links - normal blue color with external icon and high specificity */
  .wikipedia-article-content a.external-link,
  .wikipedia-article-content a.external-link:link,
  .wikipedia-article-content a.external-link:visited {
    color: rgb(37 99 235) !important;
  }

  .wikipedia-article-content a.external-link:hover {
    color: rgb(29 78 216) !important;
    border-bottom-color: rgb(29 78 216) !important;
  }

  .wikipedia-article-content a.external-link::after {
    content: "↗";
    font-size: 0.75em;
    margin-left: 0.25em;
    opacity: 0.7;
  }

  /* Default link styling for links that haven't been classified yet */
  .wikipedia-article-content a:not(.wikipedia-link):not(.external-link) {
    color: rgb(37 99 235);
  }

  .wikipedia-article-content a:not(.wikipedia-link):not(.external-link):hover {
    color: rgb(29 78 216);
    border-bottom-color: rgb(29 78 216);
  }

  /* Loading and disabled states for Wikipedia links */
  .wikipedia-article-content a.loading-link {
    color: rgb(59 130 246) !important;
    animation: pulse 1.5s ease-in-out infinite;
    pointer-events: none;
  }

  .wikipedia-article-content a.disabled-link {
    color: rgb(156 163 175) !important;
    cursor: not-allowed !important;
    pointer-events: none;
    opacity: 0.5;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.02);
    }
  }

  .wikipedia-article-content .infobox {
    background: #f8f9fa;
    border: 1px solid #a2a9b1;
    border-spacing: 3px;
    clear: right;
    float: right;
    font-size: 88%;
    margin: 0 0 1.25em 1.25em;
    padding: 0.2em;
    width: 22em;
  }

  .wikipedia-article-content .navbox {
    display: none; /* Hide navigation boxes for cleaner display */
  }

  .wikipedia-article-content .mbox-small {
    font-size: 88%;
    line-height: 1.25em;
    margin: 0.5em 0;
    padding: 2px;
  }

  .wikipedia-article-content .hatnote {
    font-style: italic;
    margin: 0.5em 0;
    padding-left: 1.6em;
  }

  .wikipedia-article-content .thumbinner {
    border: 1px solid #c8ccd1;
    font-size: 94%;
    overflow: hidden;
    padding: 3px;
  }

  .wikipedia-article-content .thumbcaption {
    border: 0;
    font-size: 94%;
    line-height: 1.4em;
    padding: 3px;
    text-align: left;
  }

  .wikipedia-article-content table {
    border-collapse: collapse;
    margin: 1em 0;
  }

  .wikipedia-article-content th,
  .wikipedia-article-content td {
    border: 1px solid #a2a9b1;
    padding: 0.2em 0.4em;
  }

  .wikipedia-article-content th {
    background-color: #eaecf0;
    font-weight: bold;
    text-align: center;
  }

  .wikipedia-article-content blockquote {
    border-left: 4px solid #c8ccd1;
    margin: 1em 0;
    padding-left: 1em;
  }

  .wikipedia-article-content .citation {
    font-size: 90%;
  }

  .wikipedia-article-content sup {
    font-size: 75%;
    line-height: 0;
    vertical-align: super;
  }

  .wikipedia-article-content .reference {
    font-size: 85%;
  }

  /* Hide edit links and other Wikipedia UI elements */
  .wikipedia-article-content .mw-editsection,
  .wikipedia-article-content .noprint,
  .wikipedia-article-content .catlinks,
  .wikipedia-article-content .printfooter,
  .wikipedia-article-content .mw-jump-link {
    display: none !important;
  }

  .wikipedia-article-content h1,
  .wikipedia-article-content h2,
  .wikipedia-article-content h3,
  .wikipedia-article-content h4,
  .wikipedia-article-content h5,
  .wikipedia-article-content h6 {
    color: rgb(17 24 39);
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  .wikipedia-article-content p {
    margin-bottom: 1em;
  }

  .wikipedia-article-content ul,
  .wikipedia-article-content ol {
    margin-bottom: 1em;
    padding-left: 1.5em;
  }

  .wikipedia-article-content li {
    margin-bottom: 0.25em;
  }

  .wikipedia-article-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    border: 1px solid rgb(229 231 235);
  }

  .wikipedia-article-content th,
  .wikipedia-article-content td {
    border: 1px solid rgb(229 231 235);
    padding: 0.5em;
    text-align: left;
  }

  .wikipedia-article-content th {
    background-color: rgb(249 250 251);
    font-weight: 600;
  }

  .wikipedia-article-content blockquote {
    border-left: 4px solid rgb(229 231 235);
    padding-left: 1em;
    margin: 1em 0;
    font-style: italic;
    color: rgb(107 114 128);
  }

  .wikipedia-article-content img {
    max-width: 100%;
    height: auto;
    margin: 1em 0;
    border-radius: 0.375rem;
  }

  .wikipedia-article-content .infobox {
    float: right;
    clear: right;
    width: 300px;
    margin: 0 0 1em 1em;
    border: 1px solid rgb(209 213 219);
    background-color: rgb(249 250 251);
    padding: 1em;
    border-radius: 0.375rem;
  }

  .wikipedia-article-content .navbox {
    border: 1px solid rgb(209 213 219);
    background-color: rgb(249 250 251);
    margin: 1em 0;
    padding: 0.5em;
    border-radius: 0.375rem;
  }

  .wikipedia-article-content .mw-references-wrap {
    font-size: 0.875em;
    color: rgb(107 114 128);
  }

  .wikipedia-article-content .reference {
    font-size: 0.75em;
    vertical-align: super;
  }

  .wikipedia-article-content .thumbinner {
    border: 1px solid rgb(209 213 219);
    padding: 0.25em;
    background-color: rgb(249 250 251);
    border-radius: 0.375rem;
    margin: 1em 0;
  }

  .wikipedia-article-content .thumbcaption {
    font-size: 0.875em;
    color: rgb(107 114 128);
    margin-top: 0.5em;
  }
`;
