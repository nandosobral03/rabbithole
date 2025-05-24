"use client";

import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	Trash2,
	X,
} from "lucide-react";
import { useCallback } from "react";
import { Button } from "~/components/ui/button";
import type { GraphData, GraphNode } from "../types/graph";
import { WikipediaArticleViewer } from "../wikipedia-article-viewer";

interface WikipediaArticlePanelProps {
	selectedNode: GraphNode;
	isDetailPanelOpen: boolean;
	setIsDetailPanelOpen: (open: boolean) => void;
	panelWidth: number;
	isCollapsed: boolean;
	setIsCollapsed: (collapsed: boolean) => void;
	navigationHistory: string[];
	graphData: GraphData;
	loadingLinks: Set<string>;
	onLinkClick: (title: string) => Promise<void>;
	onMiddleClick: (title: string) => Promise<void>;
	onRemoveNode: (node: GraphNode) => void;
	onGoBackToParent: () => void;
	onPanelResize: (e: React.MouseEvent) => void;
}

export function WikipediaArticlePanel({
	selectedNode,
	isDetailPanelOpen,
	setIsDetailPanelOpen,
	panelWidth,
	isCollapsed,
	setIsCollapsed,
	navigationHistory,
	graphData,
	loadingLinks,
	onLinkClick,
	onMiddleClick,
	onRemoveNode,
	onGoBackToParent,
	onPanelResize,
}: WikipediaArticlePanelProps) {
	const toggleCollapse = useCallback(() => {
		setIsCollapsed(!isCollapsed);
	}, [isCollapsed, setIsCollapsed]);

	if (!isDetailPanelOpen || !selectedNode) {
		return null;
	}

	return (
		<div
			className="absolute top-0 right-0 z-20 flex h-full flex-col border-gray-200 border-l bg-white shadow-2xl transition-transform duration-300 ease-in-out"
			style={{
				width: isCollapsed ? "60px" : `${panelWidth}px`,
				transform: "translateX(0)",
			}}
		>
			{/* Resize Handle */}
			<div
				className="absolute top-0 left-0 h-full w-1 cursor-col-resize bg-gray-300 transition-colors duration-200 hover:bg-blue-500"
				onMouseDown={onPanelResize}
			/>

			{/* Collapse/Expand Button */}
			<div className="-translate-y-1/2 absolute top-1/2 left-2 z-30 transform">
				<Button
					variant="outline"
					size="icon"
					onClick={toggleCollapse}
					className="h-8 w-8 bg-white shadow-md hover:shadow-lg"
				>
					{isCollapsed ? (
						<ChevronLeft className="h-4 w-4" />
					) : (
						<ChevronRight className="h-4 w-4" />
					)}
				</Button>
			</div>

			{!isCollapsed && (
				<>
					{/* Header */}
					<div className="flex items-center justify-between border-gray-200 border-b p-6">
						<div className="flex min-w-0 flex-1 items-center gap-3">
							<h3 className="min-w-0 flex-1 truncate font-semibold text-gray-900 text-xl">
								{selectedNode.title}
							</h3>
							{navigationHistory.length > 0 && (
								<Button
									variant="outline"
									size="sm"
									onClick={onGoBackToParent}
									className="flex flex-shrink-0 items-center gap-2 text-gray-600 hover:text-gray-800"
									title={`Back to ${
										graphData.nodes.find(
											(n) =>
												n.id ===
												navigationHistory[navigationHistory.length - 1],
										)?.title || "Previous Article"
									}`}
								>
									<ArrowLeft className="h-4 w-4" />
									Back
								</Button>
							)}
						</div>
						<div className="ml-3 flex flex-shrink-0 items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => onRemoveNode(selectedNode)}
								className="flex items-center gap-2 text-red-600 hover:border-red-300 hover:text-red-700"
							>
								<Trash2 className="h-4 w-4" />
								Remove
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsDetailPanelOpen(false)}
							>
								<X className="h-5 w-5" />
							</Button>
						</div>
					</div>

					{/* Content */}
					<div className="flex-1 space-y-4 overflow-y-auto p-6">
						<div className="mb-6 flex items-center gap-3">
							<a
								href={selectedNode.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 text-blue-600 hover:underline"
							>
								<ExternalLink className="h-4 w-4" />
								View on Wikipedia
							</a>
						</div>

						{/* Full Article Content */}
						{selectedNode.fullHtml ? (
							<WikipediaArticleViewer
								htmlContent={selectedNode.fullHtml}
								title={selectedNode.title}
								onLinkClick={onLinkClick}
								onMiddleClick={onMiddleClick}
								loadingLinks={loadingLinks}
							/>
						) : (
							<div className="text-gray-500 italic">
								Loading full article content...
							</div>
						)}
					</div>
				</>
			)}

			{/* Collapsed state content */}
			{isCollapsed && (
				<div className="flex h-full flex-col items-center justify-center p-2">
					<div className="-rotate-90 mb-4 transform whitespace-nowrap font-medium text-gray-600 text-sm">
						{selectedNode.title}
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsDetailPanelOpen(false)}
						className="mb-2"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
