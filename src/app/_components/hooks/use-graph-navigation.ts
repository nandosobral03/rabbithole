import { useCallback, useState } from "react";
import type { GraphData, GraphNode } from "../types/graph";

export function useGraphNavigation() {
	const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
	const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

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

	const goBackToParent = useCallback(
		(graphData: GraphData) => {
			if (navigationHistory.length === 0) return;

			const parentNodeId = navigationHistory[navigationHistory.length - 1];
			const parentNode = graphData.nodes.find(
				(node) => node.id === parentNodeId,
			);

			if (parentNode) {
				// Remove the last item from history
				setNavigationHistory((prev) => prev.slice(0, -1));
				setSelectedNode(parentNode);
			}
		},
		[navigationHistory],
	);

	const clearSelection = useCallback(() => {
		setSelectedNode(null);
		setIsDetailPanelOpen(false);
	}, []);

	return {
		// State
		selectedNode,
		isDetailPanelOpen,
		isCollapsed,
		navigationHistory,

		// Actions
		handleNodeClick,
		handleBackgroundClick,
		goBackToParent,
		clearSelection,
		setSelectedNode,
		setIsDetailPanelOpen,
		setIsCollapsed,
		setNavigationHistory,
	};
}
