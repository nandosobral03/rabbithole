"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { WikipediaGraphExplorer } from "../_components/wikipedia-graph-explorer";

export default function SharedRabbitholeePage() {
	const params = useParams();
	const id = params.id as string;

	const [isEdited, setIsEdited] = useState(false);

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

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center bg-background">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
					<p className="text-muted-foreground">Loading rabbit hole...</p>
				</div>
			</div>
		);
	}

	if (error || !rabbithole) {
		return (
			<div className="flex h-screen items-center justify-center bg-background">
				<div className="max-w-md text-center">
					<AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
					<h1 className="mb-2 font-semibold text-foreground text-xl">
						Rabbit Hole Not Found
					</h1>
					<p className="mb-4 text-muted-foreground">
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
		<div className="flex h-screen flex-col bg-background">
			{/* Header with rabbit hole info */}
			<div className="flex items-center justify-between border-border border-b bg-card px-4 py-3">
				<div className="min-w-0 flex-1">
					<h1 className="truncate font-semibold text-card-foreground text-lg">
						{rabbithole.title}
						{isEdited && (
							<span className="ml-2 text-muted-foreground text-sm font-normal">
								(edited)
							</span>
						)}
					</h1>
					{rabbithole.description && (
						<p className="truncate text-muted-foreground text-sm">
							{rabbithole.description}
						</p>
					)}
					<div className="mt-1 flex items-center gap-4 text-muted-foreground text-xs">
						<span>{rabbithole.viewCount} views</span>
						<span>
							Created {new Date(rabbithole.createdAt).toLocaleDateString()}
						</span>
						<span>
							Expires {new Date(rabbithole.expiresAt).toLocaleDateString()}
						</span>
					</div>
				</div>
			</div>

			{/* Graph Explorer with loaded data */}
			<div className="flex-1">
				<WikipediaGraphExplorer
					initialGraphData={rabbithole.graphData}
					onGraphChange={() => setIsEdited(true)}
				/>
			</div>
		</div>
	);
}
