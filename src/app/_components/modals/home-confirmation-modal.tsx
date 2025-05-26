import { AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";

interface HomeConfirmationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export function HomeConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
}: HomeConfirmationModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
				<div className="mb-4 flex items-center gap-3">
					<AlertTriangle className="h-6 w-6 text-destructive" />
					<h2 className="font-semibold text-foreground text-lg">
						Leave Rabbit Hole?
					</h2>
				</div>
				<p className="mb-6 text-muted-foreground text-sm">
					Your current rabbit hole won't be saved. You'll lose all your
					exploration progress unless you share it first.
				</p>
				<div className="flex justify-end gap-3">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onConfirm}>
						Leave Anyway
					</Button>
				</div>
			</div>
		</div>
	);
}
