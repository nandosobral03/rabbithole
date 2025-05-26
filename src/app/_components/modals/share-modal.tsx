import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareTitle: string;
  setShareTitle: (title: string) => void;
  shareAuthor: string;
  setShareAuthor: (author: string) => void;
  onSubmit: () => void;
  isSharing: boolean;
}

export function ShareModal({ isOpen, onClose, shareTitle, setShareTitle, shareAuthor, setShareAuthor, onSubmit, isSharing }: ShareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4">
          <h2 className="font-semibold text-card-foreground text-lg">Save Rabbit Hole</h2>
          <p className="text-muted-foreground text-sm">Create a shareable link for your Wikipedia exploration</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="share-title" className="mb-2 block font-medium text-card-foreground text-sm">
              Rabbit Hole Name *
            </label>
            <Input id="share-title" value={shareTitle} onChange={(e) => setShareTitle(e.target.value)} placeholder="Enter a name for your rabbit hole" className="w-full" />
          </div>

          <div>
            <label htmlFor="share-author" className="mb-2 block font-medium text-card-foreground text-sm">
              Your Name (optional)
            </label>
            <Input id="share-author" value={shareAuthor} onChange={(e) => setShareAuthor(e.target.value)} placeholder="Enter your name" className="w-full" />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-amber-800 text-sm dark:text-amber-200">⚠️ Rabbit holes are automatically deleted after 14 days of no new visitors to keep the service running smoothly.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSharing}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSharing || !shareTitle.trim()}>
            {isSharing ? "Saving..." : "Save Rabbit Hole"}
          </Button>
        </div>
      </div>
    </div>
  );
}
