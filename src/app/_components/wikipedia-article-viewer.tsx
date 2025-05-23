"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

interface WikipediaArticleViewerProps {
  htmlContent: string;
  title: string;
  onLinkClick?: (title: string) => void;
}

export function WikipediaArticleViewer({ htmlContent, title, onLinkClick }: WikipediaArticleViewerProps) {
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
      ALLOWED_ATTR: ["class", "id", "href", "title", "alt", "src", "width", "height", "data-*", "aria-*", "role", "tabindex", "colspan", "rowspan"],
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
    links.forEach((link, index) => {
      if (index < 5) {
        // Log first 5 links
        console.log(`Link ${index}:`, link.getAttribute("href"));
      }
    });
  }, [htmlContent]);

  useEffect(() => {
    if (!sanitizedHtml || !onLinkClick) return;

    const container = document.getElementById(`wikipedia-content-${title.replace(/\s+/g, "-")}`);
    if (!container) {
      console.log("Container not found for:", `wikipedia-content-${title.replace(/\s+/g, "-")}`);
      return;
    }

    console.log("Setting up click handler for container:", container);

    const handleLinkClick = (e: Event) => {
      console.log("🔍 Click detected on:", e.target);

      const target = e.target as HTMLElement;

      // Handle clicks on anchor tags or their children
      const anchor = target.closest("a");

      if (anchor) {
        console.log("🎯 Found anchor tag:", anchor);
        console.log("⛔ Preventing default navigation");
        e.preventDefault();
        e.stopPropagation();

        const href = anchor.getAttribute("href");
        console.log("🔗 Anchor href attribute:", href);

        if (href) {
          // Handle both relative and absolute Wikipedia links
          let articleTitle = "";

          if (href.startsWith("./")) {
            // Wikipedia HTML API format: ./Article_name
            console.log("📝 Processing Wikipedia HTML API relative link");
            articleTitle = decodeURIComponent(href.replace("./", "")).replace(/_/g, " ");
          } else if (href.startsWith("/wiki/")) {
            // Traditional Wikipedia link format: /wiki/Article_name
            console.log("📝 Processing traditional Wikipedia link");
            articleTitle = decodeURIComponent(href.replace("/wiki/", "")).replace(/_/g, " ");
          } else if (href.includes("wikipedia.org/wiki/")) {
            // Absolute Wikipedia link: https://en.wikipedia.org/wiki/Article_name
            console.log("🌐 Processing absolute Wikipedia link");
            const match = href.match(/\/wiki\/([^#?]+)/);
            if (match?.[1]) {
              articleTitle = decodeURIComponent(match[1]).replace(/_/g, " ");
            }
          } else {
            console.log("❌ Not a Wikipedia link, href:", href);
            return;
          }

          if (articleTitle && articleTitle.trim()) {
            console.log("✅ Calling onLinkClick with article:", articleTitle);
            onLinkClick(articleTitle);
          } else {
            console.log("❌ No valid article title extracted from:", href);
          }
        } else {
          console.log("❌ No href attribute found on anchor");
        }
      } else {
        console.log("❌ Click target is not an anchor or child of anchor");
      }
    };

    // Use capture phase to ensure we catch the event early
    console.log("🔧 Attaching click listener with capture=true");
    container.addEventListener("click", handleLinkClick, true);

    return () => {
      console.log("🧹 Removing click listener");
      container.removeEventListener("click", handleLinkClick, true);
    };
  }, [sanitizedHtml, onLinkClick, title]);

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

  .wikipedia-article-content a {
    color: #0645ad;
    text-decoration: none;
  }

  .wikipedia-article-content a:hover {
    text-decoration: underline;
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
`;
