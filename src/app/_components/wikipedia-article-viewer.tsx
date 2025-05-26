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

// Check if a link is an image file
const isImageFile = (href: string): boolean => {
	const imageExtensions = [
		".jpg",
		".jpeg",
		".png",
		".gif",
		".svg",
		".webp",
		".bmp",
		".tiff",
	];
	const lowercaseHref = href.toLowerCase();
	return imageExtensions.some((ext) => lowercaseHref.includes(ext));
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
			if (!href) return;

			// Check if it's an image file - let it open normally
			if (isImageFile(href)) {
				// Construct proper Wikipedia URL for image files
				let imageUrl = href;
				if (href.startsWith("./")) {
					imageUrl = `https://en.wikipedia.org/wiki/${href.replace("./", "")}`;
				} else if (href.startsWith("/wiki/")) {
					imageUrl = `https://en.wikipedia.org${href}`;
				}

				anchor.setAttribute("href", imageUrl);
				anchor.setAttribute("target", "_blank");
				anchor.setAttribute("rel", "noopener noreferrer");
				return;
			}

			// Check if it's a Wikipedia link
			if (!isWikipediaLink(href)) {
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
			if (href && isWikipediaLink(href) && !isImageFile(href)) {
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

	// Simple loading state for individual links
	useEffect(() => {
		if (!sanitizedHtml || !loadingLinks || loadingLinks.size === 0) return;

		const container = document.getElementById(containerId);
		if (!container) return;

		const links = container.querySelectorAll(
			"a[href]",
		) as NodeListOf<HTMLAnchorElement>;

		for (const link of links) {
			const href = link.getAttribute("href");
			if (!href || !isWikipediaLink(href)) continue;

			const articleTitle = extractArticleTitle(href);
			if (articleTitle && loadingLinks.has(articleTitle)) {
				link.style.opacity = "0.6";
				link.style.pointerEvents = "none";
				link.style.cursor = "wait";
			} else {
				link.style.opacity = "";
				link.style.pointerEvents = "";
				link.style.cursor = "";
			}
		}
	}, [loadingLinks, containerId, sanitizedHtml]);

	if (!sanitizedHtml) {
		return (
			<div className="text-muted-foreground">Loading article content...</div>
		);
	}

	return (
		<div
			id={containerId}
			className="wikipedia-article-content prose prose-sm dark:prose-invert max-w-none"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
			dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
			style={
				{
					// Custom CSS to style Wikipedia content - theme aware
					"--tw-prose-body": "hsl(var(--foreground))",
					"--tw-prose-headings": "hsl(var(--foreground))",
					"--tw-prose-links": "rgb(37 99 235)", // Keep link color consistent
					"--tw-prose-bold": "hsl(var(--foreground))",
					"--tw-prose-counters": "hsl(var(--muted-foreground))",
					"--tw-prose-bullets": "hsl(var(--border))",
					"--tw-prose-hr": "hsl(var(--border))",
					"--tw-prose-quotes": "hsl(var(--muted-foreground))",
					"--tw-prose-quote-borders": "hsl(var(--border))",
					"--tw-prose-captions": "hsl(var(--muted-foreground))",
					"--tw-prose-code": "hsl(var(--foreground))",
					"--tw-prose-pre-code": "hsl(var(--muted-foreground))",
					"--tw-prose-pre-bg": "hsl(var(--muted))",
					"--tw-prose-th-borders": "hsl(var(--border))",
					"--tw-prose-td-borders": "hsl(var(--border))",
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

  /* Simple link styling - all links get the same treatment */
  .wikipedia-article-content a {
    color: oklch(0.7686 0.1647 70.0804);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .wikipedia-article-content a:hover {
    color: oklch(0.6686 0.1647 70.0804);
    border-bottom-color: oklch(0.6686 0.1647 70.0804);
  }

  /* External links get a small icon */
  .wikipedia-article-content a[href^="http"]:not([href*="wikipedia.org"])::after,
  .wikipedia-article-content a[href^="https"]:not([href*="wikipedia.org"])::after {
    content: "↗";
    font-size: 0.75em;
    margin-left: 0.25em;
    opacity: 0.7;
  }

  /* Loading state for links */
  .wikipedia-article-content a[style*="cursor: wait"] {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 0.3;
    }
  }

  /* Hatnote styling */
  .wikipedia-article-content .hatnote {
    font-style: italic;
    margin: 0.5em 0;
    padding: 0.5em 1em;
    background: hsl(var(--muted));
    border-left: 4px solid hsl(var(--border));
    color: hsl(var(--muted-foreground));
    font-size: 0.9em;
    border-radius: 0.25rem;
  }

  /* Thumb (image) containers */
  .wikipedia-article-content .thumb {
    margin: 1em 0;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--muted));
    border-radius: 0.375rem;
    overflow: hidden;
  }

  .wikipedia-article-content .tright {
    float: right;
    clear: right;
    margin: 0 0 1em 1em;
    max-width: 350px;
  }

  .wikipedia-article-content .tleft {
    float: left;
    clear: left;
    margin: 0 1em 1em 0;
    max-width: 350px;
  }

  .wikipedia-article-content .thumbinner {
    padding: 0.5em;
    background: hsl(var(--muted));
    border-radius: 0.375rem;
  }

  .wikipedia-article-content .thumbimage {
    text-align: center;
    margin-bottom: 0.5em;
  }

  .wikipedia-article-content .thumbimage img {
    max-width: 100%;
    height: auto;
    border-radius: 0.25rem;
    margin: 0;
  }

  .wikipedia-article-content .thumbcaption {
    font-size: 0.875em;
    color: hsl(var(--muted-foreground));
    line-height: 1.4;
    text-align: left;
  }

  .wikipedia-article-content .text-align-center {
    text-align: center;
  }

  /* Multi-image thumbs */
  .wikipedia-article-content .tmulti .thumbinner {
    padding: 0.25em;
  }

  .wikipedia-article-content .tmulti .trow {
    display: block;
    margin-bottom: 0.5em;
  }

  .wikipedia-article-content .tmulti .theader {
    font-weight: bold;
    text-align: center;
    padding: 0.5em;
    background: hsl(var(--muted));
    border-bottom: 1px solid hsl(var(--border));
  }

  .wikipedia-article-content .tmulti .tsingle {
    margin-bottom: 0.5em;
  }

  /* Sidebar styling */
  .wikipedia-article-content .sidebar {
    float: right;
    clear: right;
    width: 300px;
    margin: 0 0 1em 1em;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--muted));
    border-radius: 0.375rem;
    font-size: 0.9em;
  }

  .wikipedia-article-content .sidebar-title,
  .wikipedia-article-content .sidebar-title-with-pretitle {
    background: hsl(var(--muted-foreground) / 0.1);
    padding: 0.5em;
    font-weight: bold;
    text-align: center;
    border-bottom: 1px solid hsl(var(--border));
  }

  .wikipedia-article-content .sidebar-pretitle {
    font-size: 0.8em;
    font-weight: normal;
    color: hsl(var(--muted-foreground));
  }

  .wikipedia-article-content .sidebar-content {
    padding: 0.5em;
  }

  .wikipedia-article-content .sidebar-list {
    margin-bottom: 0.5em;
  }

  .wikipedia-article-content .sidebar-list-title {
    font-weight: bold;
    padding: 0.25em 0;
    border-bottom: 1px solid hsl(var(--border));
    margin-bottom: 0.25em;
  }

  .wikipedia-article-content .sidebar-below {
    padding: 0.5em;
    border-top: 1px solid hsl(var(--border));
    text-align: center;
    font-size: 0.85em;
  }

  .wikipedia-article-content .sidebar-navbar {
    padding: 0.25em;
    border-top: 1px solid hsl(var(--border));
    text-align: center;
    font-size: 0.8em;
  }

  /* Infobox styling */
  .wikipedia-article-content .infobox {
    float: right;
    clear: right;
    width: 300px;
    margin: 0 0 1em 1em;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--muted));
    border-radius: 0.375rem;
    font-size: 0.9em;
  }

  .wikipedia-article-content .infobox th,
  .wikipedia-article-content .infobox td {
    padding: 0.5em;
    border-bottom: 1px solid hsl(var(--border));
  }

  .wikipedia-article-content .infobox th {
    background: hsl(var(--muted-foreground) / 0.1);
    font-weight: bold;
  }

  /* Navigation boxes */
  .wikipedia-article-content .navbox {
    border: 1px solid hsl(var(--border));
    background: hsl(var(--muted));
    margin: 1em 0;
    border-radius: 0.375rem;
    font-size: 0.9em;
  }

  /* Short description */
  .wikipedia-article-content .shortdescription {
    font-style: italic;
    color: hsl(var(--muted-foreground));
    margin-bottom: 1em;
    padding: 0.5em;
    background: hsl(var(--muted));
    border-radius: 0.25rem;
    font-size: 0.9em;
  }

  /* References and citations */
  .wikipedia-article-content .mw-ref,
  .wikipedia-article-content .reference {
    font-size: 0.8em;
    vertical-align: super;
    line-height: 0;
  }

  .wikipedia-article-content .cite-bracket {
    color: hsl(var(--muted-foreground));
  }

  .wikipedia-article-content .citation {
    font-size: 0.9em;
  }

  .wikipedia-article-content .mw-references-wrap {
    font-size: 0.875em;
    color: hsl(var(--muted-foreground));
  }

  /* Tables */
  .wikipedia-article-content table {
    border-collapse: collapse;
    margin: 1em 0;
    border: 1px solid hsl(var(--border));
    width: 100%;
  }

  .wikipedia-article-content th,
  .wikipedia-article-content td {
    border: 1px solid hsl(var(--border));
    padding: 0.5em;
    text-align: left;
  }

  .wikipedia-article-content th {
    background: hsl(var(--muted));
    font-weight: bold;
  }

  /* Blockquotes */
  .wikipedia-article-content blockquote {
    border-left: 4px solid hsl(var(--border));
    margin: 1em 0;
    padding-left: 1em;
    color: hsl(var(--muted-foreground));
    font-style: italic;
  }

  /* Hide unwanted elements */
  .wikipedia-article-content .mw-editsection,
  .wikipedia-article-content .noprint,
  .wikipedia-article-content .catlinks,
  .wikipedia-article-content .printfooter,
  .wikipedia-article-content .mw-jump-link,
  .wikipedia-article-content .nomobile {
    display: none !important;
  }

  /* MediaWiki figure styling */
  .wikipedia-article-content figure.mw-default-size {
    margin: 1em 0;
    display: inline-block;
    max-width: 100%;
  }

  .wikipedia-article-content .mw-file-description {
    display: block;
    text-decoration: none;
  }

  .wikipedia-article-content .mw-file-element {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
    border-radius: 0.25rem;
  }

  .wikipedia-article-content figcaption {
    font-size: 0.875em;
    color: hsl(var(--muted-foreground));
    line-height: 1.4;
    margin-top: 0.5em;
    padding: 0 0.5em;
    text-align: left;
  }

  /* Navigation hatnotes */
  .wikipedia-article-content .navigation-not-searchable {
    font-size: 0.85em;
    margin-bottom: 1.5em;
  }

  /* Convert template spans (measurements, etc.) */
  .wikipedia-article-content span[data-mw*="convert"] {
    white-space: nowrap;
  }

  /* Superscript references styling */
  .wikipedia-article-content .mw-ref {
    font-size: 0.75em;
    vertical-align: super;
    line-height: 0;
    margin-left: 0.1em;
  }

  .wikipedia-article-content .mw-reflink-text {
    color: oklch(0.7686 0.1647 70.0804);
    text-decoration: none;
  }

  .wikipedia-article-content .mw-reflink-text:hover {
    color: oklch(0.6686 0.1647 70.0804);
    text-decoration: underline;
  }

	.wikipedia-article-content .mw-reflink-text:hover {
    color: oklch(0.6686 0.1647 70.0804);
    text-decoration: underline;
  }

  /* Typography */
  .wikipedia-article-content h1,
  .wikipedia-article-content h2,
  .wikipedia-article-content h3,
  .wikipedia-article-content h4,
  .wikipedia-article-content h5,
  .wikipedia-article-content h6 {
    color: hsl(var(--foreground));
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  .wikipedia-article-content p {
    margin-bottom: 1em;
    color: hsl(var(--foreground));
  }

  .wikipedia-article-content ul,
  .wikipedia-article-content ol {
    margin-bottom: 1em;
    padding-left: 1.5em;
  }

  .wikipedia-article-content li {
    margin-bottom: 0.25em;
  }

  /* Images */
  .wikipedia-article-content img {
    max-width: fit-content;
    height: auto;
    margin: 1em 0;
    border-radius: 0.375rem;
  }

  /* Collapsible content */
  .wikipedia-article-content .mw-collapsible-content {
    margin-top: 0.5em;
  }

  .wikipedia-article-content .mw-collapsed .mw-collapsible-content {
    display: none;
  }

  /* Horizontal lists */
  .wikipedia-article-content .hlist ul,
  .wikipedia-article-content .hlist ol {
    list-style: none;
    padding: 0;
  }

  .wikipedia-article-content .hlist li {
    display: inline;
    margin: 0;
  }

  .wikipedia-article-content .hlist li:not(:last-child)::after {
    content: " • ";
    color: hsl(var(--muted-foreground));
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .wikipedia-article-content .thumb.tright,
    .wikipedia-article-content .thumb.tleft,
    .wikipedia-article-content .sidebar,
    .wikipedia-article-content .infobox {
      float: none;
      width: 100%;
      margin: 1em 0;
    }
  }

  /* Side boxes (sister project boxes) */
  .wikipedia-article-content .side-box {
    border: 1px solid hsl(var(--border));
    background: hsl(var(--muted));
    margin: 0.5em 0;
    border-radius: 0.375rem;
    font-size: 0.9em;
  }

  .wikipedia-article-content .side-box-right {
    float: right;
    clear: right;
    width: 300px;
    margin: 0 0 1em 1em;
  }

  .wikipedia-article-content .side-box-flex {
    display: flex;
    align-items: flex-start;
    padding: 0.75em;
    gap: 0.75em;
  }

  .wikipedia-article-content .side-box-image {
    flex-shrink: 0;
  }

  .wikipedia-article-content .side-box-image img {
    width: 40px;
    height: 40px;
    margin: 0;
  }

  .wikipedia-article-content .side-box-text {
    flex: 1;
    line-height: 1.4;
  }

  .wikipedia-article-content .sistersitebox {
    background: hsl(var(--muted));
  }

  .wikipedia-article-content .plainlinks a.external {
    color: oklch(0.7686 0.1647 70.0804) !important;
  }

  .wikipedia-article-content .plainlist ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  /* Navigation boxes */
  .wikipedia-article-content .navbox {
    border: 1px solid hsl(var(--border));
    background: hsl(var(--muted));
    margin: 1em 0;
    border-radius: 0.375rem;
    font-size: 0.9em;
    width: 100%;
    clear: both;
  }

  .wikipedia-article-content .navbox-inner {
    width: 100%;
    border-collapse: collapse;
  }

  .wikipedia-article-content .navbox-title {
    background: hsl(var(--muted-foreground) / 0.1);
    padding: 0.5em;
    font-weight: bold;
    text-align: center;
    border-bottom: 1px solid hsl(var(--border));
  }

  .wikipedia-article-content .navbox-group {
    background: hsl(var(--muted-foreground) / 0.05);
    padding: 0.5em;
    font-weight: bold;
    text-align: right;
    vertical-align: top;
    border-right: 1px solid hsl(var(--border));
    width: 1%;
    white-space: nowrap;
  }

  .wikipedia-article-content .navbox-list {
    padding: 0.5em;
    text-align: left;
  }

  .wikipedia-article-content .navbox-list-with-group {
    padding-left: 0.5em;
  }

  .wikipedia-article-content .navbox-odd {
    background: hsl(var(--muted));
  }

  .wikipedia-article-content .navbox-even {
    background: hsl(var(--background));
  }

  .wikipedia-article-content .navbox-subgroup {
    width: 100%;
    border-collapse: collapse;
  }

  .wikipedia-article-content .navbox-abovebelow {
    background: hsl(var(--muted-foreground) / 0.05);
    padding: 0.5em;
    text-align: center;
    border-top: 1px solid hsl(var(--border));
  }

  /* Navbar mini (v/t/e links) */
  .wikipedia-article-content .navbar {
    float: left;
    margin-right: 0.5em;
  }

  .wikipedia-article-content .navbar-mini {
    font-size: 0.8em;
  }

  .wikipedia-article-content .navbar ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: inline-flex;
    gap: 0.25em;
  }

  .wikipedia-article-content .navbar li {
    margin: 0;
  }

  .wikipedia-article-content .navbar li:not(:last-child)::after {
    content: " • ";
    color: hsl(var(--muted-foreground));
    margin-left: 0.25em;
  }

  /* Collapsible content */
  .wikipedia-article-content .mw-collapsible-content {
    margin-top: 0.5em;
  }

  .wikipedia-article-content .mw-collapsed .mw-collapsible-content {
    display: none;
  }

  .wikipedia-article-content .autocollapse .mw-collapsible-content {
    display: none;
  }

  /* Portal bar */
  .wikipedia-article-content .portal-bar {
    border: 1px solid hsl(var(--border));
    background: hsl(var(--muted));
    margin: 1em 0;
    padding: 0.5em;
    border-radius: 0.375rem;
    font-size: 0.9em;
  }

  .wikipedia-article-content .portal-bar-header {
    font-weight: bold;
    margin-right: 0.5em;
  }

  .wikipedia-article-content .portal-bar-content {
    list-style: none;
    padding: 0;
    margin: 0;
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.5em;
  }

  .wikipedia-article-content .portal-bar-item {
    margin: 0;
  }

  .wikipedia-article-content .portal-bar-item:not(:last-child)::after {
    content: " • ";
    color: hsl(var(--muted-foreground));
    margin-left: 0.5em;
  }

  /* Authority control */
  .wikipedia-article-content .authority-control {
    font-size: 0.85em;
  }

  .wikipedia-article-content .authority-control .navbox-group {
    width: 15%;
    min-width: 100px;
  }

  /* External links styling */
  .wikipedia-article-content .external {
    color: oklch(0.7686 0.1647 70.0804);
  }

  .wikipedia-article-content .external:hover {
    color: oklch(0.6686 0.1647 70.0804);
  }

  /* Citation styling */
  .wikipedia-article-content .citation {
    font-size: 0.9em;
  }

  .wikipedia-article-content .cs1-format {
    font-size: 0.8em;
    color: hsl(var(--muted-foreground));
  }

  .wikipedia-article-content .reference-accessdate {
    font-size: 0.8em;
    color: hsl(var(--muted-foreground));
  }

  .wikipedia-article-content .nowrap {
    white-space: nowrap;
  }

  /* Self links */
  .wikipedia-article-content .mw-selflink {
    font-weight: bold;
    color: hsl(var(--foreground));
    text-decoration: none;
  }

  .wikipedia-article-content .selflink {
    font-weight: bold;
    color: hsl(var(--foreground));
    text-decoration: none;
  }

  /* New/red links */
  .wikipedia-article-content .new {
    color: #ba0000;
  }

  .wikipedia-article-content .new:hover {
    color: #a00000;
  }

  /* No viewer class */
  .wikipedia-article-content .noviewer {
    /* Keep images that shouldn't be viewed in media viewer */
  }

  /* Flag icons */
  .wikipedia-article-content .flagicon {
    display: inline-block;
    margin-right: 0.25em;
  }

  .wikipedia-article-content .flagicon img {
    margin: 0;
    vertical-align: middle;
  }

  /* Responsive adjustments for new elements */
  @media (max-width: 768px) {
    .wikipedia-article-content .side-box-right {
      float: none;
      width: 100%;
      margin: 1em 0;
    }

    .wikipedia-article-content .navbox-group {
      text-align: left;
      white-space: normal;
    }

    .wikipedia-article-content .portal-bar-content {
      flex-direction: column;
      gap: 0.25em;
    }

    .wikipedia-article-content .portal-bar-item:not(:last-child)::after {
      display: none;
    }
  }
`;
