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
	const [panelWidth, setPanelWidth] = useState(900);
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

	const handleNodeRightClick = useCallback(
		(node: GraphNode) => {
			setGraphData((prevData) => {
				// Don't delete if it's the last node
				if (prevData.nodes.length <= 1) {
					console.log("Cannot delete the last node in the graph");
					return prevData;
				}

				// This is a simplified version that just removes the node and its links
				// The full cascading logic will be handled by the actual removeNodeFromGraph function
				const updatedNodes = prevData.nodes.filter((n) => n.id !== node.id);
				const updatedLinks = prevData.links.filter((link) => {
					const sourceId =
						typeof link.source === "string"
							? link.source
							: (link.source as { id?: string })?.id || link.source;
					const targetId =
						typeof link.target === "string"
							? link.target
							: (link.target as { id?: string })?.id || link.target;
					return sourceId !== node.id && targetId !== node.id;
				});

				console.log(`Right-click removed node: ${node.title}`);

				return {
					nodes: updatedNodes,
					links: updatedLinks,
				};
			});

			// Close the detail panel if we're removing the currently selected node
			if (selectedNode?.id === node.id) {
				setSelectedNode(null);
				setIsDetailPanelOpen(false);
			}
		},
		[selectedNode],
	);

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
				// Create lookup maps for faster searches
				const nodeMap = new Map(graphData.nodes.map((node) => [node.id, node]));
				const linkMap = new Map(graphData.links.map((link) => [link.id, link]));

				// Check if we already have this article in the graph (quick check first)
				const existingNode = nodeMap.get(title);
				const linkId = `${selectedNode.id}->${title}`;
				const existingLink = linkMap.get(linkId);

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
				const existingNodeByActualTitle = nodeMap.get(actualTitle);
				const actualLinkId = `${selectedNode.id}->${actualTitle}`;
				const existingLinkByActualTitle = linkMap.get(actualLinkId);

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

				// Batch all graph updates in a single state update
				setGraphData((prevData) => {
					const updatedNodes = [...prevData.nodes, newNode];
					const updatedLinks = [
						...prevData.links,
						{
							source: selectedNode.id,
							target: actualTitle,
							id: actualLinkId,
						},
					];

					// Optimized automatic edge creation using lookup maps
					const existingNodeTitles = new Set(
						prevData.nodes.map((node) => node.title),
					);
					const newNodeLinkTitles = new Set(
						pageData.links.map((link) => link.title.replace(/_/g, " ")),
					);

					// Check bidirectional connections more efficiently
					for (const existingNode of prevData.nodes) {
						// Check if new node links to existing node
						if (newNodeLinkTitles.has(existingNode.title)) {
							const linkId = `${actualTitle}->${existingNode.id}`;
							// Only add if this link doesn't already exist
							if (!updatedLinks.some((l) => l.id === linkId)) {
								updatedLinks.push({
									source: actualTitle,
									target: existingNode.id,
									id: linkId,
								});
							}
						}

						// Check if existing node links to new node (using cached outgoingLinks)
						if (existingNode.outgoingLinks) {
							const existingNodeLinksToNew = existingNode.outgoingLinks.some(
								(link) => {
									const linkTitle = link.title.replace(/_/g, " ");
									return linkTitle === actualTitle;
								},
							);

							if (existingNodeLinksToNew) {
								const linkId = `${existingNode.id}->${actualTitle}`;
								// Only add if this link doesn't already exist
								if (!updatedLinks.some((l) => l.id === linkId)) {
									updatedLinks.push({
										source: existingNode.id,
										target: actualTitle,
										id: linkId,
									});
								}
							}
						}
					}

					return {
						nodes: updatedNodes,
						links: updatedLinks,
					};
				});

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
		[selectedNode, fetchPage, graphData.nodes, graphData.links],
	);

	const handleArticleMiddleClick = useCallback(
		async (title: string) => {
			if (!selectedNode) return;

			// Add immediate loading state
			setLoadingLinks((prev) => new Set(prev).add(title));

			try {
				// Create lookup maps for faster searches
				const nodeMap = new Map(graphData.nodes.map((node) => [node.id, node]));
				const linkMap = new Map(graphData.links.map((link) => [link.id, link]));

				// Check if we already have this article in the graph (quick check first)
				const existingNode = nodeMap.get(title);
				const linkId = `${selectedNode.id}->${title}`;
				const existingLink = linkMap.get(linkId);

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
				const existingNodeByActualTitle = nodeMap.get(actualTitle);
				const actualLinkId = `${selectedNode.id}->${actualTitle}`;
				const existingLinkByActualTitle = linkMap.get(actualLinkId);

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

				// Batch all graph updates in a single state update
				setGraphData((prevData) => {
					const updatedNodes = [...prevData.nodes, newNode];
					const updatedLinks = [
						...prevData.links,
						{
							source: selectedNode.id,
							target: actualTitle,
							id: actualLinkId,
						},
					];

					// Optimized automatic edge creation using lookup maps
					const existingNodeTitles = new Set(
						prevData.nodes.map((node) => node.title),
					);
					const newNodeLinkTitles = new Set(
						pageData.links.map((link) => link.title.replace(/_/g, " ")),
					);

					// Check bidirectional connections more efficiently
					for (const existingNode of prevData.nodes) {
						// Check if new node links to existing node
						if (newNodeLinkTitles.has(existingNode.title)) {
							const linkId = `${actualTitle}->${existingNode.id}`;
							// Only add if this link doesn't already exist
							if (!updatedLinks.some((l) => l.id === linkId)) {
								updatedLinks.push({
									source: actualTitle,
									target: existingNode.id,
									id: linkId,
								});
							}
						}

						// Check if existing node links to new node (using cached outgoingLinks)
						if (existingNode.outgoingLinks) {
							const existingNodeLinksToNew = existingNode.outgoingLinks.some(
								(link) => {
									const linkTitle = link.title.replace(/_/g, " ");
									return linkTitle === actualTitle;
								},
							);

							if (existingNodeLinksToNew) {
								const linkId = `${existingNode.id}->${actualTitle}`;
								// Only add if this link doesn't already exist
								if (!updatedLinks.some((l) => l.id === linkId)) {
									updatedLinks.push({
										source: existingNode.id,
										target: actualTitle,
										id: linkId,
									});
								}
							}
						}
					}

					return {
						nodes: updatedNodes,
						links: updatedLinks,
					};
				});

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
		[selectedNode, fetchPage, graphData.nodes, graphData.links],
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
			// Don't delete if it's the last node
			if (graphData.nodes.length <= 1) {
				console.log("Cannot delete the last node in the graph");
				return;
			}

			// Check if this is a root node (no incoming connections)
			const isRootNode = !graphData.links.some((link) => {
				const targetId =
					typeof link.target === "string"
						? link.target
						: (link.target as { id?: string })?.id || link.target;
				return targetId === nodeToRemove.id;
			});

			// Don't allow deletion of root nodes
			if (isRootNode) {
				console.log("Cannot delete root node:", nodeToRemove.title);
				return;
			}

			setGraphData((prevData) => {
				// Start with removing the target node
				let updatedNodes = prevData.nodes.filter(
					(node) => node.id !== nodeToRemove.id,
				);

				// Remove all links connected to the target node
				let updatedLinks = prevData.links.filter((link) => {
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

				// Now find and remove orphaned nodes (nodes that can't reach any root)
				const nodesToRemove = new Set([nodeToRemove.id]);
				let foundOrphans = true;

				while (foundOrphans) {
					foundOrphans = false;

					for (const node of updatedNodes) {
						// Skip if already marked for removal
						if (nodesToRemove.has(node.id)) continue;

						// Check if this node can reach a root node
						const canReachRoot = canNodeReachAnyRoot(
							node.id,
							updatedLinks,
							updatedNodes,
							nodesToRemove,
						);

						// If it can't reach any root, it's orphaned
						if (!canReachRoot) {
							nodesToRemove.add(node.id);
							foundOrphans = true;
						}
					}

					// Remove newly identified orphan nodes and their links
					updatedNodes = updatedNodes.filter(
						(node) => !nodesToRemove.has(node.id),
					);
					updatedLinks = updatedLinks.filter((link) => {
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
				}

				console.log(
					`Removed ${nodesToRemove.size} nodes (including orphaned children):`,
					Array.from(nodesToRemove),
				);

				return {
					nodes: updatedNodes,
					links: updatedLinks,
				};
			});

			// Close the detail panel if we're removing the currently selected node
			if (selectedNode?.id === nodeToRemove.id) {
				setSelectedNode(null);
				setIsDetailPanelOpen(false);
			}
		},
		[selectedNode, graphData.nodes, graphData.links],
	);

	// Helper function to check if a node can reach any root node
	const canNodeReachAnyRoot = useCallback(
		(
			nodeId: string,
			links: GraphData["links"],
			nodes: GraphData["nodes"],
			excludeNodes: Set<string>,
		): boolean => {
			// Find all root nodes (nodes with no incoming connections)
			const rootNodes = nodes.filter((node) => {
				if (excludeNodes.has(node.id)) return false;

				const hasIncomingLinks = links.some((link) => {
					const targetId =
						typeof link.target === "string"
							? link.target
							: (link.target as { id?: string })?.id || link.target;
					const sourceId =
						typeof link.source === "string"
							? link.source
							: (link.source as { id?: string })?.id || link.source;

					return targetId === node.id && !excludeNodes.has(sourceId);
				});

				return !hasIncomingLinks;
			});

			// If this node is itself a root, it can reach a root
			if (rootNodes.some((root) => root.id === nodeId)) {
				return true;
			}

			// Use BFS to see if we can reach any root node by following incoming links
			const visited = new Set<string>();
			const queue = [nodeId];
			visited.add(nodeId);

			while (queue.length > 0) {
				const currentNodeId = queue.shift();
				if (!currentNodeId) continue;

				// Find all nodes that point to the current node (incoming links)
				const incomingNodes = links
					.filter((link) => {
						const targetId =
							typeof link.target === "string"
								? link.target
								: (link.target as { id?: string })?.id || link.target;
						const sourceId =
							typeof link.source === "string"
								? link.source
								: (link.source as { id?: string })?.id || link.source;

						return targetId === currentNodeId && !excludeNodes.has(sourceId);
					})
					.map((link) => {
						const sourceId =
							typeof link.source === "string"
								? link.source
								: (link.source as { id?: string })?.id || link.source;
						return sourceId;
					});

				for (const incomingNodeId of incomingNodes) {
					// If we reached a root node, we can reach a root
					if (rootNodes.some((root) => root.id === incomingNodeId)) {
						return true;
					}

					// Add to queue if not visited
					if (!visited.has(incomingNodeId)) {
						visited.add(incomingNodeId);
						queue.push(incomingNodeId);
					}
				}
			}

			return false;
		},
		[],
	);

	useEffect(() => {
		if (initialSearchQuery) {
			handleSearch(initialSearchQuery);
		}
	}, [initialSearchQuery, handleSearch]);

	return (
		<div className="relative flex h-screen bg-background overflow-hidden">
			<style>{wikipediaStyles}</style>

			{graphData.nodes.length > 0 && (
				<div className="absolute top-4 left-4 z-10 flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
					<div className="font-medium text-muted-foreground text-xs">
						{graphData.nodes.length} nodes • {graphData.links.length} links
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleShare}
						disabled={isSharing}
						className="flex h-6 items-center gap-1 px-2 text-xs"
					>
						<Share2 className="h-3 w-3" />
						{isSharing ? "Sharing..." : "Share"}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleRestart}
						className="flex h-6 items-center gap-1 px-2 text-xs"
					>
						<RotateCcw className="h-3 w-3" />
						Restart
					</Button>
				</div>
			)}

			{/* Share Success Notification */}
			{showShareSuccess && (
				<div className="absolute top-16 left-4 z-20 rounded-lg border border-accent bg-accent px-3 py-2 shadow-lg">
					<div className="font-medium text-accent-foreground text-xs">
						✅ Rabbit hole shared! Link copied to clipboard
					</div>
				</div>
			)}

			{/* Graph Canvas Component */}
			<WikipediaGraphCanvas
				graphData={graphData}
				onNodeClick={handleNodeClick}
				onBackgroundClick={handleBackgroundClick}
				onNodeRightClick={handleNodeRightClick}
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
