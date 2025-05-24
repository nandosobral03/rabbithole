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
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
					<p className="text-gray-600">Loading analytics...</p>
				</div>
			</div>
		);
	}

	if (error || !analytics) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<div className="max-w-md text-center">
					<BarChart3 className="mx-auto mb-4 h-12 w-12 text-red-500" />
					<h1 className="mb-2 font-semibold text-gray-900 text-xl">
						Analytics Not Available
					</h1>
					<p className="mb-4 text-gray-600">
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
			<div className="border-gray-200 border-b bg-white">
				<div className="mx-auto max-w-7xl px-4 py-6">
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
								<h1 className="flex items-center gap-2 font-bold text-2xl text-gray-900">
									<BarChart3 className="h-6 w-6 text-blue-600" />
									Rabbit Hole Analytics
								</h1>
								<p className="mt-1 text-gray-600">
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

			<div className="mx-auto max-w-7xl px-4 py-8">
				{/* Overview Stats */}
				<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<h3 className="mb-4 font-semibold text-gray-900 text-lg">
						Connection Statistics
					</h3>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
						<div>
							<h4 className="font-medium text-gray-500 text-sm uppercase tracking-wide">
								Incoming Connections
							</h4>
							<div className="mt-2 space-y-1">
								<div className="flex justify-between">
									<span className="text-gray-600 text-sm">Total:</span>
									<span className="font-medium text-sm">
										{totalIncomingConnections}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600 text-sm">Average:</span>
									<span className="font-medium text-sm">
										{avgIncomingConnections.toFixed(1)}
									</span>
								</div>
							</div>
						</div>
						<div>
							<h4 className="font-medium text-gray-500 text-sm uppercase tracking-wide">
								Outgoing Connections
							</h4>
							<div className="mt-2 space-y-1">
								<div className="flex justify-between">
									<span className="text-gray-600 text-sm">Total:</span>
									<span className="font-medium text-sm">
										{totalOutgoingConnections}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600 text-sm">Average:</span>
									<span className="font-medium text-sm">
										{avgOutgoingConnections.toFixed(1)}
									</span>
								</div>
							</div>
						</div>
						<div>
							<h4 className="font-medium text-gray-500 text-sm uppercase tracking-wide">
								Most Connected
							</h4>
							<div className="mt-2 space-y-1">
								<div className="flex justify-between">
									<span className="text-gray-600 text-sm">Article:</span>
									<span
										className="max-w-32 truncate font-medium text-sm"
										title={mostConnectedNode?.articleTitle}
									>
										{mostConnectedNode?.articleTitle}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600 text-sm">Connections:</span>
									<span className="font-medium text-sm">
										{(mostConnectedNode?.incomingConnections ?? 0) +
											(mostConnectedNode?.outgoingConnections ?? 0)}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Node Details */}
				<div className="rounded-lg border border-gray-200 bg-white p-6">
					<div className="mb-4 flex items-center justify-between">
						<h3 className="font-semibold text-gray-900 text-lg">
							Node Details
						</h3>
						<p className="text-gray-600 text-sm">
							Sorted by incoming connections
						</p>
					</div>
					<div className="space-y-3">
						{nodeStats.map((node, index) => (
							<div
								key={node.id}
								className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
							>
								<div className="flex items-center gap-4">
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-medium text-blue-600 text-sm">
										{index + 1}
									</div>
									<div className="min-w-0 flex-1">
										<h4 className="truncate font-medium text-gray-900">
											{node.articleTitle}
											{node.isRootNode && (
												<span className="ml-2 inline-flex items-center rounded bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
													Root
												</span>
											)}
										</h4>
										<div className="mt-1 flex items-center gap-4 text-gray-500 text-sm">
											<span>↓ {node.incomingConnections} incoming</span>
											<span>↑ {node.outgoingConnections} outgoing</span>
											<span>{node.contentLength.toLocaleString()} chars</span>
											<span>Size: {node.nodeSize}px</span>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="text-right">
										<div className="font-medium text-gray-900 text-sm">
											{node.incomingConnections + node.outgoingConnections}{" "}
											total
										</div>
										<div className="text-gray-500 text-xs">connections</div>
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
		<div className="rounded-lg border border-gray-200 bg-white p-6">
			<div className="flex items-center">
				<div className={`rounded-lg p-2 ${colorClasses[color]}`}>{icon}</div>
				<div className="ml-4">
					<h3 className="font-medium text-gray-500 text-sm">{title}</h3>
					<p className="font-semibold text-2xl text-gray-900">
						{value.toLocaleString()}
					</p>
					<p className="text-gray-600 text-sm">{subtitle}</p>
				</div>
			</div>
		</div>
	);
}
