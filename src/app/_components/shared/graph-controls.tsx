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
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
        <div className="font-medium text-muted-foreground text-xs">
          {nodeCount} nodes • {linkCount} links
          {isLoading && <span className="ml-2 text-primary">• Loading...</span>}
        </div>
        <ThemeToggle className="h-6" />
        <Button variant="outline" size="sm" onClick={onShare} disabled={isSharing || isLoading} className="flex h-6 items-center gap-1 px-2 text-xs">
          <Share2 className="h-3 w-3" />
          {isSharing ? "Sharing..." : "Share"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleHomeClick}
          disabled={isLoading}
          className={`flex h-6 items-center gap-1 px-2 text-xs transition-all ${shouldGlowHome ? "animate-pulse border-primary bg-primary/10 text-primary shadow-lg shadow-primary/25" : ""}`}
        >
          <Home className="h-3 w-3" />
          Home
        </Button>
      </div>

      <HomeConfirmationModal isOpen={showHomeConfirmation} onClose={handleCancelHome} onConfirm={handleConfirmHome} />
    </>
  );
}
