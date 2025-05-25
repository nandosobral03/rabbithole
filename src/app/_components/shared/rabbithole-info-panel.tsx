import { Calendar, Eye, User } from "lucide-react";

interface RabbitholeInfoPanelProps {
	title: string;
	creatorName?: string;
	description?: string;
	viewCount: number;
	createdAt: Date;
	expiresAt: Date;
	isEdited?: boolean;
}

export function RabbitholeInfoPanel({
	title,
	creatorName,
	description,
	viewCount,
	createdAt,
	expiresAt,
	isEdited = false,
}: RabbitholeInfoPanelProps) {
	return (
		<div className="absolute top-4 right-4 z-10 w-80 rounded-lg border border-border bg-card p-4 shadow-lg">
			<div className="space-y-3">
				{/* Title */}
				<div>
					<h1 className="font-semibold text-card-foreground text-lg leading-tight">
						{title}
						{isEdited && (
							<span className="ml-2 font-normal text-muted-foreground text-sm">
								(edited)
							</span>
						)}
					</h1>
				</div>

				{/* Creator */}
				{creatorName && (
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<User className="h-4 w-4" />
						<span>by {creatorName}</span>
					</div>
				)}

				{/* Description */}
				{description && (
					<p className="text-muted-foreground text-sm leading-relaxed">
						{description}
					</p>
				)}

				{/* Stats */}
				<div className="flex flex-wrap items-center gap-4 border-border border-t pt-3 text-muted-foreground text-xs">
					<div className="flex items-center gap-1">
						<Eye className="h-3 w-3" />
						<span>{viewCount} views</span>
					</div>
					<div className="flex items-center gap-1">
						<Calendar className="h-3 w-3" />
						<span>Created {createdAt.toLocaleDateString()}</span>
					</div>
					<div className="flex items-center gap-1">
						<Calendar className="h-3 w-3" />
						<span>Expires {expiresAt.toLocaleDateString()}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
