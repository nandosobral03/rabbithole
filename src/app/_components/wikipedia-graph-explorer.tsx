"use client";

import { RotateCcw, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { WikipediaGraphCanvas } from "./graph/wikipedia-graph-canvas";
import { WikipediaArticlePanel } from "./panels/wikipedia-article-panel";
import type {
	GraphData,
	GraphNode,
	WikipediaFullPageData,
} from "./types/graph";
import { calculateNodeSize, generateNodeColor } from "./utils/graph-utils";
import { wikipediaStyles } from "./wikipedia-article-viewer";

interface WikipediaGraphExplorerProps {
	initialGraphData?: GraphData;
	initialSearchQuery?: string | null;
}

export function WikipediaGraphExplorer({
	initialGraphData,
	initialSearchQuery,
}: WikipediaGraphExplorerProps = {}) {
	const router = useRouter();
	const [graphData, setGraphData] = useState<GraphData>(
		initialGraphData ?? {
			nodes: [],
			links: [],
		},
	);
	const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
	const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
	const [panelWidth, setPanelWidth] = useState(700);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [loadingLinks, setLoadingLinks] = useState<Set<string>>(new Set());
	const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
	const [shareUrl, setShareUrl] = useState<string | null>(null);
	const [isSharing, setIsSharing] = useState(false);
	const [showShareSuccess, setShowShareSuccess] = useState(false);

	const addNodeToGraph = useCallback(
		(pageData: WikipediaFullPageData, isRoot = false) => {
			setGraphData((prevData) => {
				const existingNodeIndex = prevData.nodes.findIndex(
					(node) => node.id === pageData.title,
				);

				if (existingNodeIndex !== -1) {
					const updatedNodes = [...prevData.nodes];
					const existingNode = updatedNodes[existingNodeIndex];
					if (existingNode) {
						updatedNodes[existingNodeIndex] = {
							...existingNode,
							content: pageData.content,
							fullHtml: pageData.fullHtml,
							outgoingLinks: pageData.links,
							expanded: isRoot ? true : existingNode.expanded,
						};
					}
					return { ...prevData, nodes: updatedNodes };
				}

				const newNode: GraphNode = {
					id: pageData.title,
					title: pageData.title,
					content: pageData.content,
					fullHtml: pageData.fullHtml,
					url: pageData.url,
					outgoingLinks: pageData.links,
					expanded: false,
					val: calculateNodeSize(pageData.content, pageData.links, isRoot),
					color: generateNodeColor(pageData.title),
				};

				return { nodes: [...prevData.nodes, newNode], links: prevData.links };
			});
		},
		[],
	);

	const {
		mutateAsync: fetchPage,
		isPending: isFetchingPage,
		error: fetchPageError,
	} = api.wikipedia.fetchFullPageWithLinks.useMutation({
		onError: (error) => {
			console.error("Error fetching Wikipedia page:", error);
		},
	});

	const { mutateAsync: shareRabbithole } = api.rabbithole.share.useMutation({
		onError: (error) => {
			console.error("Error sharing rabbit hole:", error);
			setIsSharing(false);
		},
	});

	const handleSearch = useCallback(
		async (query: string) => {
			const pageData = await fetchPage({ title: query });
			addNodeToGraph(pageData, true);
		},
		[fetchPage, addNodeToGraph],
	);

	const handleRestart = useCallback(() => {
		router.push("/");
	}, [router]);

	const handleShare = useCallback(async () => {
		if (graphData.nodes.length === 0) return;

		setIsSharing(true);
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

			// Generate a title based on the first node or nodes count
			const title =
				graphData.nodes.length === 1
					? `${graphData.nodes[0]?.title} - Wikipedia Rabbit Hole`
					: `Wikipedia Rabbit Hole (${graphData.nodes.length} articles)`;

			const result = await shareRabbithole({
				title,
				description: `A Wikipedia rabbit hole with ${graphData.nodes.length} articles and ${graphData.links.length} connections.`,
				graphData: normalizedGraphData,
			});

			const url = `${window.location.origin}/${result.id}`;
			setShareUrl(url);

			// Copy to clipboard
			await navigator.clipboard.writeText(url);

			// Show success notification
			setShowShareSuccess(true);
			setTimeout(() => setShowShareSuccess(false), 3000);
		} catch (error) {
			console.error("Failed to share rabbit hole:", error);
		} finally {
			setIsSharing(false);
		}
	}, [graphData, shareRabbithole]);

	const handleNodeClick = useCallback(
		(node: GraphNode) => {
			// Add current node to navigation history if we're switching from another node
			if (selectedNode && selectedNode.id !== node.id) {
				setNavigationHistory((prev) => [...prev, selectedNode.id]);
			}

			setSelectedNode(node);
			setIsDetailPanelOpen(true);
			setIsCollapsed(false);
		},
		[selectedNode],
	);

	const handleBackgroundClick = useCallback(() => {
		setSelectedNode(null);
		setIsDetailPanelOpen(false);
	}, []);

	const goBackToParent = useCallback(() => {
		if (navigationHistory.length === 0) return;

		const parentNodeId = navigationHistory[navigationHistory.length - 1];
		const parentNode = graphData.nodes.find((node) => node.id === parentNodeId);

		if (parentNode) {
			// Remove the last item from history
			setNavigationHistory((prev) => prev.slice(0, -1));
			setSelectedNode(parentNode);
		}
	}, [navigationHistory, graphData.nodes]);

	const handleArticleLinkClick = useCallback(
		async (title: string) => {
			if (!selectedNode) return;

			// Add immediate loading state
			setLoadingLinks((prev) => new Set(prev).add(title));

			try {
				// Check if we already have this article in the graph (quick check first)
				const existingNode = graphData.nodes.find((n) => n.id === title);
				const linkId = `${selectedNode.id}->${title}`;
				const existingLink = graphData.links.find((l) => l.id === linkId);

				// If the node and link already exist, just switch to that node (no API call needed)
				if (existingNode && existingLink) {
					setSelectedNode(existingNode);

					// Add current node to navigation history since we're switching via link click
					if (selectedNode) {
						setNavigationHistory((prev) => [...prev, selectedNode.id]);
					}

					setLoadingLinks((prev) => {
						const newSet = new Set(prev);
						newSet.delete(title);
						return newSet;
					});
					return;
				}

				// If we have the node but not the link (different path to same article)
				if (existingNode && !existingLink) {
					// Add the new edge
					setGraphData((prevData) => ({
						nodes: prevData.nodes,
						links: [
							...prevData.links,
							{
								source: selectedNode.id,
								target: title,
								id: linkId,
							},
						],
					}));

					setSelectedNode(existingNode);

					// Add current node to navigation history since we're switching via link click
					if (selectedNode) {
						setNavigationHistory((prev) => [...prev, selectedNode.id]);
					}

					setLoadingLinks((prev) => {
						const newSet = new Set(prev);
						newSet.delete(title);
						return newSet;
					});
					return;
				}

				// Use the raw tRPC client to fetch new article
				const pageData = await fetchPage({ title });
				const actualTitle = pageData.title;

				// Check again with the actual title returned by Wikipedia
				const existingNodeByActualTitle = graphData.nodes.find(
					(n) => n.id === actualTitle,
				);
				const actualLinkId = `${selectedNode.id}->${actualTitle}`;
				const existingLinkByActualTitle = graphData.links.find(
					(l) => l.id === actualLinkId,
				);

				// If the node and link already exist with actual title, just switch
				if (existingNodeByActualTitle && existingLinkByActualTitle) {
					setSelectedNode(existingNodeByActualTitle);

					// Add current node to navigation history since we're switching via link click
					if (selectedNode) {
						setNavigationHistory((prev) => [...prev, selectedNode.id]);
					}

					setLoadingLinks((prev) => {
						const newSet = new Set(prev);
						newSet.delete(title);
						return newSet;
					});
					return;
				}

				// If we have the node but not the link (different path to same article)
				if (existingNodeByActualTitle && !existingLinkByActualTitle) {
					// Add the new edge
					setGraphData((prevData) => ({
						nodes: prevData.nodes,
						links: [
							...prevData.links,
							{
								source: selectedNode.id,
								target: actualTitle,
								id: actualLinkId,
							},
						],
					}));

					setSelectedNode(existingNodeByActualTitle);

					// Add current node to navigation history since we're switching via link click
					if (selectedNode) {
						setNavigationHistory((prev) => [...prev, selectedNode.id]);
					}

					setLoadingLinks((prev) => {
						const newSet = new Set(prev);
						newSet.delete(title);
						return newSet;
					});
					return;
				}

				// Add new node and edge to the graph
				const newNode: GraphNode = {
					id: actualTitle,
					title: actualTitle,
					content: pageData.content,
					fullHtml: pageData.fullHtml,
					url: pageData.url,
					outgoingLinks: pageData.links,
					expanded: false,
					val: calculateNodeSize(pageData.content, pageData.links, false),
					color: generateNodeColor(actualTitle),
				};

				setGraphData((prevData) => ({
					nodes: [...prevData.nodes, newNode],
					links: [
						...prevData.links,
						{
							source: selectedNode.id,
							target: actualTitle,
							id: actualLinkId,
						},
					],
				}));

				// Switch to the new node in the detail panel
				setSelectedNode(newNode);

				// Add current node to navigation history since we're switching via link click
				if (selectedNode) {
					setNavigationHistory((prev) => [...prev, selectedNode.id]);
				}
			} catch (error) {
				console.error(`Failed to fetch and add ${title} to graph:`, error);
			} finally {
				// Always remove loading state
				setLoadingLinks((prev) => {
					const newSet = new Set(prev);
					newSet.delete(title);
					return newSet;
				});
			}
		},
		[selectedNode, graphData.nodes, graphData.links, fetchPage],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const handleArticleMiddleClick = useCallback(
		async (title: string) => {
			if (!selectedNode) return;

			// Add immediate loading state
			setLoadingLinks((prev) => new Set(prev).add(title));

			try {
				// Check if we already have this article in the graph (quick check first)
				const existingNode = graphData.nodes.find((n) => n.id === title);
				const linkId = `${selectedNode.id}->${title}`;
				const existingLink = graphData.links.find((l) => l.id === linkId);

				// If the node and link already exist, don't switch view but just log
				if (existingNode && existingLink) {
					setLoadingLinks((prev) => {
						const newSet = new Set(prev);
						newSet.delete(title);
						return newSet;
					});
					return;
				}

				// If we have the node but not the link (different path to same article)
				if (existingNode && !existingLink) {
					// Add the new edge
					setGraphData((prevData) => ({
						nodes: prevData.nodes,
						links: [
							...prevData.links,
							{
								source: selectedNode.id,
								target: title,
								id: linkId,
							},
						],
					}));

					// Don't switch to the new node - keep current selection
					setLoadingLinks((prev) => {
						const newSet = new Set(prev);
						newSet.delete(title);
						return newSet;
					});
					return;
				}

				// Use the raw tRPC client to fetch new article
				const pageData = await fetchPage({ title });
				const actualTitle = pageData.title;

				// Check again with the actual title returned by Wikipedia
				const existingNodeByActualTitle = graphData.nodes.find(
					(n) => n.id === actualTitle,
				);
				const actualLinkId = `${selectedNode.id}->${actualTitle}`;
				const existingLinkByActualTitle = graphData.links.find(
					(l) => l.id === actualLinkId,
				);

				// If the node and link already exist with actual title, don't switch
				if (existingNodeByActualTitle && existingLinkByActualTitle) {
					setLoadingLinks((prev) => {
						const newSet = new Set(prev);
						newSet.delete(title);
						return newSet;
					});
					return;
				}

				// If we have the node but not the link (different path to same article)
				if (existingNodeByActualTitle && !existingLinkByActualTitle) {
					// Add the new edge
					setGraphData((prevData) => ({
						nodes: prevData.nodes,
						links: [
							...prevData.links,
							{
								source: selectedNode.id,
								target: actualTitle,
								id: actualLinkId,
							},
						],
					}));

					// Don't switch to the new node - keep current selection
					setLoadingLinks((prev) => {
						const newSet = new Set(prev);
						newSet.delete(title);
						return newSet;
					});
					return;
				}

				// Add new node and edge to the graph
				const newNode: GraphNode = {
					id: actualTitle,
					title: actualTitle,
					content: pageData.content,
					fullHtml: pageData.fullHtml,
					url: pageData.url,
					outgoingLinks: pageData.links,
					expanded: false,
					val: calculateNodeSize(pageData.content, pageData.links, false),
					color: generateNodeColor(actualTitle),
				};

				setGraphData((prevData) => ({
					nodes: [...prevData.nodes, newNode],
					links: [
						...prevData.links,
						{
							source: selectedNode.id,
							target: actualTitle,
							id: actualLinkId,
						},
					],
				}));

				// Don't switch to the new node - keep current selection
			} catch (error) {
				console.error(
					`Failed to fetch and add ${title} to graph (middle click):`,
					error,
				);
			} finally {
				// Always remove loading state
				setLoadingLinks((prev) => {
					const newSet = new Set(prev);
					newSet.delete(title);
					return newSet;
				});
			}
		},
		[selectedNode, graphData.nodes, graphData.links, fetchPage],
	);

	const handlePanelResize = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			const startX = e.clientX;
			const startWidth = panelWidth;

			const handleMouseMove = (e: MouseEvent) => {
				const deltaX = startX - e.clientX;
				const newWidth = Math.max(400, Math.min(1000, startWidth + deltaX));
				setPanelWidth(newWidth);
			};

			const handleMouseUp = () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};

			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		},
		[panelWidth],
	);

	const removeNodeFromGraph = useCallback(
		(nodeToRemove: GraphNode) => {
			setGraphData((prevData) => {
				// First, remove the target node and all links connected to it
				const updatedNodes = prevData.nodes.filter(
					(node) => node.id !== nodeToRemove.id,
				);
				const updatedLinks = prevData.links.filter((link) => {
					// Handle both string IDs and object references from D3
					const sourceId =
						typeof link.source === "string"
							? link.source
							: (link.source as { id?: string })?.id || link.source;
					const targetId =
						typeof link.target === "string"
							? link.target
							: (link.target as { id?: string })?.id || link.target;
					return sourceId !== nodeToRemove.id && targetId !== nodeToRemove.id;
				});

				// Now find and remove orphan nodes (nodes that have no incoming links)
				const nodesToRemove = new Set([nodeToRemove.id]);
				let foundOrphans = true;

				while (foundOrphans) {
					foundOrphans = false;

					for (const node of updatedNodes) {
						// Skip if already marked for removal
						if (nodesToRemove.has(node.id)) continue;

						// Check if this node has any incoming links from nodes that aren't being removed
						const hasIncomingLinks = updatedLinks.some((link) => {
							const sourceId =
								typeof link.source === "string"
									? link.source
									: (link.source as { id?: string })?.id || link.source;
							const targetId =
								typeof link.target === "string"
									? link.target
									: (link.target as { id?: string })?.id || link.target;

							// This node is a target and the source is not being removed
							return targetId === node.id && !nodesToRemove.has(sourceId);
						});

						// If no incoming links, it's an orphan
						if (!hasIncomingLinks) {
							nodesToRemove.add(node.id);
							foundOrphans = true;
						}
					}
				}

				// Remove all orphan nodes and their links
				const finalNodes = updatedNodes.filter(
					(node) => !nodesToRemove.has(node.id),
				);
				const finalLinks = updatedLinks.filter((link) => {
					const sourceId =
						typeof link.source === "string"
							? link.source
							: (link.source as { id?: string })?.id || link.source;
					const targetId =
						typeof link.target === "string"
							? link.target
							: (link.target as { id?: string })?.id || link.target;
					return !nodesToRemove.has(sourceId) && !nodesToRemove.has(targetId);
				});

				console.log(
					`Removed ${nodesToRemove.size} nodes (including orphans):`,
					Array.from(nodesToRemove),
				);

				return {
					nodes: finalNodes,
					links: finalLinks,
				};
			});

			// Close the detail panel if we're removing the currently selected node
			if (selectedNode?.id === nodeToRemove.id) {
				setSelectedNode(null);
				setIsDetailPanelOpen(false);
			}
		},
		[selectedNode],
	);

	useEffect(() => {
		if (initialSearchQuery) {
			handleSearch(initialSearchQuery);
		}
	}, [initialSearchQuery, handleSearch]);

	return (
		<div className="relative flex h-screen bg-background">
			<style>{wikipediaStyles}</style>

			{graphData.nodes.length > 0 && (
				<div className="absolute top-4 left-4 z-10 bg-card rounded-lg shadow-lg border border-border px-3 py-2 flex items-center gap-3">
					<div className="text-xs text-muted-foreground font-medium">
						{graphData.nodes.length} nodes • {graphData.links.length} links
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleShare}
						disabled={isSharing}
						className="h-6 px-2 text-xs flex items-center gap-1"
					>
						<Share2 className="h-3 w-3" />
						{isSharing ? "Sharing..." : "Share"}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleRestart}
						className="h-6 px-2 text-xs flex items-center gap-1"
					>
						<RotateCcw className="h-3 w-3" />
						Restart
					</Button>
				</div>
			)}

			{/* Share Success Notification */}
			{showShareSuccess && (
				<div className="absolute top-16 left-4 z-20 bg-accent border border-accent rounded-lg px-3 py-2 shadow-lg">
					<div className="text-xs text-accent-foreground font-medium">
						✅ Rabbit hole shared! Link copied to clipboard
					</div>
				</div>
			)}

			{/* Graph Canvas Component */}
			<WikipediaGraphCanvas
				graphData={graphData}
				onNodeClick={handleNodeClick}
				onBackgroundClick={handleBackgroundClick}
			/>

			{/* Article Panel Component */}
			{selectedNode && (
				<WikipediaArticlePanel
					selectedNode={selectedNode}
					isDetailPanelOpen={isDetailPanelOpen}
					setIsDetailPanelOpen={setIsDetailPanelOpen}
					panelWidth={panelWidth}
					isCollapsed={isCollapsed}
					setIsCollapsed={setIsCollapsed}
					navigationHistory={navigationHistory}
					graphData={graphData}
					loadingLinks={loadingLinks}
					onLinkClick={handleArticleLinkClick}
					onMiddleClick={handleArticleMiddleClick}
					onRemoveNode={removeNodeFromGraph}
					onGoBackToParent={goBackToParent}
					onPanelResize={handlePanelResize}
				/>
			)}
		</div>
	);
}
