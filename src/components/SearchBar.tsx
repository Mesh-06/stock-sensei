import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { stocksApi, type SearchResult } from "@/services/stocks";

interface Props {
  placeholder?: string;
  size?: "compact" | "large";
  onSelect?: (result: SearchResult) => void;
  autoFocus?: boolean;
}

export function SearchBar({ placeholder = "Search stocks (e.g. RELIANCE, AAPL, INFY)…", size = "large", onSelect, autoFocus }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!q || q.length < 1) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { results } = await stocksApi.search(q);
        setResults(results);
      } catch (_) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (r: SearchResult) => {
    setOpen(false);
    setQ("");
    setResults([]);
    if (onSelect) onSelect(r);
    else navigate(`/stock/${r.symbol}?ex=${r.exchange}`);
  };

  const inputClass =
    size === "large"
      ? "w-full rounded-2xl border border-border bg-card pl-12 pr-4 py-4 text-base shadow-card focus:ring-2 focus:ring-primary/30 outline-none transition"
      : "w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 outline-none";

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground ${size === "large" ? "left-4 h-5 w-5" : "left-3 h-4 w-4"}`} />
      <input
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(results.length - 1, i + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
          else if (e.key === "Enter" && results[activeIdx]) { e.preventDefault(); handleSelect(results[activeIdx]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className={inputClass}
      />
      {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      {open && (q.length > 0) && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-elegant">
          {results.length === 0 && !loading && (
            <div className="p-4 text-sm text-muted-foreground">No matches. Try a ticker like RELIANCE or AAPL.</div>
          )}
          {results.map((r, i) => (
            <button
              key={r.ticker}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => handleSelect(r)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${i === activeIdx ? "bg-accent" : "hover:bg-accent"}`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{r.symbol}</div>
                <div className="text-xs text-muted-foreground truncate">{r.name}</div>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
