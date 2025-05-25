import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "~/trpc/react";
import type { GraphData, GraphNode } from "../types/graph";

export function useShareRabbithole() {
	const router = useRouter();
	const [isSharing, setIsSharing] = useState(false);
	const [showShareSuccess, setShowShareSuccess] = useState(false);
	const [showShareModal, setShowShareModal] = useState(false);
	const [shareTitle, setShareTitle] = useState("");
	const [shareAuthor, setShareAuthor] = useState("");

	const { mutateAsync: shareRabbithole } = api.rabbithole.share.useMutation({
		onError: (error) => {
			console.error("Error sharing rabbit hole:", error);
			setIsSharing(false);
		},
	});

	const handleShare = useCallback(async (graphData: GraphData) => {
		if (graphData.nodes.length === 0) return;

		// Find the root node (node with no incoming connections)
		const rootNode = graphData.nodes.find((node) => {
			return !graphData.links.some((link) => {
				const targetId =
					typeof link.target === "string"
						? link.target
						: (link.target as GraphNode).id;
				return targetId === node.id;
			});
		});

		// Generate a default title based on the root node or fallback to first node
		const baseTitle =
			rootNode?.title || graphData.nodes[0]?.title || "Wikipedia Rabbit Hole";
		const defaultTitle =
			graphData.nodes.length === 1
				? `${baseTitle} - Wikipedia Rabbit Hole`
				: `${baseTitle} and ${graphData.nodes.length - 1} more articles`;

		setShareTitle(defaultTitle);
		setShareAuthor("");
		setShowShareModal(true);
	}, []);

	const handleShareSubmit = useCallback(
		async (graphData: GraphData) => {
			if (graphData.nodes.length === 0) return;

			setIsSharing(true);
			try {
				// Normalize graph data - convert D3 object references back to string IDs
				// and ensure we don't have duplicate links
				const normalizedLinks = new Map<
					string,
					{ source: string; target: string; id: string }
				>();

				for (const link of graphData.links) {
					const sourceId =
						typeof link.source === "string"
							? link.source
							: (link.source as GraphNode).id || link.source;
					const targetId =
						typeof link.target === "string"
							? link.target
							: (link.target as GraphNode).id || link.target;

					// Create a consistent link ID to prevent duplicates
					const linkId = `${sourceId}->${targetId}`;

					// Only add if we haven't seen this exact link before
					if (!normalizedLinks.has(linkId)) {
						normalizedLinks.set(linkId, {
							source: sourceId,
							target: targetId,
							id: linkId,
						});
					}
				}

				const normalizedGraphData = {
					nodes: graphData.nodes,
					links: Array.from(normalizedLinks.values()),
				};

				const result = await shareRabbithole({
					title: shareTitle,
					creatorName: shareAuthor || undefined,
					description: `A Wikipedia rabbit hole with ${graphData.nodes.length} articles and ${normalizedLinks.size} connections.`,
					graphData: normalizedGraphData,
				});

				const url = `${window.location.origin}/${result.id}`;

				// Copy to clipboard
				await navigator.clipboard.writeText(url);

				// Close modal and show success notification
				setShowShareModal(false);
				setShowShareSuccess(true);
				setTimeout(() => setShowShareSuccess(false), 3000);

				// Redirect to the shared URL
				router.push(`/${result.id}`);
			} catch (error) {
				console.error("Failed to share rabbit hole:", error);
			} finally {
				setIsSharing(false);
			}
		},
		[shareRabbithole, shareTitle, shareAuthor, router],
	);

	const closeShareModal = useCallback(() => {
		setShowShareModal(false);
	}, []);

	return {
		// State
		isSharing,
		showShareSuccess,
		showShareModal,
		shareTitle,
		shareAuthor,

		// Actions
		handleShare,
		handleShareSubmit,
		closeShareModal,
		setShareTitle,
		setShareAuthor,
	};
}
