"use client";

import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useEffect } from "react";
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

	// Scroll to top when selectedNode changes
	useEffect(() => {
		if (selectedNode && isDetailPanelOpen && !isCollapsed) {
			// Use a small delay to ensure the content is rendered
			setTimeout(() => {
				const contentContainer = document.querySelector(
					".wikipedia-article-panel-content",
				);
				if (contentContainer) {
					contentContainer.scrollTop = 0;
				}
			}, 100);
		}
	}, [selectedNode, isDetailPanelOpen, isCollapsed]);

	// Check if the selected node is a root node (no incoming connections)
	const isRootNode =
		selectedNode &&
		!graphData.links.some((link) => {
			const targetId =
				typeof link.target === "string"
					? link.target
					: (link.target as { id?: string })?.id || link.target;
			return targetId === selectedNode.id;
		});

	if (!isDetailPanelOpen || !selectedNode) {
		return null;
	}

	return (
		<div
			className="absolute top-0 right-0 z-20 flex h-full flex-col border-border border-l bg-card shadow-2xl transition-transform duration-300 ease-in-out"
			style={{
				width: isCollapsed ? "60px" : `${panelWidth}px`,
				transform: isDetailPanelOpen ? "translateX(0)" : "translateX(100%)",
			}}
		>
			{/* Loading Overlay - positioned relative to the panel */}
			{loadingLinks.size > 0 && !isCollapsed && (
				<div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur-sm">
					<div className="flex flex-col items-center gap-3 p-4 text-center sm:p-8">
						<div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2 sm:h-10 sm:w-10" />
						<div className="font-medium text-muted-foreground text-sm">
							Loading article...
						</div>
					</div>
				</div>
			)}

			{/* Resize Handle - Hidden on mobile */}
			{!isCollapsed && panelWidth > 400 && (
				<div
					className="absolute top-0 left-0 h-full w-1 cursor-col-resize bg-border transition-colors duration-200 hover:bg-primary"
					onMouseDown={onPanelResize}
				/>
			)}

			{/* Collapse/Expand Button */}
			<Button
				variant="outline"
				size="icon"
				onClick={() => setIsCollapsed(!isCollapsed)}
				className="h-8 w-8 bg-card shadow-md hover:shadow-lg"
				style={{
					position: "absolute",
					top: "50%",
					left: "-1.25rem",
					transform: "translateY(-50%)",
					zIndex: 30,
				}}
			>
				{isCollapsed ? <ChevronLeft /> : <ChevronRight />}
			</Button>

			{!isCollapsed && (
				<>
					{/* Header */}
					<div className="flex items-center justify-between border-border border-b p-3 sm:p-6">
						<div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
							<h3 className="min-w-0 flex-1 truncate font-semibold text-card-foreground text-lg sm:text-xl">
								{selectedNode.title}
							</h3>
							{/* Root Node Badge */}
							{isRootNode && (
								<span
									className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 text-xs"
									title="This is a root node (starting point of exploration)"
								>
									Root
								</span>
							)}
						</div>

						<div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
							{/* Back Button */}
							{navigationHistory.length > 0 && (
								<Button
									variant="ghost"
									size="sm"
									onClick={onGoBackToParent}
									className="flex flex-shrink-0 items-center gap-1 text-muted-foreground hover:text-card-foreground sm:gap-2"
									title={`Back to ${graphData.nodes.find((node) => node.id === navigationHistory[navigationHistory.length - 1])?.title || "parent"}`}
								>
									<ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
								</Button>
							)}

							{/* View on Wikipedia Button */}
							<Button
								variant="ghost"
								size="sm"
								onClick={() => window.open(selectedNode.url, "_blank")}
								className="flex items-center gap-1 text-muted-foreground hover:text-card-foreground sm:gap-2"
								title="View on Wikipedia"
							>
								<ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
							</Button>

							{/* Remove Button */}
							{graphData.nodes.length > 1 && !isRootNode && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => onRemoveNode(selectedNode)}
									className="flex items-center gap-1 text-destructive hover:border-destructive/30 hover:text-destructive sm:gap-2"
									title="Remove this article and any orphaned children"
								>
									<Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
								</Button>
							)}

							{/* Close Button */}
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsDetailPanelOpen(false)}
								className="flex items-center gap-1 sm:gap-2"
								title="Close panel"
							>
								<X className="h-3 w-3 sm:h-4 sm:w-4" />
							</Button>
						</div>
					</div>

					{/* Content */}
					<div className="wikipedia-article-panel-content flex-1 overflow-y-auto p-3 sm:p-6">
						<div className="space-y-4">
							{/* Article Content */}
							<div>
								<WikipediaArticleViewer
									htmlContent={selectedNode.fullHtml}
									title={selectedNode.title}
									loadingLinks={loadingLinks}
									onLinkClick={onLinkClick}
									onMiddleClick={onMiddleClick}
								/>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Collapsed State - Vertical Title */}
			{isCollapsed && (
				<div className="flex h-full items-center justify-center p-2">
					<div className="-rotate-90 mb-4 transform whitespace-nowrap font-medium text-muted-foreground text-sm">
						{selectedNode.title}
					</div>
				</div>
			)}

			{/* Loading State */}
			{!selectedNode.fullHtml && !isCollapsed && (
				<div className="flex h-full items-center justify-center">
					<div className="text-muted-foreground italic">
						Loading article content...
					</div>
				</div>
			)}
		</div>
	);
}
