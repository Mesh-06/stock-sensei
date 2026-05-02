import { Heart } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props { symbol: string; exchange?: string; size?: number; className?: string }

export function WatchlistButton({ symbol, exchange = "NSE", size = 18, className = "" }: Props) {
  const { user } = useAuth();
  const { isInWatchlist, toggle } = useWatchlist();
  const active = user ? isInWatchlist(symbol) : false;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!user) { toast.info("Sign in to save your watchlist"); return; }
        toggle(symbol, exchange);
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-accent ${className}`}
      aria-label={active ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Heart size={size} className={active ? "fill-danger text-danger" : "text-muted-foreground"} />
    </button>
  );
}
