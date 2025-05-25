import { useCallback, useState } from "react";
import type { GraphData, GraphNode } from "../types/graph";

interface UseBfsLoadingProps {
	onGraphDataUpdate: (updater: (prevData: GraphData) => GraphData) => void;
}

export function useBfsLoading({ onGraphDataUpdate }: UseBfsLoadingProps) {
	const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);

	const loadInitialGraphDataWithBFS = useCallback(
		async (initialData: GraphData) => {
			if (!initialData || initialData.nodes.length === 0) return;

			setIsLoadingInitialData(true);

			// Find root nodes (nodes with no incoming connections)
			const rootNodes = initialData.nodes.filter((node) => {
				return !initialData.links.some((link) => {
					const targetId =
						typeof link.target === "string"
							? link.target
							: (link.target as GraphNode).id;
					return targetId === node.id;
				});
			});

			// If no root nodes found, use the first node as root
			const firstNode = initialData.nodes[0];
			if (!firstNode) return;

			const startNodes = rootNodes.length > 0 ? rootNodes : [firstNode];

			// BFS queue and tracking
			const queue: GraphNode[] = [...startNodes];
			const addedNodes = new Set<string>();
			const nodesToAdd: GraphNode[] = [];
			const linksToAdd: GraphData["links"] = [];
			const addedLinks = new Set<string>(); // Track added link IDs to prevent duplicates

			// Build BFS order
			while (queue.length > 0) {
				const currentNode = queue.shift();
				if (!currentNode) continue;

				if (addedNodes.has(currentNode.id)) continue;

				addedNodes.add(currentNode.id);
				nodesToAdd.push(currentNode);

				// Find all links from this node and add target nodes to queue
				const outgoingLinks = initialData.links.filter((link) => {
					const sourceId =
						typeof link.source === "string"
							? link.source
							: (link.source as GraphNode).id;
					return sourceId === currentNode.id;
				});

				for (const link of outgoingLinks) {
					// Only add if we haven't seen this link before
					if (!addedLinks.has(link.id)) {
						linksToAdd.push(link);
						addedLinks.add(link.id);
					}

					const targetId =
						typeof link.target === "string"
							? link.target
							: (link.target as GraphNode).id;
					const targetNode = initialData.nodes.find(
						(node) => node.id === targetId,
					);

					if (targetNode && !addedNodes.has(targetNode.id)) {
						queue.push(targetNode);
					}
				}

				// Also find incoming links to this node
				const incomingLinks = initialData.links.filter((link) => {
					const targetId =
						typeof link.target === "string"
							? link.target
							: (link.target as GraphNode).id;
					return targetId === currentNode.id;
				});

				for (const link of incomingLinks) {
					// Only add if we haven't seen this link before
					if (!addedLinks.has(link.id)) {
						linksToAdd.push(link);
						addedLinks.add(link.id);
					}
				}
			}

			// Add nodes progressively with intervals
			let currentIndex = 0;
			const addNextNode = () => {
				if (currentIndex >= nodesToAdd.length) {
					setIsLoadingInitialData(false);
					return;
				}

				// Add one node at a time for clear BFS visualization
				const nodeToAdd = nodesToAdd[currentIndex];
				if (!nodeToAdd) {
					currentIndex++;
					setTimeout(addNextNode, 200);
					return;
				}

				onGraphDataUpdate((prevData) => {
					const newNodes = [...prevData.nodes, nodeToAdd];

					// Add links for this specific node
					const relevantLinks = linksToAdd.filter((link) => {
						const sourceId =
							typeof link.source === "string"
								? link.source
								: (link.source as GraphNode).id;
						const targetId =
							typeof link.target === "string"
								? link.target
								: (link.target as GraphNode).id;

						// Include link if both source and target are now in the graph
						return (
							newNodes.some((n) => n && n.id === sourceId) &&
							newNodes.some((n) => n && n.id === targetId)
						);
					});

					return {
						nodes: newNodes,
						links: relevantLinks,
					};
				});

				currentIndex++;

				// Schedule next node with shorter interval for smoother animation
				setTimeout(addNextNode, 200); // 200ms interval between individual nodes
			};

			// Start the progressive loading
			addNextNode();
		},
		[onGraphDataUpdate],
	);

	return {
		isLoadingInitialData,
		loadInitialGraphDataWithBFS,
	};
}
