"use client";

import dynamic from "next/dynamic";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { GraphData, GraphNode } from "../types/graph";

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface WikipediaGraphCanvasProps {
  graphData: GraphData;
  onNodeClick: (node: GraphNode) => void;
  onBackgroundClick: () => void;
  onNodeRightClick?: (node: GraphNode) => void;
}

export interface GraphCanvasRef {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
}

export const WikipediaGraphCanvas = forwardRef<GraphCanvasRef, WikipediaGraphCanvasProps>(({ graphData, onNodeClick, onBackgroundClick, onNodeRightClick }, ref) => {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const graphRef = useRef<any>(null);

  // Expose zoom methods to parent component
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (graphRef.current) {
        const currentZoom = graphRef.current.zoom();
        graphRef.current.zoom(currentZoom * 1.5, 400); // 400ms transition
      }
    },
    zoomOut: () => {
      if (graphRef.current) {
        const currentZoom = graphRef.current.zoom();
        graphRef.current.zoom(currentZoom / 1.5, 400); // 400ms transition
      }
    },
    zoomReset: () => {
      if (graphRef.current) {
        graphRef.current.zoomToFit(400, 50); // 400ms transition, 50px padding
      }
    },
  }));

  // Wrapper for right-click handler to match ForceGraph2D's expected signature
  const handleNodeRightClick = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    (node: any, event: MouseEvent) => {
      if (onNodeRightClick) {
        event.preventDefault(); // Prevent context menu
        onNodeRightClick(node as GraphNode);
      }
    },
    [onNodeRightClick]
  );

  // Configure d3 forces for better node separation
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      // Configure the charge (repulsion) force for node separation
      graphRef.current.d3Force("charge").strength(-2000).distanceMax(500);

      // Configure the link force for connection distance - make it more flexible
      graphRef.current.d3Force("link").distance(200).strength(0.1);

      // Configure center force to keep nodes from drifting too far
      graphRef.current.d3Force("center").strength(0.02);

      // Add collision detection for better node spacing
      const d3 = graphRef.current.d3;
      if (d3?.forceCollide) {
        graphRef.current.d3Force("collision", d3.forceCollide().radius(50));
      }

      // Always restart with high energy for better spreading
      const simulation = graphRef.current.d3;
      if (simulation) {
        simulation.alpha(1).restart();
      }
    }
  }, [graphData.nodes.length]);

  return (
    <div
      className="relative flex-1 overflow-hidden"
      style={{
        backgroundImage: `
					linear-gradient(hsl(var(--border)) 1px, transparent 1px),
					linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
				`,
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 0 0",
      }}
    >
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeId="id"
        nodeLabel="title"
        nodeVal="val"
        nodeColor="color"
        nodeRelSize={8}
        d3AlphaDecay={0.005}
        d3VelocityDecay={0.3}
        warmupTicks={100}
        cooldownTicks={200}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.05}
        linkDirectionalParticles={0}
        linkDirectionalParticleSpeed={0.006}
        // @ts-expect-error - Works still I swear
        onNodeClick={onNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onBackgroundClick={onBackgroundClick}
        width={typeof window !== "undefined" ? window.innerWidth : 800}
        height={typeof window !== "undefined" ? window.innerHeight : 600}
        backgroundColor="transparent"
        linkCanvasObjectMode="after"
        nodeAutoColorBy="color"
        linkCanvasObject={(
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          link: any,
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          ctx: any,
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          globalScale: any
        ) => {
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
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          node: any,
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          ctx: any,
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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

          // Draw label below the node - use white text in dark mode
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const isDarkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
          ctx.fillStyle = isDarkMode ? "#fff" : "#333";
          ctx.fillText(label, node.x, node.y + nodeRadius + fontSize * 1.2);
        }}
      />
    </div>
  );
});
