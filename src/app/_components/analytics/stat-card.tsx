interface StatCardProps {
	icon: React.ReactNode;
	title: string;
	value: number;
	subtitle: string;
	color: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";
}

export function StatCard({
	icon,
	title,
	value,
	subtitle,
	color,
}: StatCardProps) {
	return (
		<div className="rounded-lg border border-border bg-card p-6 shadow-sm">
			<div className="flex items-center justify-between">
				<div className={`text-${color}`}>{icon}</div>
			</div>
			<div className="mt-4">
				<h3 className="font-semibold text-foreground text-sm">{title}</h3>
				<div className="mt-2 flex items-baseline gap-2">
					<span className="font-bold text-2xl text-foreground">
						{value.toLocaleString()}
					</span>
				</div>
				<p className="mt-1 text-muted-foreground text-xs">{subtitle}</p>
			</div>
		</div>
	);
}
