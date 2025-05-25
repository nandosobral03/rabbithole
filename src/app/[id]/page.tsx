"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { RabbitholeInfoPanel } from "../_components/shared/rabbithole-info-panel";
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
		<div className="relative h-screen bg-background">
			{/* Floating Rabbit Hole Info Panel */}
			<RabbitholeInfoPanel
				title={rabbithole.title}
				creatorName={rabbithole.creatorName ?? undefined}
				description={rabbithole.description ?? undefined}
				viewCount={rabbithole.viewCount}
				createdAt={rabbithole.createdAt}
				expiresAt={rabbithole.expiresAt}
				isEdited={isEdited}
			/>

			{/* Graph Explorer with loaded data - now takes full screen */}
			<WikipediaGraphExplorer
				initialGraphData={rabbithole.graphData}
				onGraphChange={() => setIsEdited(true)}
			/>
		</div>
	);
}
