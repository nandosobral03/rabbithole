CREATE TABLE `rabbithole_article_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_title` text NOT NULL,
	`article_url` text NOT NULL,
	`totalAppearances` integer DEFAULT 1 NOT NULL,
	`totalConnections` integer DEFAULT 0 NOT NULL,
	`averageConnections` real DEFAULT 0 NOT NULL,
	`firstSeenAt` integer DEFAULT (unixepoch()) NOT NULL,
	`lastSeenAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `article_title_idx` ON `rabbithole_article_analytics` (`article_title`);--> statement-breakpoint
CREATE INDEX `total_appearances_idx` ON `rabbithole_article_analytics` (`totalAppearances`);--> statement-breakpoint
CREATE INDEX `total_connections_idx` ON `rabbithole_article_analytics` (`totalConnections`);--> statement-breakpoint
CREATE INDEX `average_connections_idx` ON `rabbithole_article_analytics` (`averageConnections`);--> statement-breakpoint
CREATE TABLE `rabbithole_connection_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_article` text NOT NULL,
	`target_article` text NOT NULL,
	`connectionCount` integer DEFAULT 1 NOT NULL,
	`firstSeenAt` integer DEFAULT (unixepoch()) NOT NULL,
	`lastSeenAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `source_target_idx` ON `rabbithole_connection_analytics` (`source_article`,`target_article`);--> statement-breakpoint
CREATE INDEX `connection_count_idx` ON `rabbithole_connection_analytics` (`connectionCount`);--> statement-breakpoint
CREATE INDEX `source_article_idx` ON `rabbithole_connection_analytics` (`source_article`);--> statement-breakpoint
CREATE INDEX `target_article_idx` ON `rabbithole_connection_analytics` (`target_article`);--> statement-breakpoint
CREATE TABLE `rabbithole_node_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rabbithole_id` text NOT NULL,
	`article_title` text NOT NULL,
	`incomingConnections` integer DEFAULT 0 NOT NULL,
	`outgoingConnections` integer DEFAULT 0 NOT NULL,
	`nodeSize` integer DEFAULT 0 NOT NULL,
	`contentLength` integer DEFAULT 0 NOT NULL,
	`isRootNode` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`rabbithole_id`) REFERENCES `rabbithole_shared_rabbithole`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rabbithole_node_idx` ON `rabbithole_node_analytics` (`rabbithole_id`,`article_title`);--> statement-breakpoint
CREATE INDEX `incoming_connections_idx` ON `rabbithole_node_analytics` (`incomingConnections`);--> statement-breakpoint
CREATE INDEX `outgoing_connections_idx` ON `rabbithole_node_analytics` (`outgoingConnections`);--> statement-breakpoint
CREATE INDEX `node_size_idx` ON `rabbithole_node_analytics` (`nodeSize`);--> statement-breakpoint
CREATE INDEX `content_length_idx` ON `rabbithole_node_analytics` (`contentLength`);--> statement-breakpoint
CREATE INDEX `is_root_node_idx` ON `rabbithole_node_analytics` (`isRootNode`);--> statement-breakpoint
CREATE TABLE `rabbithole_post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `name_idx` ON `rabbithole_post` (`name`);--> statement-breakpoint
CREATE TABLE `rabbithole_shared_rabbithole` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`graph_data` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	`lastAccessedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`expiresAt` integer NOT NULL,
	`viewCount` integer DEFAULT 0 NOT NULL,
	`nodeCount` integer DEFAULT 0 NOT NULL,
	`linkCount` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `rabbithole_shared_rabbithole` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `last_accessed_idx` ON `rabbithole_shared_rabbithole` (`lastAccessedAt`);--> statement-breakpoint
CREATE INDEX `node_count_idx` ON `rabbithole_shared_rabbithole` (`nodeCount`);--> statement-breakpoint
CREATE INDEX `link_count_idx` ON `rabbithole_shared_rabbithole` (`linkCount`);