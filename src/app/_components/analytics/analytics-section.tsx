interface AnalyticsSectionProps {
	title: string;
	subtitle: string;
	isLoading: boolean;
	children: React.ReactNode;
	className?: string;
}

export function AnalyticsSection({
	title,
	subtitle,
	isLoading,
	children,
	className = "",
}: AnalyticsSectionProps) {
	return (
		<div
			className={`rounded-lg border border-border bg-card p-6 shadow-sm ${className}`}
		>
			<div className="mb-4">
				<h2 className="font-semibold text-foreground text-lg">{title}</h2>
				<p className="text-muted-foreground text-sm">{subtitle}</p>
			</div>
			{isLoading ? (
				<div className="flex items-center justify-center py-8">
					<div className="h-6 w-6 animate-spin rounded-full border-primary border-b-2" />
				</div>
			) : (
				<div className="space-y-3">{children}</div>
			)}
		</div>
	);
}
