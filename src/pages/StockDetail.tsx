import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, ExternalLink, ArrowLeft } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/Skeleton";
import { StockAvatar } from "@/components/StockAvatar";
import { WatchlistButton } from "@/components/WatchlistButton";
import { PriceAlertButton } from "@/components/PriceAlertButton";
import { GlossaryTooltip } from "@/components/GlossaryTooltip";
import { useStock, useStockHistory, useStockNews } from "@/hooks/useStock";
import { formatCurrency, formatLargeNumber, formatVolume } from "@/services/stocks";
import { useState } from "react";

const PERIODS = [
  { key: "5d", label: "1W" },
  { key: "1mo", label: "1M" },
  { key: "3mo", label: "3M" },
  { key: "6mo", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "5y", label: "5Y" },
];

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [params] = useSearchParams();
  const exchange = params.get("ex") || "NSE";
  const [period, setPeriod] = useState("1y");

  const { data: q, isLoading: qLoading, error } = useStock(symbol, exchange);
  const { data: hist } = useStockHistory(symbol, exchange, period);
  const { data: news } = useStockNews(symbol, exchange);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Couldn't load {symbol}</h1>
          <p className="mt-2 text-muted-foreground">The data source might be temporarily unavailable.</p>
          <Link to="/" className="mt-6 inline-block text-primary hover:underline">← Back to home</Link>
        </div>
      </div>
    );
  }

  const positive = (q?.changePercent ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={14} /> Back
        </Link>

        {qLoading || !q ? (
          <Skeleton height={120} />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <StockAvatar symbol={q.symbol} size={64} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-extrabold tracking-tight">{q.symbol}</h1>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{q.exchange}</span>
                  {q.stale && <span className="rounded-full bg-yellow-500/15 text-yellow-500 px-2.5 py-0.5 text-xs">cached</span>}
                </div>
                <p className="text-sm text-muted-foreground truncate">{q.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <WatchlistButton symbol={q.symbol} exchange={q.exchange} />
                <PriceAlertButton symbol={q.symbol} exchange={q.exchange} currentPrice={q.price} currency={q.currency} />
              </div>
            </div>
            <div className="mt-5 flex items-baseline gap-3 flex-wrap">
              <span className="text-4xl font-extrabold tabular-nums">{formatCurrency(q.price, q.currency)}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${positive ? "bg-success-muted" : "bg-danger-muted"}`}>
                {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {positive ? "+" : ""}{q.change.toFixed(2)} ({positive ? "+" : ""}{q.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-bold">Price chart</h2>
            <div className="inline-flex rounded-xl border border-border bg-background p-1">
              {PERIODS.map((p) => (
                <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-3 py-1 text-xs font-medium rounded-lg transition ${period === p.key ? "gradient-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72">
            {!hist ? <Skeleton className="h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hist.points}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={positive ? "hsl(var(--success))" : "hsl(var(--danger))"} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={positive ? "hsl(var(--success))" : "hsl(var(--danger))"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="close" stroke={positive ? "hsl(var(--success))" : "hsl(var(--danger))"} strokeWidth={2} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Metrics */}
        {q && (
          <>
            <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
              {[
                ["Open", formatCurrency(q.open, q.currency)],
                ["Day High", formatCurrency(q.high, q.currency)],
                ["Day Low", formatCurrency(q.low, q.currency)],
                ["Volume", formatVolume(q.volume)],
              ].map(([label, val]) => (
                <div key={label} className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 font-semibold tabular-nums">{val}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-4">
              {[
                ["Market Cap", formatLargeNumber(q.marketCap, q.currency)],
                [<GlossaryTooltip term="P/E Ratio" key="pe" />, q.pe ? q.pe.toFixed(2) : "—"],
                [<GlossaryTooltip term="EPS" key="eps" />, q.eps ? q.eps.toFixed(2) : "—"],
                ["Dividend Yield", q.dividendYield ? `${q.dividendYield.toFixed(2)}%` : "—"],
              ].map(([label, val], i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 font-semibold tabular-nums">{val}</div>
                </div>
              ))}
            </div>

            {/* 52-week range bar */}
            <div className="mt-3 rounded-2xl border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-2">52-week range</div>
              <div className="relative h-2 rounded-full bg-muted">
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full gradient-primary"
                  style={{ left: `${Math.max(0, Math.min(100, ((q.price - q.week52Low) / (q.week52High - q.week52Low)) * 100))}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs tabular-nums">
                <span>{formatCurrency(q.week52Low, q.currency)}</span>
                <span>{formatCurrency(q.week52High, q.currency)}</span>
              </div>
            </div>

            {/* Technical indicators */}
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <GlossaryTooltip term="RSI" /> (14)
                  <span className={`font-bold ${q.rsi >= 70 ? "text-danger" : q.rsi <= 30 ? "text-success" : "text-foreground"}`}>{q.rsi}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${q.rsi >= 70 ? "bg-danger" : q.rsi <= 30 ? "bg-success" : "gradient-primary"}`} style={{ width: `${q.rsi}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{q.rsi >= 70 ? "Overbought" : q.rsi <= 30 ? "Oversold" : "Neutral zone"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">50-day MA</div>
                <div className="mt-1 font-bold tabular-nums">{formatCurrency(q.movingAvg50, q.currency)}</div>
                <p className={`mt-2 text-xs ${q.price > q.movingAvg50 ? "text-success" : "text-danger"}`}>
                  Price {q.price > q.movingAvg50 ? "above" : "below"} 50-MA
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground"><GlossaryTooltip term="MACD" /></div>
                <div className="mt-1 font-bold tabular-nums">{q.macd.toFixed(2)}</div>
                <p className={`mt-2 text-xs ${q.macd > q.macdSignal ? "text-success" : "text-danger"}`}>
                  Signal: {q.macd > q.macdSignal ? "Bullish" : "Bearish"} ({q.macdSignal.toFixed(2)})
                </p>
              </div>
            </div>

            {/* AI analysis */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-bold">Should I learn about this stock?</h2>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${q.trend === "Bullish" ? "bg-success-muted" : q.trend === "Bearish" ? "bg-danger-muted" : "bg-muted text-muted-foreground"}`}>
                  {q.trend === "Bullish" ? "📈" : q.trend === "Bearish" ? "📉" : "⚖️"} {q.trend}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Strength score</span>
                  <span className="font-semibold">{q.strengthScore}/100</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full gradient-primary" style={{ width: `${q.strengthScore}%` }} />
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed">{q.aiExplanation}</p>
              <div className="mt-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs">
                ⚠️ This analysis is for educational purposes only. Past performance does not guarantee future results. Please consult a SEBI-registered financial advisor before investing.
              </div>
            </div>

            {/* News */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-lg font-bold mb-4">Latest news</h2>
              {!news ? <Skeleton height={200} /> : news.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent news available.</p>
              ) : (
                <ul className="space-y-3">
                  {news.items.map((n, i) => (
                    <li key={i}>
                      <a href={n.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-border p-3 hover:bg-accent transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{n.source} · {n.time}</p>
                          </div>
                          <ExternalLink size={14} className="text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
