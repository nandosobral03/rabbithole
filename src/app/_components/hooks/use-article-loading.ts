import { useCallback, useState } from "react";
import { api } from "~/trpc/react";
import type {
	GraphData,
	GraphNode,
	WikipediaFullPageData,
} from "../types/graph";
import { calculateNodeSize, generateNodeColor } from "../utils/graph-utils";

interface UseArticleLoadingProps {
	graphData: GraphData;
	setGraphData: (updater: (prevData: GraphData) => GraphData) => void;
	selectedNode: GraphNode | null;
	setSelectedNode: (node: GraphNode | null) => void;
	setNavigationHistory: (updater: (prev: string[]) => string[]) => void;
	onGraphChange?: () => void;
}

export function useArticleLoading({
	graphData,
	setGraphData,
	selectedNode,
	setSelectedNode,
	setNavigationHistory,
	onGraphChange,
}: UseArticleLoadingProps) {
	const [loadingLinks, setLoadingLinks] = useState<Set<string>>(new Set());

	const {
		mutateAsync: fetchPage,
		isPending: isFetchingPage,
		error: fetchPageError,
	} = api.wikipedia.fetchFullPageWithLinks.useMutation({
		onError: (error) => {
			console.error("Error fetching Wikipedia page:", error);
		},
	});

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

				// Call onGraphChange when a new node is added
				onGraphChange?.();

				return { nodes: [...prevData.nodes, newNode], links: prevData.links };
			});
		},
		[setGraphData, onGraphChange],
	);

	const handleSearch = useCallback(
		async (query: string) => {
			const pageData = await fetchPage({ title: query });
			addNodeToGraph(pageData, true);
		},
		[fetchPage, addNodeToGraph],
	);

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

					// Call onGraphChange when a new node is added
					onGraphChange?.();

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
		[
			selectedNode,
			fetchPage,
			graphData.nodes,
			graphData.links,
			onGraphChange,
			setGraphData,
			setSelectedNode,
			setNavigationHistory,
		],
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

					// Call onGraphChange when a new node is added
					onGraphChange?.();

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
		[
			selectedNode,
			fetchPage,
			graphData.nodes,
			graphData.links,
			onGraphChange,
			setGraphData,
		],
	);

	return {
		// State
		loadingLinks,
		isFetchingPage,
		fetchPageError,

		// Actions
		handleSearch,
		handleArticleLinkClick,
		handleArticleMiddleClick,
		addNodeToGraph,
	};
}
