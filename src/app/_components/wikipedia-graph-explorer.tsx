"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { ExternalLink, Loader2, Search, X, Expand } from "lucide-react";
import { WikipediaArticleViewer, wikipediaStyles } from "./wikipedia-article-viewer";

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface WikipediaLink {
  title: string;
  url: string;
}

interface WikipediaFullPageData {
  title: string;
  content: string;
  fullHtml: string;
  links: WikipediaLink[];
  url: string;
}

interface GraphNode {
  id: string;
  title: string;
  content: string;
  fullHtml: string;
  url: string;
  outgoingLinks: WikipediaLink[];
  expanded: boolean;
  val: number;
  color: string;
}

interface GraphLink {
  source: string;
  target: string;
  id: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const generateNodeColor = (title: string): string => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

const calculateNodeSize = (content: string, isRoot = false): number => {
  const MIN_SIZE = 8;
  const MAX_SIZE = 25;
  const ROOT_BONUS = 5;

  // Base size on content length (characters)
  const contentLength = content.length;

  // Scale content length to size range
  // Typical Wikipedia article summaries: 200-2000 characters
  // Full articles: 1000-50000+ characters
  const normalizedLength = Math.log(Math.max(contentLength, 100)) / Math.log(50000);
  const scaledSize = MIN_SIZE + normalizedLength * (MAX_SIZE - MIN_SIZE);

  // Clamp to min/max bounds
  let size = Math.max(MIN_SIZE, Math.min(MAX_SIZE, scaledSize));

  // Add bonus for root nodes
  if (isRoot) {
    size += ROOT_BONUS;
  }

  return Math.round(size);
};

export function WikipediaGraphExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  // Configure d3 forces for better node separation
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      // Configure the charge (repulsion) force for node separation
      graphRef.current.d3Force("charge").strength(-800).distanceMax(200);

      // Configure the link force for connection distance
      graphRef.current.d3Force("link").distance(150);

      // Reheat the simulation to apply the new forces
      graphRef.current.d3ReheatSimulation();
    }
  }, [graphData.nodes.length]);

  const addNodeToGraph = useCallback((pageData: WikipediaFullPageData, isRoot = false) => {
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
        val: calculateNodeSize(pageData.content, isRoot),
        color: generateNodeColor(pageData.title),
      };

      return { nodes: [...prevData.nodes, newNode], links: prevData.links };
    });
  }, []);

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
        const updatedNodes = prevData.nodes.map((n) => (n.id === node.id ? { ...n, expanded: true } : n));
        return { ...prevData, nodes: updatedNodes };
      });

      const linksToAdd = node.outgoingLinks.slice(0, 10);
      const newNodes: GraphNode[] = [];
      const newLinks: GraphLink[] = [];

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
              val: calculateNodeSize("Loading...", false),
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
            nodes: existingNode ? prevData.nodes : [...prevData.nodes, ...newNodes],
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
    [fetchPage, addNodeToGraph]
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const pageData = await fetchPage({ title: searchQuery.trim() });
    addNodeToGraph(pageData, true);
    setSearchQuery("");
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node as GraphNode);
    setIsDetailPanelOpen(true);
  }, []);

  const handleNodeRightClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      expandNode(node as GraphNode);
    },
    [expandNode]
  );

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setIsDetailPanelOpen(false);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const handleArticleLinkClick = useCallback(
    async (title: string) => {
      if (!selectedNode) return;

      try {
        console.log("🔗 Clicked article link:", title);

        // Use the raw tRPC client to avoid triggering the onSuccess handler
        const pageData = await fetchPage({ title });
        const actualTitle = pageData.title;

        console.log("📍 Wikipedia returned article:", actualTitle);

        // Check if we already have this article (by actual title) in the graph
        const existingNode = graphData.nodes.find((n) => n.id === actualTitle);
        const linkId = `${selectedNode.id}->${actualTitle}`;
        const existingLink = graphData.links.find((l) => l.id === linkId);

        // If the node and link already exist, just switch to that node
        if (existingNode && existingLink) {
          console.log("✅ Article already exists in graph, switching to:", actualTitle);
          setSelectedNode(existingNode);
          return;
        }

        // If we have the node but not the link (different path to same article)
        if (existingNode && !existingLink) {
          console.log("🔗 Adding new edge to existing node:", selectedNode.id, "->", actualTitle);

          // Add the new edge
          setGraphData((prevData) => ({
            nodes: prevData.nodes,
            links: [
              ...prevData.links,
              {
                source: selectedNode.id,
                target: actualTitle,
                id: linkId,
              },
            ],
          }));

          setSelectedNode(existingNode);
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
          val: calculateNodeSize(pageData.content, false),
          color: generateNodeColor(actualTitle),
        };

        setGraphData((prevData) => ({
          nodes: [...prevData.nodes, newNode],
          links: [
            ...prevData.links,
            {
              source: selectedNode.id,
              target: actualTitle,
              id: linkId,
            },
          ],
        }));

        // Switch to the new node in the detail panel
        setSelectedNode(newNode);

        console.log("✅ Successfully added and switched to:", actualTitle);
      } catch (error) {
        console.error(`Failed to fetch and add ${title} to graph:`, error);
      }
    },
    [selectedNode, graphData.nodes, graphData.links]
  );

  return (
    <div className="h-screen flex bg-gray-50">
      <style>{wikipediaStyles}</style>

      {/* Search Panel */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Wikipedia Graph Explorer</h2>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex gap-2">
              <Input type="text" placeholder="Search Wikipedia..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" disabled={isFetchingPage} />
              <Button type="submit" size="icon" disabled={isFetchingPage || !searchQuery.trim()}>
                {isFetchingPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {fetchPageError && <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{fetchPageError.message}</div>}
          </form>
        </div>

        <div className="p-4 text-sm text-gray-600 space-y-2">
          <p>
            <strong>How to use:</strong>
          </p>
          <ul className="space-y-1 text-xs">
            <li>• Click a node to view full article</li>
            <li>• Click links in articles to add them to the graph</li>
            <li>• Right-click to expand connections</li>
            <li>• Drag to move nodes around</li>
            <li>• Scroll to zoom in/out</li>
          </ul>
        </div>

        <div className="p-4 border-t border-gray-200 text-sm text-gray-500">
          Nodes: {graphData.nodes.length} | Links: {graphData.links.length}
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 relative">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeId="id"
          nodeLabel="title"
          nodeVal="val"
          nodeColor="color"
          d3AlphaDecay={0.005}
          d3VelocityDecay={0.3}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.15}
          linkDirectionalParticles={1}
          linkDirectionalParticleSpeed={0.006}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
          onBackgroundClick={handleBackgroundClick}
          width={typeof window !== "undefined" ? window.innerWidth - 320 - (isDetailPanelOpen ? 500 : 0) : 800}
          height={typeof window !== "undefined" ? window.innerHeight : 600}
          backgroundColor="#fafafa"
          linkCanvasObjectMode="after"
          linkCanvasObject={(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            link: any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ctx: any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            globalScale: any
          ) => {
            const MAX_FONT_SIZE = 4;
            const LABEL_NODE_MARGIN = 1;

            const start = link.source;
            const end = link.target;

            // Calculate distance and direction
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 0.1) return; // Skip very short links

            // Normalize direction
            const ux = dx / distance;
            const uy = dy / distance;

            // Calculate where arrow should start and end based on node sizes
            const startRadius = start.val || 8;
            const endRadius = end.val || 8;

            const arrowStart = {
              x: start.x + ux * startRadius,
              y: start.y + uy * startRadius,
            };

            const arrowEnd = {
              x: end.x - ux * (endRadius + 2),
              y: end.y - uy * (endRadius + 2),
            };

            // Draw the link line
            ctx.strokeStyle = "#999";
            ctx.lineWidth = 2.5 / globalScale;
            ctx.beginPath();
            ctx.moveTo(arrowStart.x, arrowStart.y);
            ctx.lineTo(arrowEnd.x, arrowEnd.y);
            ctx.stroke();

            // Draw arrowhead
            const arrowLength = 8 / globalScale;
            const arrowAngle = Math.PI / 6; // 30 degrees

            const angle = Math.atan2(dy, dx);

            ctx.fillStyle = "#666";
            ctx.beginPath();
            ctx.moveTo(arrowEnd.x, arrowEnd.y);
            ctx.lineTo(arrowEnd.x - arrowLength * Math.cos(angle - arrowAngle), arrowEnd.y - arrowLength * Math.sin(angle - arrowAngle));
            ctx.lineTo(arrowEnd.x - arrowLength * Math.cos(angle + arrowAngle), arrowEnd.y - arrowLength * Math.sin(angle + arrowAngle));
            ctx.closePath();
            ctx.fill();
          }}
          nodeCanvasObject={(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            node: any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ctx: any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            globalScale: any
          ) => {
            const label = node.title;
            const fontSize = 12 / globalScale;
            const nodeRadius = node.val;

            ctx.font = `${fontSize}px Sans-Serif`;

            // Draw node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color;
            ctx.fill();

            // Add border for expanded nodes
            if (node.expanded) {
              ctx.strokeStyle = "#333";
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }

            // Draw label below the node
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#333";
            ctx.fillText(label, node.x, node.y + nodeRadius + fontSize * 1.2);
          }}
        />
      </div>

      {/* Detail Panel - Now wider and with full article content */}
      {isDetailPanelOpen && selectedNode && (
        <div className="w-[500px] bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Article: {selectedNode.title}</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsDetailPanelOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <a href={selectedNode.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">
                <ExternalLink className="h-3 w-3" />
                View on Wikipedia
              </a>
              {!selectedNode.expanded && selectedNode.outgoingLinks.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => expandNode(selectedNode)} className="flex items-center gap-1 ml-auto">
                  <Expand className="h-3 w-3" />
                  Expand Graph
                </Button>
              )}
            </div>

            {/* Full Article Content */}
            {selectedNode.fullHtml ? (
              <WikipediaArticleViewer htmlContent={selectedNode.fullHtml} title={selectedNode.title} onLinkClick={handleArticleLinkClick} />
            ) : (
              <div className="text-gray-500 italic">Loading full article content...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
