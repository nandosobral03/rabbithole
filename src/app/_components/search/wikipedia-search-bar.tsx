"use client";

import { Info, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { GraphData } from "../types/graph";

interface WikipediaSearchBarProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	onSearch: (query: string) => Promise<void>;
	isFetchingPage: boolean;
	fetchPageError: { message: string } | null;
	graphData: GraphData;
}

export function WikipediaSearchBar({
	searchQuery,
	setSearchQuery,
	onSearch,
	isFetchingPage,
	fetchPageError,
	graphData,
}: WikipediaSearchBarProps) {
	const [showInstructions, setShowInstructions] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim()) return;
		await onSearch(searchQuery.trim());
		setSearchQuery("");
	};

	return (
		<div className="absolute top-4 left-4 z-10 min-w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
			<div className="mb-2 flex items-center gap-2">
				<h2 className="font-semibold text-gray-900 text-lg">
					Wikipedia Graph Explorer
				</h2>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setShowInstructions(!showInstructions)}
					className="h-6 w-6"
				>
					<Info className="h-4 w-4" />
				</Button>
			</div>

			<form onSubmit={handleSubmit} className="space-y-3">
				<div className="flex gap-2">
					<Input
						type="text"
						placeholder="Search Wikipedia to add to graph..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="flex-1"
						disabled={isFetchingPage}
					/>
					<Button
						type="submit"
						size="icon"
						disabled={isFetchingPage || !searchQuery.trim()}
					>
						{isFetchingPage ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Plus className="h-4 w-4" />
						)}
					</Button>
				</div>

				{fetchPageError && (
					<div className="rounded border border-red-200 bg-red-50 p-2 text-red-700 text-sm">
						{fetchPageError.message}
					</div>
				)}
			</form>

			{showInstructions && (
				<div className="mt-3 space-y-1 rounded border border-blue-200 bg-blue-50 p-3 text-blue-800 text-sm">
					<p className="font-medium">How to explore:</p>
					<ul className="space-y-1 text-xs">
						<li>• Search above to add articles to the graph</li>
						<li>• Click a node to read the full article</li>
						<li>• Left-click links in articles to add them and switch view</li>
						<li>• Middle-click links to add them without switching view</li>
						<li>• Right-click nodes to expand their connections</li>
						<li>• Drag nodes to rearrange the graph</li>
					</ul>
				</div>
			)}

			{graphData.nodes.length > 0 && (
				<div className="mt-3 border-gray-200 border-t pt-3 text-gray-500 text-xs">
					Nodes: {graphData.nodes.length} | Links: {graphData.links.length}
				</div>
			)}
		</div>
	);
}
