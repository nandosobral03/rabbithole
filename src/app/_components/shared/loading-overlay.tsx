interface LoadingOverlayProps {
	isVisible: boolean;
	title: string;
	subtitle?: string;
	nodeCount?: number;
}

export function LoadingOverlay({
	isVisible,
	title,
	subtitle,
	nodeCount,
}: LoadingOverlayProps) {
	if (!isVisible) return null;

	return (
		<div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
			<div className="text-center">
				<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
				<p className="text-muted-foreground">{title}</p>
				{subtitle && (
					<p className="text-muted-foreground text-sm">{subtitle}</p>
				)}
				{nodeCount !== undefined && (
					<p className="text-muted-foreground text-sm">
						{nodeCount} nodes loaded
					</p>
				)}
			</div>
		</div>
	);
}
