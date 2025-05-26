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
		<div className="absolute bottom-2 left-2 z-10 flex flex-col gap-2 p-2 sm:bottom-4 sm:left-4">
			<Button
				variant="outline"
				size="sm"
				onClick={onZoomIn}
				disabled={disabled}
				className="flex h-8 w-8 items-center justify-center p-0 shadow-lg sm:shadow-none"
				title="Zoom In"
			>
				<Plus className="h-4 w-4" />
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={onZoomOut}
				disabled={disabled}
				className="flex h-8 w-8 items-center justify-center p-0 shadow-lg sm:shadow-none"
				title="Zoom Out"
			>
				<Minus className="h-4 w-4" />
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={onZoomReset}
				disabled={disabled}
				className="flex h-8 w-8 items-center justify-center p-0 shadow-lg sm:shadow-none"
				title="Reset Zoom"
			>
				<RotateCcw className="h-4 w-4" />
			</Button>
		</div>
	);
}
