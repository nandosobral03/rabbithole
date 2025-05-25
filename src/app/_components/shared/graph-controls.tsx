import { RotateCcw, Share2 } from "lucide-react";
import { Button } from "~/components/ui/button";

interface GraphControlsProps {
	nodeCount: number;
	linkCount: number;
	isLoading?: boolean;
	isSharing: boolean;
	onShare: () => void;
	onRestart: () => void;
}

export function GraphControls({
	nodeCount,
	linkCount,
	isLoading = false,
	isSharing,
	onShare,
	onRestart,
}: GraphControlsProps) {
	if (nodeCount === 0) return null;

	return (
		<div className="absolute top-4 left-4 z-10 flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
			<div className="font-medium text-muted-foreground text-xs">
				{nodeCount} nodes • {linkCount} links
				{isLoading && <span className="ml-2 text-primary">• Loading...</span>}
			</div>
			<Button
				variant="outline"
				size="sm"
				onClick={onShare}
				disabled={isSharing || isLoading}
				className="flex h-6 items-center gap-1 px-2 text-xs"
			>
				<Share2 className="h-3 w-3" />
				{isSharing ? "Sharing..." : "Share"}
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={onRestart}
				disabled={isLoading}
				className="flex h-6 items-center gap-1 px-2 text-xs"
			>
				<RotateCcw className="h-3 w-3" />
				Restart
			</Button>
		</div>
	);
}
