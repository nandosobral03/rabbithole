"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { type GraphCanvasRef, WikipediaGraphCanvas } from "./graph/wikipedia-graph-canvas";
import { useBfsLoading } from "./hooks/use-bfs-loading";
import { useGraphNavigation } from "./hooks/use-graph-navigation";
import { useShareRabbithole } from "./hooks/use-share-rabbithole";
import { ShareModal } from "./modals/share-modal";
import { WikipediaArticlePanel } from "./panels/wikipedia-article-panel";
import { GraphControls } from "./shared/graph-controls";
import { LoadingOverlay } from "./shared/loading-overlay";
import { ShareSuccessNotification } from "./shared/share-success-notification";
import { ZoomControls } from "./shared/zoom-controls";
import type { GraphData, GraphNode, WikipediaFullPageData } from "./types/graph";
import { calculateNodeSize, generateNodeColor } from "./utils/graph-utils";
import { wikipediaStyles } from "./wikipedia-article-viewer";

interface WikipediaGraphExplorerProps {
  initialGraphData?: GraphData;
  initialSearchQuery?: string | null;
  onGraphChange?: () => void;
}

export function WikipediaGraphExplorer({ initialGraphData, initialSearchQuery, onGraphChange }: WikipediaGraphExplorerProps = {}) {
  const router = useRouter();
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [panelWidth, setPanelWidth] = useState(900);
  const [loadingLinks, setLoadingLinks] = useState<Set<string>>(new Set());
  const [shouldGlowHome, setShouldGlowHome] = useState(false);

  // Ref for graph canvas to access zoom methods
  const graphCanvasRef = useRef<GraphCanvasRef>(null);
  // Ref to track if initial data has been loaded to prevent double loading
  const hasLoadedInitialData = useRef(false);

  // Custom hooks
  const { isLoadingInitialData, loadInitialGraphDataWithBFS } = useBfsLoading({
    onGraphDataUpdate: setGraphData,
  });

  const { selectedNode, isDetailPanelOpen, isCollapsed, navigationHistory, handleNodeClick, handleBackgroundClick, goBackToParent, clearSelection, setSelectedNode, setIsDetailPanelOpen, setIsCollapsed, setNavigationHistory } =
    useGraphNavigation();

  const { isSharing, showShareSuccess, showShareModal, shareTitle, shareAuthor, handleShare, handleShareSubmit, closeShareModal, setShareTitle, setShareAuthor } = useShareRabbithole();

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    graphCanvasRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    graphCanvasRef.current?.zoomOut();
  }, []);

  const handleZoomReset = useCallback(() => {
    graphCanvasRef.current?.zoomReset();
  }, []);

  // Load initial data with BFS animation when component mounts
  useEffect(() => {
    if (initialGraphData && initialGraphData.nodes.length > 0 && !hasLoadedInitialData.current) {
      hasLoadedInitialData.current = true;
      loadInitialGraphDataWithBFS(initialGraphData);
    }
  }, [initialGraphData, loadInitialGraphDataWithBFS]);

  // Handle browser back button for custom navigation
  useEffect(() => {
    let glowTimeout: NodeJS.Timeout | null = null;

    const handlePopState = (event: PopStateEvent) => {
      // Prevent default browser navigation
      event.preventDefault();

      // If no article is open, make home button glow and do nothing else
      if (!selectedNode || !isDetailPanelOpen) {
        setShouldGlowHome(true);
        // Auto-hide glow after 3 seconds
        glowTimeout = setTimeout(() => setShouldGlowHome(false), 3000);
        // Push current state back to prevent navigation away from page
        window.history.pushState(null, "", window.location.href);
        return;
      }

      // If there's navigation history, go back to parent
      if (navigationHistory.length > 0) {
        goBackToParent(graphData);
      } else {
        // No parent available, close the article panel
        clearSelection();
      }

      // Push current state back to prevent navigation away from page
      window.history.pushState(null, "", window.location.href);
    };

    // Add a state to the history stack when component mounts
    window.history.pushState(null, "", window.location.href);

    // Listen for popstate events (back button)
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (glowTimeout) {
        clearTimeout(glowTimeout);
      }
    };
  }, [selectedNode, isDetailPanelOpen, navigationHistory, graphData, goBackToParent, clearSelection]);

  const addNodeToGraph = useCallback(
    (pageData: WikipediaFullPageData, isRoot = false) => {
      setGraphData((prevData) => {
        const existingNodeIndex = prevData.nodes.findIndex((node) => node.id === pageData.title);

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
    [onGraphChange]
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

  const handleSearch = useCallback(
    async (query: string) => {
      const pageData = await fetchPage({ title: query });
      addNodeToGraph(pageData, true);
    },
    [fetchPage, addNodeToGraph]
  );

  const handleRestart = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleNodeRightClick = useCallback(
    (node: GraphNode) => {
      setGraphData((prevData) => {
        if (prevData.nodes.length <= 1) {
          return prevData;
        }

        const updatedNodes = prevData.nodes.filter((n) => n.id !== node.id);
        const updatedLinks = prevData.links.filter((link) => {
          const sourceId = typeof link.source === "string" ? link.source : (link.source as { id?: string })?.id || link.source;
          const targetId = typeof link.target === "string" ? link.target : (link.target as { id?: string })?.id || link.target;
          return sourceId !== node.id && targetId !== node.id;
        });

        onGraphChange?.();

        return {
          nodes: updatedNodes,
          links: updatedLinks,
        };
      });

      // Close the detail panel if we're removing the currently selected node
      if (selectedNode?.id === node.id) {
        clearSelection();
      }
    },
    [selectedNode, onGraphChange, clearSelection]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
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
          const existingNodeTitles = new Set(prevData.nodes.map((node) => node.title));
          const newNodeLinkTitles = new Set(pageData.links.map((link) => link.title.replace(/_/g, " ")));

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
              const existingNodeLinksToNew = existingNode.outgoingLinks.some((link) => {
                const linkTitle = link.title.replace(/_/g, " ");
                return linkTitle === actualTitle;
              });

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
    [selectedNode, fetchPage, graphData.nodes, graphData.links, onGraphChange]
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
          const existingNodeTitles = new Set(prevData.nodes.map((node) => node.title));
          const newNodeLinkTitles = new Set(pageData.links.map((link) => link.title.replace(/_/g, " ")));

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
              const existingNodeLinksToNew = existingNode.outgoingLinks.some((link) => {
                const linkTitle = link.title.replace(/_/g, " ");
                return linkTitle === actualTitle;
              });

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
        console.error(`Failed to fetch and add ${title} to graph (middle click):`, error);
      } finally {
        // Always remove loading state
        setLoadingLinks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(title);
          return newSet;
        });
      }
    },
    [selectedNode, fetchPage, graphData.nodes, graphData.links, onGraphChange]
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
    [panelWidth]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const removeNodeFromGraph = useCallback(
    (nodeToRemove: GraphNode) => {
      if (graphData.nodes.length <= 1) {
        return;
      }

      // Check if this is a root node (no incoming connections)
      const isRootNode = !graphData.links.some((link) => {
        const targetId = typeof link.target === "string" ? link.target : (link.target as { id?: string })?.id || link.target;
        return targetId === nodeToRemove.id;
      });

      // Don't allow deletion of root nodes
      if (isRootNode) {
        return;
      }

      setGraphData((prevData) => {
        // Start with removing the target node
        let updatedNodes = prevData.nodes.filter((node) => node.id !== nodeToRemove.id);

        // Remove all links connected to the target node
        let updatedLinks = prevData.links.filter((link) => {
          // Handle both string IDs and object references from D3
          const sourceId = typeof link.source === "string" ? link.source : (link.source as { id?: string })?.id || link.source;
          const targetId = typeof link.target === "string" ? link.target : (link.target as { id?: string })?.id || link.target;
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
            const canReachRoot = canNodeReachAnyRoot(node.id, updatedLinks, updatedNodes, nodesToRemove);

            // If it can't reach any root, it's orphaned
            if (!canReachRoot) {
              nodesToRemove.add(node.id);
              foundOrphans = true;
            }
          }

          // Remove newly identified orphan nodes and their links
          updatedNodes = updatedNodes.filter((node) => !nodesToRemove.has(node.id));
          updatedLinks = updatedLinks.filter((link) => {
            const sourceId = typeof link.source === "string" ? link.source : (link.source as { id?: string })?.id || link.source;
            const targetId = typeof link.target === "string" ? link.target : (link.target as { id?: string })?.id || link.target;
            return !nodesToRemove.has(sourceId) && !nodesToRemove.has(targetId);
          });
        }

        // Call onGraphChange when nodes are removed
        onGraphChange?.();

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
    [selectedNode, graphData.nodes, graphData.links, onGraphChange]
  );

  // Helper function to check if a node can reach any root node
  const canNodeReachAnyRoot = useCallback((nodeId: string, links: GraphData["links"], nodes: GraphData["nodes"], excludeNodes: Set<string>): boolean => {
    // Find all root nodes (nodes with no incoming connections)
    const rootNodes = nodes.filter((node) => {
      if (excludeNodes.has(node.id)) return false;

      const hasIncomingLinks = links.some((link) => {
        const targetId = typeof link.target === "string" ? link.target : (link.target as { id?: string })?.id || link.target;
        const sourceId = typeof link.source === "string" ? link.source : (link.source as { id?: string })?.id || link.source;

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
          const targetId = typeof link.target === "string" ? link.target : (link.target as { id?: string })?.id || link.target;
          const sourceId = typeof link.source === "string" ? link.source : (link.source as { id?: string })?.id || link.source;

          return targetId === currentNodeId && !excludeNodes.has(sourceId);
        })
        .map((link) => {
          const sourceId = typeof link.source === "string" ? link.source : (link.source as { id?: string })?.id || link.source;
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
  }, []);

  useEffect(() => {
    if (initialSearchQuery) {
      handleSearch(initialSearchQuery);
    }
  }, [initialSearchQuery, handleSearch]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <style>{wikipediaStyles}</style>

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isLoadingInitialData} title="Loading rabbit hole..." nodeCount={graphData.nodes.length} />

      {/* Graph Controls */}
      <GraphControls
        nodeCount={graphData.nodes.length}
        linkCount={graphData.links.length}
        isLoading={isLoadingInitialData}
        isSharing={isSharing}
        onShare={() => handleShare(graphData)}
        onRestart={handleRestart}
        shouldGlowHome={shouldGlowHome}
      />

      {/* Share Success Notification */}
      <ShareSuccessNotification isVisible={showShareSuccess} />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={closeShareModal}
        shareTitle={shareTitle}
        setShareTitle={setShareTitle}
        shareAuthor={shareAuthor}
        setShareAuthor={setShareAuthor}
        onSubmit={() => handleShareSubmit(graphData)}
        isSharing={isSharing}
      />

      {/* Graph Canvas Component */}
      <WikipediaGraphCanvas ref={graphCanvasRef} graphData={graphData} onNodeClick={handleNodeClick} onBackgroundClick={handleBackgroundClick} onNodeRightClick={handleNodeRightClick} selectedNodeId={selectedNode?.id || null} />

      {/* Zoom Controls */}
      {graphData.nodes.length > 0 && <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onZoomReset={handleZoomReset} disabled={isLoadingInitialData} />}

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
          onGoBackToParent={() => goBackToParent(graphData)}
          onPanelResize={handlePanelResize}
        />
      )}
    </div>
  );
}
