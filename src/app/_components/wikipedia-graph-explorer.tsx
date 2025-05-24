"use client";

import { useCallback, useState } from "react";
import { api } from "~/trpc/react";
import { WikipediaGraphCanvas } from "./graph/wikipedia-graph-canvas";
import { WikipediaArticlePanel } from "./panels/wikipedia-article-panel";
import { WikipediaSearchBar } from "./search/wikipedia-search-bar";
import type {
	GraphData,
	GraphNode,
	WikipediaFullPageData,
} from "./types/graph";
import { calculateNodeSize, generateNodeColor } from "./utils/graph-utils";
import { wikipediaStyles } from "./wikipedia-article-viewer";

export function WikipediaGraphExplorer() {
	const [searchQuery, setSearchQuery] = useState("");
	const [graphData, setGraphData] = useState<GraphData>({
		nodes: [],
		links: [],
	});
	const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
	const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
	const [panelWidth, setPanelWidth] = useState(700);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [loadingLinks, setLoadingLinks] = useState<Set<string>>(new Set());
	const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

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

	const expandNode = useCallback(
		async (node: GraphNode) => {
			if (node.expanded) return;

			setGraphData((prevData) => {
				const updatedNodes = prevData.nodes.map((n) =>
					n.id === node.id ? { ...n, expanded: true } : n,
				);
				return { ...prevData, nodes: updatedNodes };
			});

			const linksToAdd = node.outgoingLinks.slice(0, 10);
			const newNodes: GraphNode[] = [];
			const newLinks: { source: string; target: string; id: string }[] = [];

			for (const link of linksToAdd) {
				setGraphData((prevData) => {
					const existingNode = prevData.nodes.find((n) => n.id === link.title);

					if (!existingNode) {
						const placeholderNode: GraphNode = {
							id: link.title,
							title: link.title,
							content: "Loading...",
							fullHtml: "",
							url: link.url,
							outgoingLinks: [],
							expanded: false,
							val: calculateNodeSize("Loading...", [], false),
							color: generateNodeColor(link.title),
						};
						newNodes.push(placeholderNode);
					}

					const linkId = `${node.id}->${link.title}`;
					if (!prevData.links.find((l) => l.id === linkId)) {
						newLinks.push({
							source: node.id,
							target: link.title,
							id: linkId,
						});
					}

					return {
						nodes: existingNode
							? prevData.nodes
							: [...prevData.nodes, ...newNodes],
						links: [...prevData.links, ...newLinks],
					};
				});

				// Fetch data in background
				try {
					const pageData = await fetchPage({ title: link.title });
					addNodeToGraph(pageData);
				} catch (error) {
					console.error(`Failed to fetch data for ${link.title}:`, error);
				}
			}
		},
		[fetchPage, addNodeToGraph],
	);

	const handleSearch = async (query: string) => {
		const pageData = await fetchPage({ title: query });
		addNodeToGraph(pageData, true);
	};

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

	const handleNodeRightClick = useCallback(
		(node: GraphNode) => {
			expandNode(node);
		},
		[expandNode],
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
				console.log("🔗 Clicked article link:", title);

				// Check if we already have this article in the graph (quick check first)
				const existingNode = graphData.nodes.find((n) => n.id === title);
				const linkId = `${selectedNode.id}->${title}`;
				const existingLink = graphData.links.find((l) => l.id === linkId);

				// If the node and link already exist, just switch to that node (no API call needed)
				if (existingNode && existingLink) {
					console.log(
						"✅ Article already exists in graph, switching to:",
						title,
					);
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
					console.log(
						"🔗 Adding new edge to existing node:",
						selectedNode.id,
						"->",
						title,
					);

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

				console.log("📍 Wikipedia returned article:", actualTitle);

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
					console.log(
						"✅ Article already exists in graph (by actual title), switching to:",
						actualTitle,
					);
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
					console.log(
						"🔗 Adding new edge to existing node (by actual title):",
						selectedNode.id,
						"->",
						actualTitle,
					);

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
				console.log("➕ Adding new article to graph:", actualTitle);

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

				console.log("✅ Successfully added and switched to:", actualTitle);
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

	const handleArticleMiddleClick = useCallback(
		async (title: string) => {
			if (!selectedNode) return;

			// Add immediate loading state
			setLoadingLinks((prev) => new Set(prev).add(title));

			try {
				console.log("🖱️ Middle clicked article link:", title);

				// Check if we already have this article in the graph (quick check first)
				const existingNode = graphData.nodes.find((n) => n.id === title);
				const linkId = `${selectedNode.id}->${title}`;
				const existingLink = graphData.links.find((l) => l.id === linkId);

				// If the node and link already exist, don't switch view but just log
				if (existingNode && existingLink) {
					console.log(
						"✅ Article already exists in graph (middle click):",
						title,
					);
					setLoadingLinks((prev) => {
						const newSet = new Set(prev);
						newSet.delete(title);
						return newSet;
					});
					return;
				}

				// If we have the node but not the link (different path to same article)
				if (existingNode && !existingLink) {
					console.log(
						"🔗 Adding new edge to existing node (middle click):",
						selectedNode.id,
						"->",
						title,
					);

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

				console.log(
					"📍 Wikipedia returned article (middle click):",
					actualTitle,
				);

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
					console.log(
						"✅ Article already exists in graph (by actual title, middle click):",
						actualTitle,
					);
					setLoadingLinks((prev) => {
						const newSet = new Set(prev);
						newSet.delete(title);
						return newSet;
					});
					return;
				}

				// If we have the node but not the link (different path to same article)
				if (existingNodeByActualTitle && !existingLinkByActualTitle) {
					console.log(
						"🔗 Adding new edge to existing node (by actual title, middle click):",
						selectedNode.id,
						"->",
						actualTitle,
					);

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
				console.log(
					"➕ Adding new article to graph (middle click):",
					actualTitle,
				);

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
				console.log(
					"✅ Successfully added (middle click, no switch):",
					actualTitle,
				);
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
				// Remove the node and all links connected to it
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
		[selectedNode],
	);

	return (
		<div className="relative flex h-screen bg-gray-50">
			<style>{wikipediaStyles}</style>

			{/* Search Bar Component */}
			<WikipediaSearchBar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				onSearch={handleSearch}
				isFetchingPage={isFetchingPage}
				fetchPageError={fetchPageError}
				graphData={graphData}
			/>

			{/* Graph Canvas Component */}
			<WikipediaGraphCanvas
				graphData={graphData}
				onNodeClick={handleNodeClick}
				onNodeRightClick={handleNodeRightClick}
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
