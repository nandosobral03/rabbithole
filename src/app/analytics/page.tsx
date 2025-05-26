"use client";

import {
	ArrowRight,
	BarChart3,
	ExternalLink,
	Globe,
	LocateFixed,
	TrendingUp,
	Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { AnalyticsSection } from "../_components/analytics/analytics-section";
import { StatCard } from "../_components/analytics/stat-card";

export default function AnalyticsPage() {
	const { data: stats, isLoading: statsLoading } =
		api.rabbithole.getRabbitholeStats.useQuery();
	const { data: popularArticles, isLoading: articlesLoading } =
		api.rabbithole.getPopularArticles.useQuery({ limit: 10 });
	const { data: connectedArticles, isLoading: connectedLoading } =
		api.rabbithole.getMostConnectedArticles.useQuery({ limit: 10 });
	const { data: popularConnections, isLoading: connectionsLoading } =
		api.rabbithole.getPopularConnections.useQuery({ limit: 10 });

	if (statsLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background font-chillax">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
					<p className="text-muted-foreground">Loading analytics...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-muted/30">
			{/* Header */}
			<div className="border-border border-b bg-card">
				<div className="mx-auto max-w-7xl px-4 py-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="flex items-center gap-2 font-bold text-2xl text-foreground">
								<Image
									src="/icon.png"
									alt="rabbithole icon"
									width={32}
									height={32}
									className="h-8 w-8"
								/>
								rabbithole
							</h1>
							<p className="mt-1 text-muted-foreground">
								Discover patterns and insights from shared rabbit holes
							</p>
						</div>
						<Link href="/">
							<Button variant="outline">Back to Explorer</Button>
						</Link>
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-7xl px-4 py-8">
				{/* Overview Stats */}
				<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					<StatCard
						icon={<Globe className="h-6 w-6" />}
						title="Total Rabbit Holes"
						value={stats?.totalRabbitholes ?? 0}
						subtitle="Shared explorations"
						color="chart-1"
					/>
					<StatCard
						icon={<Users className="h-6 w-6" />}
						title="Unique Articles"
						value={stats?.totalArticles ?? 0}
						subtitle="Wikipedia pages explored"
						color="chart-2"
					/>
					<StatCard
						icon={<TrendingUp className="h-6 w-6" />}
						title="Total Connections"
						value={stats?.totalConnections ?? 0}
						subtitle="Article relationships"
						color="chart-3"
					/>
					<StatCard
						icon={<BarChart3 className="h-6 w-6" />}
						title="Avg Nodes/Hole"
						value={stats?.averageNodes ?? 0}
						subtitle={`Max: ${stats?.maxNodes ?? 0}`}
						color="chart-4"
					/>
				</div>

				{/* Analytics Sections */}
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
					{/* Most Popular Articles */}
					<AnalyticsSection
						title="Most Popular Articles"
						subtitle="Articles that appear in the most rabbit holes"
						isLoading={articlesLoading}
					>
						{popularArticles?.map((article, index) => (
							<div
								key={article.id}
								className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
							>
								<div className="flex flex-grow items-center gap-3 overflow-hidden">
									<div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-chart-1/10 font-medium text-chart-1 text-sm">
										{index + 1}
									</div>
									<div className="flex-grow overflow-hidden">
										<h4 className="truncate font-medium text-foreground">
											{article.articleTitle}
										</h4>
										<p className="truncate text-muted-foreground text-sm">
											{article.totalAppearances} rabbit holes •{" "}
											{article.totalConnections} total connections
										</p>
									</div>
								</div>
								<div className="ml-2 flex flex-shrink-0 items-center gap-2">
									<Link
										href={`/rabbithole?search=${encodeURIComponent(article.articleTitle)}`}
										title="Start rabbit hole"
									>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-primary hover:bg-primary/10 hover:text-primary"
										>
											<LocateFixed className="h-4 w-4" />
										</Button>
									</Link>
									<a
										href={article.articleUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-chart-1 hover:text-chart-1/80"
										title="View on Wikipedia"
									>
										<ExternalLink className="h-4 w-4" />
									</a>
								</div>
							</div>
						))}
					</AnalyticsSection>

					{/* Most Connected Articles */}
					<AnalyticsSection
						title="Most Connected Articles"
						subtitle="Articles with the highest average connections"
						isLoading={connectedLoading}
					>
						{connectedArticles?.map((article, index) => (
							<div
								key={article.id}
								className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
							>
								<div className="flex flex-grow items-center gap-3 overflow-hidden">
									<div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-chart-2/10 font-medium text-chart-2 text-sm">
										{index + 1}
									</div>
									<div className="flex-grow overflow-hidden">
										<h4 className="truncate font-medium text-foreground">
											{article.articleTitle}
										</h4>
										<p className="truncate text-muted-foreground text-sm">
											{article.averageConnections.toFixed(1)} avg connections •{" "}
											{article.totalAppearances} appearances
										</p>
									</div>
								</div>
								<div className="ml-2 flex flex-shrink-0 items-center gap-2">
									<Link
										href={`/rabbithole?search=${encodeURIComponent(article.articleTitle)}`}
										title="Start rabbit hole"
									>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-primary hover:bg-primary/10 hover:text-primary"
										>
											<LocateFixed className="h-4 w-4" />
										</Button>
									</Link>
									<a
										href={article.articleUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-chart-2 hover:text-chart-2/80"
										title="View on Wikipedia"
									>
										<ExternalLink className="h-4 w-4" />
									</a>
								</div>
							</div>
						))}
					</AnalyticsSection>

					{/* Most Common Connections */}
					<AnalyticsSection
						title="Most Common Connections"
						subtitle="Article pairs that are frequently linked together"
						isLoading={connectionsLoading}
						className="lg:col-span-2"
					>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							{popularConnections?.map((connection, index) => (
								<div
									key={connection.id}
									className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
								>
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-5/10 font-medium text-chart-5 text-sm">
										{index + 1}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 text-sm">
											<span className="truncate font-medium text-foreground">
												{connection.sourceArticle}
											</span>
											<ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
											<span className="truncate font-medium text-foreground">
												{connection.targetArticle}
											</span>
										</div>
										<p className="mt-1 text-muted-foreground text-xs">
											{connection.connectionCount} rabbit holes
										</p>
									</div>
								</div>
							))}
						</div>
					</AnalyticsSection>
				</div>

				{/* Additional Stats */}
				{stats && (
					<div className="mt-8 rounded-lg border border-border bg-card p-6">
						<h3 className="mb-4 font-semibold text-foreground text-lg">
							Additional Statistics
						</h3>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
							<div>
								<h4 className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
									Rabbit Hole Size
								</h4>
								<div className="mt-2 space-y-1">
									<div className="flex justify-between">
										<span className="text-muted-foreground text-sm">
											Average nodes:
										</span>
										<span className="font-medium text-foreground text-sm">
											{stats.averageNodes}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground text-sm">
											Average links:
										</span>
										<span className="font-medium text-foreground text-sm">
											{stats.averageLinks}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground text-sm">
											Largest rabbit hole:
										</span>
										<span className="font-medium text-foreground text-sm">
											{stats.maxNodes} nodes
										</span>
									</div>
								</div>
							</div>
							<div>
								<h4 className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
									Engagement
								</h4>
								<div className="mt-2 space-y-1">
									<div className="flex justify-between">
										<span className="text-muted-foreground text-sm">
											Average views:
										</span>
										<span className="font-medium text-foreground text-sm">
											{stats.averageViews}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground text-sm">
											Most viewed:
										</span>
										<span className="font-medium text-foreground text-sm">
											{stats.maxViews} views
										</span>
									</div>
								</div>
							</div>
							<div>
								<h4 className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
									Network
								</h4>
								<div className="mt-2 space-y-1">
									<div className="flex justify-between">
										<span className="text-muted-foreground text-sm">
											Most connected:
										</span>
										<span className="font-medium text-foreground text-sm">
											{stats.maxLinks} links
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground text-sm">
											Unique connections:
										</span>
										<span className="font-medium text-foreground text-sm">
											{stats.totalConnections}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
