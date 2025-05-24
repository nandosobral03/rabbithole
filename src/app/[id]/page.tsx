"use client";

import { AlertCircle, BarChart3, Copy, Share2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import type { GraphData, GraphNode } from "../_components/types/graph";
import { WikipediaGraphExplorer } from "../_components/wikipedia-graph-explorer";

export default function SharedRabbitholeePage() {
	const params = useParams();
	const router = useRouter();
	const id = params.id as string;

	const [isForking, setIsForking] = useState(false);
	const [shareUrl, setShareUrl] = useState<string | null>(null);

	const {
		data: rabbithole,
		isLoading,
		error,
	} = api.rabbithole.load.useQuery(
		{ id },
		{
			enabled: !!id,
			retry: false,
		},
	);

	const { mutateAsync: forkRabbithole } = api.rabbithole.fork.useMutation({
		onError: (error) => {
			console.error("Error forking rabbit hole:", error);
			setIsForking(false);
		},
	});

	// Set the share URL when component mounts
	useEffect(() => {
		if (typeof window !== "undefined") {
			setShareUrl(window.location.href);
		}
	}, []);

	const handleFork = async (graphData: GraphData) => {
		if (!rabbithole) return;

		setIsForking(true);
		try {
			// Normalize graph data - convert D3 object references back to string IDs
			const normalizedGraphData = {
				nodes: graphData.nodes,
				links: graphData.links.map((link) => ({
					source:
						typeof link.source === "string"
							? link.source
							: (link.source as GraphNode).id || link.source,
					target:
						typeof link.target === "string"
							? link.target
							: (link.target as GraphNode).id || link.target,
					id: link.id,
				})),
			};

			const title = `Fork of ${rabbithole.title}`;
			const result = await forkRabbithole({
				originalId: id,
				title,
				description: `Forked from: ${rabbithole.title}`,
				graphData: normalizedGraphData,
			});

			// Navigate to the new forked rabbit hole
			router.push(`/${result.id}`);
		} catch (error) {
			console.error("Failed to fork rabbit hole:", error);
		} finally {
			setIsForking(false);
		}
	};

	const copyShareUrl = async () => {
		if (shareUrl) {
			await navigator.clipboard.writeText(shareUrl);
			// You might want to show a toast here
			console.log("Share URL copied to clipboard!");
		}
	};

	if (isLoading) {
		return (
			<div className="h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
					<p className="text-muted-foreground">Loading rabbit hole...</p>
				</div>
			</div>
		);
	}

	if (error || !rabbithole) {
		return (
			<div className="h-screen flex items-center justify-center bg-background">
				<div className="text-center max-w-md">
					<AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
					<h1 className="text-xl font-semibold text-foreground mb-2">
						Rabbit Hole Not Found
					</h1>
					<p className="text-muted-foreground mb-4">
						This rabbit hole may have expired or doesn't exist.
					</p>
					<Link href="/">
						<Button>Go Home</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="h-screen flex flex-col bg-background">
			{/* Header with rabbit hole info and actions */}
			<div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
				<div className="flex-1 min-w-0">
					<h1 className="text-lg font-semibold text-card-foreground truncate">
						{rabbithole.title}
					</h1>
					{rabbithole.description && (
						<p className="text-sm text-muted-foreground truncate">
							{rabbithole.description}
						</p>
					)}
					<div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
						<span>{rabbithole.viewCount} views</span>
						<span>
							Created {new Date(rabbithole.createdAt).toLocaleDateString()}
						</span>
						<span>
							Expires {new Date(rabbithole.expiresAt).toLocaleDateString()}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={copyShareUrl}
						className="flex items-center gap-2"
					>
						<Copy className="h-4 w-4" />
						Copy Link
					</Button>
					<Link href={`/analytics/${id}`}>
						<Button
							variant="outline"
							size="sm"
							className="flex items-center gap-2"
						>
							<BarChart3 className="h-4 w-4" />
							Analytics
						</Button>
					</Link>
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleFork(rabbithole.graphData)}
						disabled={isForking}
						className="flex items-center gap-2"
					>
						<Share2 className="h-4 w-4" />
						{isForking ? "Forking..." : "Fork & Edit"}
					</Button>
				</div>
			</div>

			{/* Graph Explorer with loaded data */}
			<div className="flex-1">
				<WikipediaGraphExplorer initialGraphData={rabbithole.graphData} />
			</div>
		</div>
	);
}
