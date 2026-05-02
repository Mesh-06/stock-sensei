import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { StockAvatar } from "./StockAvatar";
import { WatchlistButton } from "./WatchlistButton";
import { formatCurrency } from "@/services/stocks";
import type { StockQuote } from "@/services/stocks";

interface Props { quote: StockQuote; sparkline?: number[]; compact?: boolean }

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const color = positive ? "hsl(var(--success))" : "hsl(var(--danger))";
  return (
    <svg width={w} height={h} className="opacity-80">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function StockCard({ quote, sparkline, compact }: Props) {
  const positive = quote.changePercent >= 0;
  return (
    <Link
      to={`/stock/${quote.symbol}?ex=${quote.exchange}`}
      className="group relative block rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-elegant"
    >
      <div className="absolute right-3 top-3">
        <WatchlistButton symbol={quote.symbol} exchange={quote.exchange} size={14} className="h-7 w-7" />
      </div>
      <div className="flex items-center gap-3">
        <StockAvatar symbol={quote.symbol} size={compact ? 36 : 44} />
        <div className="min-w-0 flex-1 pr-8">
          <div className="font-semibold truncate">{quote.symbol}</div>
          <div className="text-xs text-muted-foreground truncate">{quote.name}</div>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <div className="text-lg font-bold tabular-nums">{formatCurrency(quote.price, quote.currency)}</div>
          <div className={`mt-0.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${positive ? "bg-success-muted" : "bg-danger-muted"}`}>
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {positive ? "+" : ""}{quote.changePercent.toFixed(2)}%
          </div>
        </div>
        {sparkline && <MiniSparkline data={sparkline} positive={positive} />}
      </div>
    </Link>
  );
}
