"use client";

import { ArrowLeft, BarChart3, Globe, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export default function RabbitholeAnalyticsPage() {
	const params = useParams();
	const router = useRouter();
	const id = params.id as string;

	const {
		data: analytics,
		isLoading,
		error,
	} = api.rabbithole.getRabbitholeAnalytics.useQuery(
		{ id },
		{
			enabled: !!id,
			retry: false,
		},
	);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
					<p className="text-gray-600">Loading analytics...</p>
				</div>
			</div>
		);
	}

	if (error || !analytics) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center max-w-md">
					<BarChart3 className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h1 className="text-xl font-semibold text-gray-900 mb-2">
						Analytics Not Available
					</h1>
					<p className="text-gray-600 mb-4">
						Unable to load analytics for this rabbit hole.
					</p>
					<Button onClick={() => router.back()} variant="outline">
						Go Back
					</Button>
				</div>
			</div>
		);
	}

	const { rabbithole, nodeStats } = analytics;

	// Calculate additional statistics
	const totalIncomingConnections = nodeStats.reduce(
		(sum, node) => sum + node.incomingConnections,
		0,
	);
	const totalOutgoingConnections = nodeStats.reduce(
		(sum, node) => sum + node.outgoingConnections,
		0,
	);
	const avgIncomingConnections = totalIncomingConnections / nodeStats.length;
	const avgOutgoingConnections = totalOutgoingConnections / nodeStats.length;
	const rootNodes = nodeStats.filter((node) => node.isRootNode);
	const mostConnectedNode = nodeStats.reduce(
		(max, node) =>
			node.incomingConnections + node.outgoingConnections >
			max.incomingConnections + max.outgoingConnections
				? node
				: max,
		nodeStats[0],
	);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Button
								variant="outline"
								size="sm"
								onClick={() => router.back()}
								className="flex items-center gap-2"
							>
								<ArrowLeft className="h-4 w-4" />
								Back
							</Button>
							<div>
								<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
									<BarChart3 className="h-6 w-6 text-blue-600" />
									Rabbit Hole Analytics
								</h1>
								<p className="text-gray-600 mt-1">
									Detailed analysis of "{rabbithole.title}"
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Link href={`/${id}`}>
								<Button variant="outline" size="sm">
									View Rabbit Hole
								</Button>
							</Link>
							<Link href="/analytics">
								<Button variant="outline" size="sm">
									Global Analytics
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 py-8">
				{/* Overview Stats */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<StatCard
						icon={<Globe className="h-6 w-6" />}
						title="Total Nodes"
						value={rabbithole.nodeCount}
						subtitle="Articles in this rabbit hole"
						color="blue"
					/>
					<StatCard
						icon={<TrendingUp className="h-6 w-6" />}
						title="Total Links"
						value={rabbithole.linkCount}
						subtitle="Connections between articles"
						color="green"
					/>
					<StatCard
						icon={<Users className="h-6 w-6" />}
						title="Views"
						value={rabbithole.viewCount}
						subtitle="Times this was viewed"
						color="purple"
					/>
					<StatCard
						icon={<BarChart3 className="h-6 w-6" />}
						title="Root Nodes"
						value={rootNodes.length}
						subtitle="Starting points"
						color="orange"
					/>
				</div>

				{/* Connection Statistics */}
				<div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Connection Statistics
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
								Incoming Connections
							</h4>
							<div className="mt-2 space-y-1">
								<div className="flex justify-between">
									<span className="text-sm text-gray-600">Total:</span>
									<span className="text-sm font-medium">
										{totalIncomingConnections}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-600">Average:</span>
									<span className="text-sm font-medium">
										{avgIncomingConnections.toFixed(1)}
									</span>
								</div>
							</div>
						</div>
						<div>
							<h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
								Outgoing Connections
							</h4>
							<div className="mt-2 space-y-1">
								<div className="flex justify-between">
									<span className="text-sm text-gray-600">Total:</span>
									<span className="text-sm font-medium">
										{totalOutgoingConnections}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-600">Average:</span>
									<span className="text-sm font-medium">
										{avgOutgoingConnections.toFixed(1)}
									</span>
								</div>
							</div>
						</div>
						<div>
							<h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
								Most Connected
							</h4>
							<div className="mt-2 space-y-1">
								<div className="flex justify-between">
									<span className="text-sm text-gray-600">Article:</span>
									<span
										className="text-sm font-medium truncate max-w-32"
										title={mostConnectedNode?.articleTitle}
									>
										{mostConnectedNode?.articleTitle}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-600">Connections:</span>
									<span className="text-sm font-medium">
										{(mostConnectedNode?.incomingConnections ?? 0) +
											(mostConnectedNode?.outgoingConnections ?? 0)}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Node Details */}
				<div className="bg-white rounded-lg border border-gray-200 p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-900">
							Node Details
						</h3>
						<p className="text-sm text-gray-600">
							Sorted by incoming connections
						</p>
					</div>
					<div className="space-y-3">
						{nodeStats.map((node, index) => (
							<div
								key={node.id}
								className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
							>
								<div className="flex items-center gap-4">
									<div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
										{index + 1}
									</div>
									<div className="flex-1 min-w-0">
										<h4 className="font-medium text-gray-900 truncate">
											{node.articleTitle}
											{node.isRootNode && (
												<span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
													Root
												</span>
											)}
										</h4>
										<div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
											<span>↓ {node.incomingConnections} incoming</span>
											<span>↑ {node.outgoingConnections} outgoing</span>
											<span>{node.contentLength.toLocaleString()} chars</span>
											<span>Size: {node.nodeSize}px</span>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="text-right">
										<div className="text-sm font-medium text-gray-900">
											{node.incomingConnections + node.outgoingConnections}{" "}
											total
										</div>
										<div className="text-xs text-gray-500">connections</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
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
