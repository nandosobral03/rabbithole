// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { index, sqliteTableCreator, text } from "drizzle-orm/sqlite-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `rabbithole_${name}`);

export const posts = createTable(
	"post",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		name: d.text({ length: 256 }),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [index("name_idx").on(t.name)],
);

export const sharedRabbitholes = createTable(
	"shared_rabbithole",
	(d) => ({
		id: text("id").primaryKey(), // UUID for sharing
		title: text("title").notNull(), // Title of the rabbit hole
		creatorName: text("creator_name"), // Optional creator name
		description: text("description"), // Optional description
		graphData: text("graph_data").notNull(), // JSON string of the graph data
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
		lastAccessedAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		expiresAt: d.integer({ mode: "timestamp" }).notNull(), // Expiration timestamp
		viewCount: d.integer().default(0).notNull(), // Track how many times it's been viewed
		nodeCount: d.integer().default(0).notNull(), // Number of nodes in this rabbit hole
		linkCount: d.integer().default(0).notNull(), // Number of links in this rabbit hole
	}),
	(t) => [
		index("expires_at_idx").on(t.expiresAt),
		index("last_accessed_idx").on(t.lastAccessedAt),
		index("node_count_idx").on(t.nodeCount),
		index("link_count_idx").on(t.linkCount),
	],
);

// Track which articles appear across rabbit holes
export const articleAnalytics = createTable(
	"article_analytics",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		articleTitle: text("article_title").notNull(), // Wikipedia article title
		articleUrl: text("article_url").notNull(), // Wikipedia URL
		totalAppearances: d.integer().default(1).notNull(), // How many rabbit holes contain this article
		totalConnections: d.integer().default(0).notNull(), // Total number of connections across all rabbit holes
		averageConnections: d.real().default(0).notNull(), // Average connections per appearance
		firstSeenAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		lastSeenAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [
		index("article_title_idx").on(t.articleTitle),
		index("total_appearances_idx").on(t.totalAppearances),
		index("total_connections_idx").on(t.totalConnections),
		index("average_connections_idx").on(t.averageConnections),
	],
);

// Track individual node statistics within each rabbit hole
export const nodeAnalytics = createTable(
	"node_analytics",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		rabbitholeId: text("rabbithole_id")
			.notNull()
			.references(() => sharedRabbitholes.id, { onDelete: "cascade" }),
		articleTitle: text("article_title").notNull(),
		incomingConnections: d.integer().default(0).notNull(), // How many nodes point to this one
		outgoingConnections: d.integer().default(0).notNull(), // How many nodes this one points to
		nodeSize: d.integer().default(0).notNull(), // The calculated node size (val)
		contentLength: d.integer().default(0).notNull(), // Length of article content
		isRootNode: d.integer({ mode: "boolean" }).default(false).notNull(), // Was this the starting node
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [
		index("rabbithole_node_idx").on(t.rabbitholeId, t.articleTitle),
		index("incoming_connections_idx").on(t.incomingConnections),
		index("outgoing_connections_idx").on(t.outgoingConnections),
		index("node_size_idx").on(t.nodeSize),
		index("content_length_idx").on(t.contentLength),
		index("is_root_node_idx").on(t.isRootNode),
	],
);

// Track connection patterns between articles
export const connectionAnalytics = createTable(
	"connection_analytics",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		sourceArticle: text("source_article").notNull(),
		targetArticle: text("target_article").notNull(),
		connectionCount: d.integer().default(1).notNull(), // How many times this connection appears across rabbit holes
		firstSeenAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		lastSeenAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [
		index("source_target_idx").on(t.sourceArticle, t.targetArticle),
		index("connection_count_idx").on(t.connectionCount),
		index("source_article_idx").on(t.sourceArticle),
		index("target_article_idx").on(t.targetArticle),
	],
);
