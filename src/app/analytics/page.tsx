"use client";

import {
	ArrowRight,
	BarChart3,
	ExternalLink,
	Globe,
	TrendingUp,
	Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

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
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
					<p className="text-muted-foreground">Loading analytics...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 py-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
								<BarChart3 className="h-6 w-6 text-blue-600" />
								Wikipedia Rabbit Hole Analytics
							</h1>
							<p className="text-gray-600 mt-1">
								Discover patterns and insights from shared rabbit holes
							</p>
						</div>
						<Link href="/">
							<Button variant="outline">Back to Explorer</Button>
						</Link>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 py-8">
				{/* Overview Stats */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<StatCard
						icon={<Globe className="h-6 w-6" />}
						title="Total Rabbit Holes"
						value={stats?.totalRabbitholes ?? 0}
						subtitle="Shared explorations"
						color="blue"
					/>
					<StatCard
						icon={<Users className="h-6 w-6" />}
						title="Unique Articles"
						value={stats?.totalArticles ?? 0}
						subtitle="Wikipedia pages explored"
						color="green"
					/>
					<StatCard
						icon={<TrendingUp className="h-6 w-6" />}
						title="Total Connections"
						value={stats?.totalConnections ?? 0}
						subtitle="Article relationships"
						color="purple"
					/>
					<StatCard
						icon={<BarChart3 className="h-6 w-6" />}
						title="Avg Nodes/Hole"
						value={stats?.averageNodes ?? 0}
						subtitle={`Max: ${stats?.maxNodes ?? 0}`}
						color="orange"
					/>
				</div>

				{/* Analytics Sections */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Most Popular Articles */}
					<AnalyticsSection
						title="Most Popular Articles"
						subtitle="Articles that appear in the most rabbit holes"
						isLoading={articlesLoading}
					>
						{popularArticles?.map((article, index) => (
							<div
								key={article.id}
								className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
							>
								<div className="flex items-center gap-3">
									<div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
										{index + 1}
									</div>
									<div>
										<h4 className="font-medium text-gray-900 truncate max-w-xs">
											{article.articleTitle}
										</h4>
										<p className="text-sm text-gray-500">
											{article.totalAppearances} rabbit holes •{" "}
											{article.totalConnections} total connections
										</p>
									</div>
								</div>
								<a
									href={article.articleUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:text-blue-800"
								>
									<ExternalLink className="h-4 w-4" />
								</a>
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
								className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
							>
								<div className="flex items-center gap-3">
									<div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
										{index + 1}
									</div>
									<div>
										<h4 className="font-medium text-gray-900 truncate max-w-xs">
											{article.articleTitle}
										</h4>
										<p className="text-sm text-gray-500">
											{article.averageConnections.toFixed(1)} avg connections •{" "}
											{article.totalAppearances} appearances
										</p>
									</div>
								</div>
								<a
									href={article.articleUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-green-600 hover:text-green-800"
								>
									<ExternalLink className="h-4 w-4" />
								</a>
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
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{popularConnections?.map((connection, index) => (
								<div
									key={connection.id}
									className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
								>
									<div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
										{index + 1}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 text-sm">
											<span className="font-medium text-gray-900 truncate">
												{connection.sourceArticle}
											</span>
											<ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
											<span className="font-medium text-gray-900 truncate">
												{connection.targetArticle}
											</span>
										</div>
										<p className="text-xs text-gray-500 mt-1">
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
					<div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							Additional Statistics
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
									Rabbit Hole Size
								</h4>
								<div className="mt-2 space-y-1">
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">
											Average nodes:
										</span>
										<span className="text-sm font-medium">
											{stats.averageNodes}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">
											Average links:
										</span>
										<span className="text-sm font-medium">
											{stats.averageLinks}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">
											Largest rabbit hole:
										</span>
										<span className="text-sm font-medium">
											{stats.maxNodes} nodes
										</span>
									</div>
								</div>
							</div>
							<div>
								<h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
									Engagement
								</h4>
								<div className="mt-2 space-y-1">
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">
											Average views:
										</span>
										<span className="text-sm font-medium">
											{stats.averageViews}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">Most viewed:</span>
										<span className="text-sm font-medium">
											{stats.maxViews} views
										</span>
									</div>
								</div>
							</div>
							<div>
								<h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
									Network
								</h4>
								<div className="mt-2 space-y-1">
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">
											Most connected:
										</span>
										<span className="text-sm font-medium">
											{stats.maxLinks} links
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">
											Unique connections:
										</span>
										<span className="text-sm font-medium">
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

interface StatCardProps {
	icon: React.ReactNode;
	title: string;
	value: number;
	subtitle: string;
	color: "blue" | "green" | "purple" | "orange";
}

function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
	const colorClasses = {
		blue: "bg-blue-50 text-blue-600",
		green: "bg-green-50 text-green-600",
		purple: "bg-purple-50 text-purple-600",
		orange: "bg-orange-50 text-orange-600",
	};

	return (
		<div className="bg-white rounded-lg border border-gray-200 p-6">
			<div className="flex items-center">
				<div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
				<div className="ml-4">
					<h3 className="text-sm font-medium text-gray-500">{title}</h3>
					<p className="text-2xl font-semibold text-gray-900">
						{value.toLocaleString()}
					</p>
					<p className="text-sm text-gray-600">{subtitle}</p>
				</div>
			</div>
		</div>
	);
}

interface AnalyticsSectionProps {
	title: string;
	subtitle: string;
	isLoading: boolean;
	children: React.ReactNode;
	className?: string;
}

function AnalyticsSection({
	title,
	subtitle,
	isLoading,
	children,
	className = "",
}: AnalyticsSectionProps) {
	return (
		<div
			className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}
		>
			<div className="mb-4">
				<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
				<p className="text-sm text-gray-600">{subtitle}</p>
			</div>
			{isLoading ? (
				<div className="space-y-3">
					<div className="animate-pulse">
						<div className="h-12 bg-gray-100 rounded-lg" />
					</div>
					<div className="animate-pulse">
						<div className="h-12 bg-gray-100 rounded-lg" />
					</div>
					<div className="animate-pulse">
						<div className="h-12 bg-gray-100 rounded-lg" />
					</div>
					<div className="animate-pulse">
						<div className="h-12 bg-gray-100 rounded-lg" />
					</div>
					<div className="animate-pulse">
						<div className="h-12 bg-gray-100 rounded-lg" />
					</div>
				</div>
			) : (
				<div className="space-y-3">{children}</div>
			)}
		</div>
	);
}
