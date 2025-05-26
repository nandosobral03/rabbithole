import { Home, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { HomeConfirmationModal } from "../modals/home-confirmation-modal";
import { ThemeToggle } from "./theme-toggle";

interface GraphControlsProps {
  nodeCount: number;
  linkCount: number;
  isLoading?: boolean;
  isSharing: boolean;
  onShare: () => void;
  onRestart: () => void;
  shouldGlowHome?: boolean;
}

export function GraphControls({ nodeCount, linkCount, isLoading = false, isSharing, onShare, onRestart, shouldGlowHome = false }: GraphControlsProps) {
  const [showHomeConfirmation, setShowHomeConfirmation] = useState(false);

  if (nodeCount === 0) return null;

  const handleHomeClick = () => {
    setShowHomeConfirmation(true);
  };

  const handleConfirmHome = () => {
    setShowHomeConfirmation(false);
    onRestart();
  };

  const handleCancelHome = () => {
    setShowHomeConfirmation(false);
  };

  return (
    <>
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-2 sm:top-4 sm:left-4 sm:flex-row sm:items-center sm:gap-3 sm:rounded-lg sm:border sm:border-border sm:bg-card sm:px-3 sm:py-2 sm:shadow-lg">
        {/* Stats - Hidden on very small screens, shown as separate card on mobile */}
        <div className="rounded-lg border border-border bg-card px-2 py-1 font-medium text-muted-foreground text-xs shadow-lg sm:border-none sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
          {nodeCount} nodes • {linkCount} links
          {isLoading && <span className="ml-1 text-primary sm:ml-2">• Loading...</span>}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 sm:gap-3">
          <div className="rounded-lg border border-border bg-card p-1 shadow-lg sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none">
            <ThemeToggle className="h-5 sm:h-6" />
          </div>

          <Button variant="outline" size="sm" onClick={onShare} disabled={isSharing || isLoading} className="flex h-7 w-7 items-center justify-center px-0 text-xs shadow-lg sm:h-6 sm:w-auto sm:gap-1 sm:px-2 sm:shadow-none">
            <Share2 className="h-3 w-3" />
            <span className="hidden sm:inline">{isSharing ? "Sharing..." : "Share"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleHomeClick}
            disabled={isLoading}
            className={`flex h-7 w-7 items-center justify-center px-0 text-xs shadow-lg transition-all sm:h-6 sm:w-auto sm:gap-1 sm:px-2 sm:shadow-none ${
              shouldGlowHome ? "animate-pulse border-primary bg-primary/10 text-primary shadow-lg shadow-primary/25" : ""
            }`}
          >
            <Home className="h-3 w-3" />
            <span className="hidden sm:inline">Home</span>
          </Button>
        </div>
      </div>

      <HomeConfirmationModal isOpen={showHomeConfirmation} onClose={handleCancelHome} onConfirm={handleConfirmHome} />
    </>
  );
}
