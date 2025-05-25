import { and, desc, eq, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
	articleAnalytics,
	connectionAnalytics,
	nodeAnalytics,
	sharedRabbitholes,
} from "~/server/db/schema";

// Schema for graph data validation
const GraphNodeSchema = z.object({
	id: z.string(),
	title: z.string(),
	content: z.string(),
	fullHtml: z.string(),
	url: z.string(),
	outgoingLinks: z.array(
		z.object({
			title: z.string(),
			url: z.string(),
		}),
	),
	expanded: z.boolean(),
	val: z.number(),
	color: z.string(),
});

const GraphLinkSchema = z.object({
	source: z.string(),
	target: z.string(),
	id: z.string(),
});

const GraphDataSchema = z.object({
	nodes: z.array(GraphNodeSchema),
	links: z.array(GraphLinkSchema),
});

export const rabbitholeRouter = createTRPCRouter({
	// Save a new rabbit hole and return sharing ID
	share: publicProcedure
		.input(
			z.object({
				title: z.string().min(1).max(200),
				creatorName: z.string().max(100).optional(),
				description: z.string().max(500).optional(),
				graphData: GraphDataSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const id = nanoid(12); // Generate a short, URL-friendly ID
			const now = new Date();
			const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now

			const { graphData } = input;
			const nodeCount = graphData.nodes.length;
			const linkCount = graphData.links.length;

			// Save the rabbit hole
			await ctx.db.insert(sharedRabbitholes).values({
				id,
				title: input.title,
				creatorName: input.creatorName,
				description: input.description,
				graphData: JSON.stringify(input.graphData),
				expiresAt,
				lastAccessedAt: now,
				nodeCount,
				linkCount,
			});

			// Collect analytics data
			await collectAnalytics(ctx.db, id, graphData);

			return { id, expiresAt };
		}),

	// Load a shared rabbit hole by ID
	load: publicProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// First, clean up expired rabbit holes
			await ctx.db
				.delete(sharedRabbitholes)
				.where(lt(sharedRabbitholes.expiresAt, new Date()));

			// Find the rabbit hole
			const rabbithole = await ctx.db.query.sharedRabbitholes.findFirst({
				where: eq(sharedRabbitholes.id, input.id),
			});

			if (!rabbithole) {
				throw new Error("Rabbit hole not found or has expired");
			}

			// Extend expiration by 1 week and update last accessed
			const now = new Date();
			const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

			await ctx.db
				.update(sharedRabbitholes)
				.set({
					lastAccessedAt: now,
					expiresAt: newExpiresAt,
					viewCount: rabbithole.viewCount + 1,
				})
				.where(eq(sharedRabbitholes.id, input.id));

			// Parse and return the graph data
			const graphData = JSON.parse(rabbithole.graphData) as z.infer<
				typeof GraphDataSchema
			>;

			return {
				id: rabbithole.id,
				title: rabbithole.title,
				creatorName: rabbithole.creatorName,
				description: rabbithole.description,
				graphData,
				createdAt: rabbithole.createdAt,
				viewCount: rabbithole.viewCount + 1,
				expiresAt: newExpiresAt,
			};
		}),

	// Analytics: Get most popular articles across all rabbit holes
	getPopularArticles: publicProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			return await ctx.db.query.articleAnalytics.findMany({
				orderBy: [
					desc(articleAnalytics.totalAppearances),
					desc(articleAnalytics.totalConnections),
				],
				limit: input.limit,
			});
		}),

	// Get recent rabbit holes
	getRecentRabbitholes: publicProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(10),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Clean up expired rabbit holes first
			await ctx.db
				.delete(sharedRabbitholes)
				.where(lt(sharedRabbitholes.expiresAt, new Date()));

			return await ctx.db.query.sharedRabbitholes.findMany({
				columns: {
					id: true,
					title: true,
					creatorName: true,
					description: true,
					createdAt: true,
					viewCount: true,
					nodeCount: true,
					linkCount: true,
				},
				orderBy: [desc(sharedRabbitholes.createdAt)],
				limit: input.limit,
			});
		}),

	// Analytics: Get rabbit hole statistics
	getRabbitholeStats: publicProcedure.query(async ({ ctx }) => {
		const totalRabbitholes = await ctx.db
			.select({ count: sql<number>`count(*)` })
			.from(sharedRabbitholes)
			.where(sql`${sharedRabbitholes.expiresAt} > ${Date.now() / 1000}`);

		const avgStats = await ctx.db
			.select({
				avgNodes: sql<number>`avg(${sharedRabbitholes.nodeCount})`,
				avgLinks: sql<number>`avg(${sharedRabbitholes.linkCount})`,
				avgViews: sql<number>`avg(${sharedRabbitholes.viewCount})`,
				maxNodes: sql<number>`max(${sharedRabbitholes.nodeCount})`,
				maxLinks: sql<number>`max(${sharedRabbitholes.linkCount})`,
				maxViews: sql<number>`max(${sharedRabbitholes.viewCount})`,
			})
			.from(sharedRabbitholes)
			.where(sql`${sharedRabbitholes.expiresAt} > ${Date.now() / 1000}`);

		const totalArticles = await ctx.db
			.select({ count: sql<number>`count(*)` })
			.from(articleAnalytics);

		const totalConnections = await ctx.db
			.select({ count: sql<number>`count(*)` })
			.from(connectionAnalytics);

		return {
			totalRabbitholes: totalRabbitholes[0]?.count ?? 0,
			totalArticles: totalArticles[0]?.count ?? 0,
			totalConnections: totalConnections[0]?.count ?? 0,
			averageNodes: Math.round(avgStats[0]?.avgNodes ?? 0),
			averageLinks: Math.round(avgStats[0]?.avgLinks ?? 0),
			averageViews: Math.round(avgStats[0]?.avgViews ?? 0),
			maxNodes: avgStats[0]?.maxNodes ?? 0,
			maxLinks: avgStats[0]?.maxLinks ?? 0,
			maxViews: avgStats[0]?.maxViews ?? 0,
		};
	}),

	// Analytics: Get most connected articles (highest average connections)
	getMostConnectedArticles: publicProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			return await ctx.db.query.articleAnalytics.findMany({
				orderBy: [
					desc(articleAnalytics.averageConnections),
					desc(articleAnalytics.totalConnections),
				],
				limit: input.limit,
			});
		}),

	// Analytics: Get most common connections between articles
	getPopularConnections: publicProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			return await ctx.db.query.connectionAnalytics.findMany({
				orderBy: [desc(connectionAnalytics.connectionCount)],
				limit: input.limit,
			});
		}),
});

// Helper function to collect analytics data
async function collectAnalytics(
	db: typeof import("~/server/db").db,
	rabbitholeId: string,
	graphData: z.infer<typeof GraphDataSchema>,
) {
	const now = new Date();

	// Calculate connection counts for each node
	const nodeConnections = new Map<
		string,
		{ incoming: number; outgoing: number }
	>();

	// Initialize all nodes
	for (const node of graphData.nodes) {
		nodeConnections.set(node.id, { incoming: 0, outgoing: 0 });
	}

	// Count connections
	for (const link of graphData.links) {
		const source = nodeConnections.get(link.source) ?? {
			incoming: 0,
			outgoing: 0,
		};
		const target = nodeConnections.get(link.target) ?? {
			incoming: 0,
			outgoing: 0,
		};

		source.outgoing++;
		target.incoming++;

		nodeConnections.set(link.source, source);
		nodeConnections.set(link.target, target);
	}

	// Insert node analytics
	for (const node of graphData.nodes) {
		const connections = nodeConnections.get(node.id) ?? {
			incoming: 0,
			outgoing: 0,
		};

		await db.insert(nodeAnalytics).values({
			rabbitholeId,
			articleTitle: node.title,
			incomingConnections: connections.incoming,
			outgoingConnections: connections.outgoing,
			nodeSize: node.val,
			contentLength: node.content.length,
			isRootNode: connections.incoming === 0, // Root nodes have no incoming connections
		});
	}

	// Update article analytics
	for (const node of graphData.nodes) {
		const connections = nodeConnections.get(node.id) ?? {
			incoming: 0,
			outgoing: 0,
		};
		const totalConnections = connections.incoming + connections.outgoing;

		// Try to update existing article
		const existing = await db.query.articleAnalytics.findFirst({
			where: eq(articleAnalytics.articleTitle, node.title),
		});

		if (existing) {
			const newTotalAppearances = existing.totalAppearances + 1;
			const newTotalConnections = existing.totalConnections + totalConnections;
			const newAverageConnections = newTotalConnections / newTotalAppearances;

			await db
				.update(articleAnalytics)
				.set({
					totalAppearances: newTotalAppearances,
					totalConnections: newTotalConnections,
					averageConnections: newAverageConnections,
					lastSeenAt: now,
				})
				.where(eq(articleAnalytics.id, existing.id));
		} else {
			// Insert new article
			await db.insert(articleAnalytics).values({
				articleTitle: node.title,
				articleUrl: node.url,
				totalAppearances: 1,
				totalConnections: totalConnections,
				averageConnections: totalConnections,
				firstSeenAt: now,
				lastSeenAt: now,
			});
		}
	}

	// Update connection analytics
	for (const link of graphData.links) {
		const existing = await db.query.connectionAnalytics.findFirst({
			where: and(
				eq(connectionAnalytics.sourceArticle, link.source),
				eq(connectionAnalytics.targetArticle, link.target),
			),
		});

		if (existing) {
			await db
				.update(connectionAnalytics)
				.set({
					connectionCount: existing.connectionCount + 1,
					lastSeenAt: now,
				})
				.where(eq(connectionAnalytics.id, existing.id));
		} else {
			await db.insert(connectionAnalytics).values({
				sourceArticle: link.source,
				targetArticle: link.target,
				connectionCount: 1,
				firstSeenAt: now,
				lastSeenAt: now,
			});
		}
	}
}
