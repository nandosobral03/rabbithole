"use client";

import DOMPurify from "dompurify";
import { useEffect, useState } from "react";

interface WikipediaArticleViewerProps {
	htmlContent: string;
	title: string;
	onLinkClick?: (title: string) => void;
	onMiddleClick?: (title: string) => void;
	loadingLinks?: Set<string>;
}

export function WikipediaArticleViewer({
	htmlContent,
	title,
	onLinkClick,
	onMiddleClick,
	loadingLinks,
}: WikipediaArticleViewerProps) {
	const [sanitizedHtml, setSanitizedHtml] = useState("");

	useEffect(() => {
		if (typeof window === "undefined") return;

		// Configure DOMPurify to allow most Wikipedia elements but remove dangerous ones
		const cleanHtml = DOMPurify.sanitize(htmlContent, {
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
		});

		setSanitizedHtml(cleanHtml);

		// Debug: Check what links exist in the sanitized HTML
		console.log("Wikipedia content sanitized, checking for links...");
		const tempDiv = document.createElement("div");
		tempDiv.innerHTML = cleanHtml;
		const links = tempDiv.querySelectorAll("a[href]");
		console.log(`Found ${links.length} links in content:`);

		let wikipediaLinkCount = 0;
		let externalLinkCount = 0;

		links.forEach((link, index) => {
			const href = link.getAttribute("href");
			const isWikipediaLink =
				href?.startsWith("./") ||
				href?.startsWith("/wiki/") ||
				href?.includes("wikipedia.org/wiki/");

			if (isWikipediaLink) {
				wikipediaLinkCount++;
			} else {
				externalLinkCount++;
			}

			if (index < 10) {
				// Log first 10 links with their type
				console.log(
					`Link ${index}: ${href} (${isWikipediaLink ? "Wikipedia" : "External"})`,
				);
			}
		});

		console.log(
			`Wikipedia links: ${wikipediaLinkCount}, External links: ${externalLinkCount}`,
		);
	}, [htmlContent]);

	useEffect(() => {
		if (!sanitizedHtml || !onLinkClick) return;

		const container = document.getElementById(
			`wikipedia-content-${title.replace(/\s+/g, "-")}`,
		);
		if (!container) {
			console.log(
				"Container not found for:",
				`wikipedia-content-${title.replace(/\s+/g, "-")}`,
			);
			return;
		}

		console.log("Setting up click handler for container:", container);

		const handleLinkClick = (e: Event) => {
			console.log("🔍 Click detected on:", e.target);

			const target = e.target as HTMLElement;
			const mouseEvent = e as MouseEvent;

			// Handle clicks on anchor tags or their children
			const anchor = target.closest("a");

			if (anchor) {
				console.log("🎯 Found anchor tag:", anchor);

				const href = anchor.getAttribute("href");
				console.log("🔗 Anchor href attribute:", href);

				if (href) {
					// Check if this is a Wikipedia link
					const isWikipediaLink =
						href.startsWith("./") ||
						href.startsWith("/wiki/") ||
						href.includes("wikipedia.org/wiki/");

					if (isWikipediaLink) {
						// Handle Wikipedia links with our custom logic
						console.log("⛔ Preventing default navigation for Wikipedia link");
						e.preventDefault();
						e.stopPropagation();

						// Handle both relative and absolute Wikipedia links
						let articleTitle = "";

						if (href.startsWith("./")) {
							// Wikipedia HTML API format: ./Article_name
							console.log("📝 Processing Wikipedia HTML API relative link");
							articleTitle = decodeURIComponent(href.replace("./", "")).replace(
								/_/g,
								" ",
							);
						} else if (href.startsWith("/wiki/")) {
							// Traditional Wikipedia link format: /wiki/Article_name
							console.log("📝 Processing traditional Wikipedia link");
							articleTitle = decodeURIComponent(
								href.replace("/wiki/", ""),
							).replace(/_/g, " ");
						} else if (href.includes("wikipedia.org/wiki/")) {
							// Absolute Wikipedia link: https://en.wikipedia.org/wiki/Article_name
							console.log("🌐 Processing absolute Wikipedia link");
							const match = href.match(/\/wiki\/([^#?]+)/);
							if (match?.[1]) {
								articleTitle = decodeURIComponent(match[1]).replace(/_/g, " ");
							}
						}

						if (articleTitle?.trim()) {
							// Check if it's a middle mouse button click (button 1)
							if (mouseEvent.button === 1) {
								console.log(
									"🖱️ Middle click detected - adding node without switching view",
								);
								// Call onLinkClick with a special flag or create a separate handler
								// For now, we'll pass the article title but indicate it's a middle click
								if (onMiddleClick) {
									// We need to modify the parent component to handle this
									// For now, let's just add the node without switching
									console.log("✅ Adding node via middle click:", articleTitle);
									onMiddleClick(articleTitle);
								}
							} else {
								console.log(
									"✅ Calling onLinkClick with article:",
									articleTitle,
								);
								onLinkClick(articleTitle);
							}
						} else {
							console.log("❌ No valid article title extracted from:", href);
						}
					} else {
						// External link - let it open in new tab (don't prevent default)
						console.log(
							"🌐 External link detected, allowing default behavior:",
							href,
						);
						// Ensure it opens in new tab
						anchor.setAttribute("target", "_blank");
						anchor.setAttribute("rel", "noopener noreferrer");
					}
				} else {
					console.log("❌ No href attribute found on anchor");
				}
			} else {
				console.log("❌ Click target is not an anchor or child of anchor");
			}
		};

		// Handle middle clicks specifically with auxclick event
		const handleAuxClick = (e: Event) => {
			const mouseEvent = e as MouseEvent;
			if (mouseEvent.button === 1) {
				// Middle mouse button
				console.log("🖱️ Auxclick (middle button) detected");
				handleLinkClick(e);
			}
		};

		// Prevent default middle-click behavior on mousedown
		const handleMouseDown = (e: Event) => {
			const mouseEvent = e as MouseEvent;
			const target = e.target as HTMLElement;
			const anchor = target.closest("a");

			if (anchor && mouseEvent.button === 1) {
				const href = anchor.getAttribute("href");
				const isWikipediaLink =
					href?.startsWith("./") ||
					href?.startsWith("/wiki/") ||
					href?.includes("wikipedia.org/wiki/");

				if (isWikipediaLink) {
					console.log("⛔ Preventing default middle-click behavior");
					e.preventDefault();
					e.stopPropagation();
				}
			}
		};

		// Use capture phase to ensure we catch the event early
		console.log("🔧 Attaching click listeners with capture=true");
		container.addEventListener("click", handleLinkClick, true);
		container.addEventListener("auxclick", handleAuxClick, true);
		container.addEventListener("mousedown", handleMouseDown, true);

		return () => {
			console.log("🧹 Removing click listeners");
			container.removeEventListener("click", handleLinkClick, true);
			container.removeEventListener("auxclick", handleAuxClick, true);
			container.removeEventListener("mousedown", handleMouseDown, true);
		};
	}, [sanitizedHtml, onLinkClick, onMiddleClick, title]);

	// Update link styles based on loading state and link type
	useEffect(() => {
		const container = document.getElementById(
			`wikipedia-content-${title.replace(/\s+/g, "-")}`,
		);
		if (!container) return;

		const links = container.querySelectorAll("a[href]");
		const hasLoadingLinks = loadingLinks && loadingLinks.size > 0;

		console.log(`🎨 Styling ${links.length} links in container...`);
		let wikipediaCount = 0;
		let externalCount = 0;

		for (const link of links) {
			const href = link.getAttribute("href");
			if (!href) continue;

			// Check if this is a Wikipedia link
			const isWikipediaLink =
				href.startsWith("./") ||
				href.startsWith("/wiki/") ||
				href.includes("wikipedia.org/wiki/");

			// Add appropriate classes for styling
			if (isWikipediaLink) {
				link.classList.add("wikipedia-link");
				link.classList.remove("external-link");
				wikipediaCount++;

				// Debug: Check what classes are actually on the element
				console.log(`📘 Wikipedia link: ${href} - Classes: ${link.className}`);

				// Handle loading states for Wikipedia links
				let articleTitle = "";

				if (href.startsWith("./")) {
					articleTitle = decodeURIComponent(href.replace("./", "")).replace(
						/_/g,
						" ",
					);
				} else if (href.startsWith("/wiki/")) {
					articleTitle = decodeURIComponent(href.replace("/wiki/", "")).replace(
						/_/g,
						" ",
					);
				} else if (href.includes("wikipedia.org/wiki/")) {
					const match = href.match(/\/wiki\/([^#?]+)/);
					if (match?.[1]) {
						articleTitle = decodeURIComponent(match[1]).replace(/_/g, " ");
					}
				}

				// Remove all loading-related classes first
				link.classList.remove("loading-link", "disabled-link");

				if (articleTitle && hasLoadingLinks) {
					if (loadingLinks.has(articleTitle)) {
						// This specific link is loading
						link.classList.add("loading-link");
					} else {
						// Other links are disabled while something is loading
						link.classList.add("disabled-link");
					}
				}
			} else {
				// External link
				link.classList.add("external-link");
				link.classList.remove(
					"wikipedia-link",
					"loading-link",
					"disabled-link",
				);
				externalCount++;

				// Debug: Check what classes are actually on the element
				console.log(`🌐 External link: ${href} - Classes: ${link.className}`);

				// Ensure external links open in new tab
				link.setAttribute("target", "_blank");
				link.setAttribute("rel", "noopener noreferrer");
			}
		}

		console.log(
			`✅ Applied styles: ${wikipediaCount} Wikipedia links (green), ${externalCount} external links (blue)`,
		);
	}, [loadingLinks, title, sanitizedHtml]);

	if (!sanitizedHtml) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-gray-500">Loading article content...</div>
			</div>
		);
	}

	return (
		<div
			id={`wikipedia-content-${title.replace(/\s+/g, "-")}`}
			className="wikipedia-article-content prose prose-sm max-w-none"
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
    color: rgb(34 197 94) !important;
  }

  .wikipedia-article-content a.wikipedia-link:hover {
    color: rgb(22 163 74) !important;
    border-bottom-color: rgb(22 163 74) !important;
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
