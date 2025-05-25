import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";

interface ZoomControlsProps {
	onZoomIn: () => void;
	onZoomOut: () => void;
	onZoomReset: () => void;
	disabled?: boolean;
}

export function ZoomControls({
	onZoomIn,
	onZoomOut,
	onZoomReset,
	disabled = false,
}: ZoomControlsProps) {
	return (
		<div className="absolute right-4 bottom-4 z-10 flex flex-col gap-2 rounded-lg border border-border bg-card p-2 shadow-lg">
			<Button
				variant="outline"
				size="sm"
				onClick={onZoomIn}
				disabled={disabled}
				className="flex h-8 w-8 items-center justify-center p-0"
				title="Zoom In"
			>
				<Plus className="h-4 w-4" />
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={onZoomOut}
				disabled={disabled}
				className="flex h-8 w-8 items-center justify-center p-0"
				title="Zoom Out"
			>
				<Minus className="h-4 w-4" />
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={onZoomReset}
				disabled={disabled}
				className="flex h-8 w-8 items-center justify-center p-0"
				title="Reset Zoom"
			>
				<RotateCcw className="h-4 w-4" />
			</Button>
		</div>
	);
}
