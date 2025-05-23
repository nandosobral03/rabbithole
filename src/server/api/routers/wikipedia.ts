import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

interface WikipediaLink {
  title: string;
  url: string;
}

interface WikipediaPageData {
  title: string;
  content: string;
  links: WikipediaLink[];
  url: string;
}

interface WikipediaFullPageData {
  title: string;
  content: string;
  fullHtml: string;
  links: WikipediaLink[];
  url: string;
}

export const wikipediaRouter = createTRPCRouter({
  fetchPageWithLinks: publicProcedure
    .input(
      z.object({
        title: z.string().min(1, "Page title is required"),
      })
    )
    .mutation(async ({ input }): Promise<WikipediaPageData> => {
      try {
        // Extract title from URL if a full Wikipedia URL was provided
        let cleanTitle = input.title.trim();

        // Check if input is a Wikipedia URL and extract the title
        const wikipediaUrlPattern = /(?:https?:\/\/)?(?:www\.)?(?:[a-z]+\.)?wikipedia\.org\/wiki\/(.+)/i;
        const urlMatch = cleanTitle.match(wikipediaUrlPattern);

        if (urlMatch?.[1]) {
          cleanTitle = decodeURIComponent(urlMatch[1]).replace(/_/g, " ");
        }

        const encodedTitle = encodeURIComponent(cleanTitle);

        console.log(`Fetching Wikipedia page: "${cleanTitle}" (encoded: "${encodedTitle}")`);

        // Fetch page content and info
        const pageResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`);

        if (!pageResponse.ok) {
          const errorText = await pageResponse.text();
          console.error(`Wikipedia API error for "${cleanTitle}":`, pageResponse.status, errorText);
          throw new Error(`Wikipedia page not found: "${cleanTitle}". Status: ${pageResponse.status}`);
        }

        const pageData = await pageResponse.json();

        // Fetch outgoing links from the page
        const linksResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=links&titles=${encodedTitle}&pllimit=500&plnamespace=0&origin=*`);

        if (!linksResponse.ok) {
          console.error(`Failed to fetch links for "${cleanTitle}":`, linksResponse.status);
          throw new Error("Failed to fetch page links");
        }

        const linksData = await linksResponse.json();
        const pages = linksData.query?.pages || {};
        const pageIds = Object.keys(pages);
        const pageId = pageIds[0];
        const pageLinks = pageId ? pages[pageId]?.links || [] : [];

        // Transform links to our format with comprehensive filtering
        const links: WikipediaLink[] = pageLinks
          .filter((link: { title: string }) => {
            const title = link.title;

            // Filter out Wikipedia administrative and non-article pages
            const excludedPrefixes = [
              "Category:",
              "File:",
              "Template:",
              "Wikipedia:",
              "Help:",
              "Portal:",
              "Project:",
              "User:",
              "User talk:",
              "Talk:",
              "Special:",
              "MediaWiki:",
              "Module:",
              "Draft:",
              "TimedText:",
              "Media:",
              "Book:",
              "Education Program:",
              "Gadget:",
              "Gadget definition:",
              "Topic:",
            ];

            // Check if title starts with any excluded prefix
            if (excludedPrefixes.some((prefix) => title.startsWith(prefix))) {
              return false;
            }

            // Filter out common navigation and template elements
            const excludedPatterns = [
              /^List of /, // Often navigation lists
              /disambiguation$/i,
              /\(disambiguation\)$/i,
              /^Index of /,
              /^Outline of /,
              /^Timeline of /,
              /^Glossary of /,
              /^Bibliography of /,
              / navigation$/i,
              / template$/i,
              /^Navigation /,
              /^Template /,
            ];

            // Check if title matches any excluded pattern
            if (excludedPatterns.some((pattern) => pattern.test(title))) {
              return false;
            }

            // Filter out very short titles (likely navigation elements)
            if (title.length < 3) {
              return false;
            }

            // Filter out titles that are mostly numbers or symbols (like coordinates, IDs)
            if (/^[\d\s\-–—.,:;]+$/.test(title)) {
              return false;
            }

            return true;
          })
          .slice(0, 50) // Limit to first 50 links for performance
          .map((link: { title: string }) => ({
            title: link.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(link.title.replace(/ /g, "_"))}`,
          }));

        return {
          title: pageData.title || cleanTitle,
          content: pageData.extract || "No content available",
          links,
          url: pageData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodedTitle}`,
        };
      } catch (error) {
        throw new Error(error instanceof Error ? `Failed to fetch Wikipedia data: ${error.message}` : "Failed to fetch Wikipedia data");
      }
    }),

  fetchFullPageWithLinks: publicProcedure
    .input(
      z.object({
        title: z.string().min(1, "Page title is required"),
      })
    )
    .mutation(async ({ input }): Promise<WikipediaFullPageData> => {
      try {
        // Extract title from URL if a full Wikipedia URL was provided
        let cleanTitle = input.title.trim();

        // Check if input is a Wikipedia URL and extract the title
        const wikipediaUrlPattern = /(?:https?:\/\/)?(?:www\.)?(?:[a-z]+\.)?wikipedia\.org\/wiki\/(.+)/i;
        const urlMatch = cleanTitle.match(wikipediaUrlPattern);

        if (urlMatch?.[1]) {
          cleanTitle = decodeURIComponent(urlMatch[1]).replace(/_/g, " ");
        }

        const encodedTitle = encodeURIComponent(cleanTitle);

        console.log(`Fetching full Wikipedia page: "${cleanTitle}" (encoded: "${encodedTitle}")`);

        // Fetch full HTML content
        const htmlResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/html/${encodedTitle}`);

        if (!htmlResponse.ok) {
          const errorText = await htmlResponse.text();
          console.error(`Wikipedia HTML API error for "${cleanTitle}":`, htmlResponse.status, errorText);
          throw new Error(`Wikipedia page not found: "${cleanTitle}". Status: ${htmlResponse.status}`);
        }

        const fullHtml = await htmlResponse.text();

        // Also fetch page summary for metadata
        const summaryResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`);

        const summaryData = summaryResponse.ok ? await summaryResponse.json() : null;

        // Fetch outgoing links from the page
        const linksResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=links&titles=${encodedTitle}&pllimit=500&plnamespace=0&origin=*`);

        if (!linksResponse.ok) {
          console.error(`Failed to fetch links for "${cleanTitle}":`, linksResponse.status);
          throw new Error("Failed to fetch page links");
        }

        const linksData = await linksResponse.json();
        const pages = linksData.query?.pages || {};
        const pageIds = Object.keys(pages);
        const pageId = pageIds[0];
        const pageLinks = pageId ? pages[pageId]?.links || [] : [];

        // Transform links to our format with comprehensive filtering
        const links: WikipediaLink[] = pageLinks
          .filter((link: { title: string }) => {
            const title = link.title;

            // Filter out Wikipedia administrative and non-article pages
            const excludedPrefixes = [
              "Category:",
              "File:",
              "Template:",
              "Wikipedia:",
              "Help:",
              "Portal:",
              "Project:",
              "User:",
              "User talk:",
              "Talk:",
              "Special:",
              "MediaWiki:",
              "Module:",
              "Draft:",
              "TimedText:",
              "Media:",
              "Book:",
              "Education Program:",
              "Gadget:",
              "Gadget definition:",
              "Topic:",
            ];

            // Check if title starts with any excluded prefix
            if (excludedPrefixes.some((prefix) => title.startsWith(prefix))) {
              return false;
            }

            // Filter out common navigation and template elements
            const excludedPatterns = [
              /^List of /, // Often navigation lists
              /disambiguation$/i,
              /\(disambiguation\)$/i,
              /^Index of /,
              /^Outline of /,
              /^Timeline of /,
              /^Glossary of /,
              /^Bibliography of /,
              / navigation$/i,
              / template$/i,
              /^Navigation /,
              /^Template /,
            ];

            // Check if title matches any excluded pattern
            if (excludedPatterns.some((pattern) => pattern.test(title))) {
              return false;
            }

            // Filter out very short titles (likely navigation elements)
            if (title.length < 3) {
              return false;
            }

            // Filter out titles that are mostly numbers or symbols (like coordinates, IDs)
            if (/^[\d\s\-–—.,:;]+$/.test(title)) {
              return false;
            }

            return true;
          })
          .slice(0, 50) // Limit to first 50 links for performance
          .map((link: { title: string }) => ({
            title: link.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(link.title.replace(/ /g, "_"))}`,
          }));

        return {
          title: summaryData?.title || cleanTitle,
          content: summaryData?.extract || "No content available",
          fullHtml,
          links,
          url: summaryData?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodedTitle}`,
        };
      } catch (error) {
        throw new Error(error instanceof Error ? `Failed to fetch Wikipedia data: ${error.message}` : "Failed to fetch Wikipedia data");
      }
    }),
});
