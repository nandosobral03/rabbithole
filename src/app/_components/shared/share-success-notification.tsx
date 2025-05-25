interface ShareSuccessNotificationProps {
	isVisible: boolean;
}

export function ShareSuccessNotification({
	isVisible,
}: ShareSuccessNotificationProps) {
	if (!isVisible) return null;

	return (
		<div className="absolute top-16 left-4 z-20 rounded-lg border border-accent bg-accent px-3 py-2 shadow-lg">
			<div className="font-medium text-accent-foreground text-xs">
				✅ Rabbit hole shared! Link copied to clipboard
			</div>
		</div>
	);
}
