import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/Skeleton";
import { StockAvatar } from "@/components/StockAvatar";
import { useStocks } from "@/hooks/useStock";
import { ALL_INDIAN, GLOBAL_STOCKS } from "@/data/catalog";
import { Plus, X, Search, Scale, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

const ALL = [...ALL_INDIAN, ...GLOBAL_STOCKS];

interface Picked { symbol: string; exchange: string; name: string }

function Picker({ onPick, exclude }: { onPick: (s: Picked) => void; exclude: string[] }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (q.trim().length < 1) return [];
    const lc = q.toLowerCase();
    return ALL.filter((s) => !exclude.includes(s.symbol) && (s.symbol.toLowerCase().includes(lc) || s.name.toLowerCase().includes(lc))).slice(0, 8);
  }, [q, exclude]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a stock to add…"
          className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm"
        />
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 left-0 right-0 mt-2 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          {results.map((s) => (
            <button
              key={s.symbol}
              onClick={() => { onPick({ symbol: s.symbol, exchange: s.exchange, name: s.name }); setQ(""); }}
              className="w-full text-left px-3 py-2.5 hover:bg-accent flex items-center gap-3 transition"
            >
              <StockAvatar symbol={s.symbol} size={32} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{s.symbol}</div>
                <div className="text-xs text-muted-foreground truncate">{s.name}</div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Row {
  label: string;
  values: (string | number)[];
  format?: (v: any) => string;
  bestType?: "high" | "low" | "neutral";
}

export default function Compare() {
  const [picks, setPicks] = useState<Picked[]>([
    { symbol: "TCS", exchange: "NSE", name: "Tata Consultancy Services" },
    { symbol: "INFY", exchange: "NSE", name: "Infosys" },
  ]);

  const { data, isLoading } = useStocks(picks);
  const quotes = data?.quotes || [];

  const fmtINR = (v: number, currency = "INR") => {
    const sym = currency === "USD" ? "$" : "₹";
    return sym + (v?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "—");
  };

  const buildRows = (): Row[] => {
    if (quotes.length === 0) return [];
    return [
      { label: "Price", values: quotes.map((q) => fmtINR(q.price, q.currency)), bestType: "neutral" },
      { label: "Change %", values: quotes.map((q) => q.changePercent), format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`, bestType: "high" },
      { label: "52W High", values: quotes.map((q) => fmtINR(q.week52High, q.currency)), bestType: "neutral" },
      { label: "52W Low", values: quotes.map((q) => fmtINR(q.week52Low, q.currency)), bestType: "neutral" },
      { label: "RSI (14)", values: quotes.map((q) => q.rsi), format: (v) => v.toString(), bestType: "neutral" },
      { label: "50-day MA", values: quotes.map((q) => fmtINR(q.movingAvg50, q.currency)), bestType: "neutral" },
      { label: "200-day MA", values: quotes.map((q) => fmtINR(q.movingAvg200, q.currency)), bestType: "neutral" },
      { label: "MACD", values: quotes.map((q) => q.macd), format: (v) => v.toFixed(2), bestType: "high" },
      { label: "Trend", values: quotes.map((q) => q.trend), bestType: "neutral" },
      { label: "Strength Score", values: quotes.map((q) => q.strengthScore), format: (v) => `${v}/100`, bestType: "high" },
      { label: "Volume", values: quotes.map((q) => q.volume?.toLocaleString("en-IN") || "—"), bestType: "neutral" },
    ];
  };

  const rows = buildRows();

  const winner = useMemo(() => {
    if (quotes.length < 2) return null;
    return [...quotes].sort((a, b) => b.strengthScore - a.strengthScore)[0];
  }, [quotes]);

  const bestIndexFor = (row: Row) => {
    if (row.bestType !== "high" || row.values.some((v) => typeof v !== "number")) return -1;
    let best = 0;
    for (let i = 1; i < row.values.length; i++) {
      if ((row.values[i] as number) > (row.values[best] as number)) best = i;
    }
    return best;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="gradient-hero">
        <div className="mx-auto max-w-6xl px-4 lg:px-6 pt-14 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium backdrop-blur">
            <Scale className="h-3.5 w-3.5 text-primary" /> Side-by-Side Analysis
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Compare Up To <span className="gradient-text">3 Stocks</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Stack technical indicators, trends, and momentum scores side by side to pick the strongest setup.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 lg:px-6 py-10 space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => {
            const p = picks[i];
            if (!p) {
              if (picks.length >= 3) return <div key={i} className="rounded-2xl border-2 border-dashed border-border h-24 hidden sm:block" />;
              return (
                <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <Picker onPick={(s) => setPicks([...picks, s])} exclude={picks.map((p) => p.symbol)} />
                </div>
              );
            }
            return (
              <div key={p.symbol} className="rounded-2xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
                <StockAvatar symbol={p.symbol} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{p.symbol}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.name}</div>
                </div>
                <button onClick={() => setPicks(picks.filter((x) => x.symbol !== p.symbol))} className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-danger transition" aria-label="Remove">
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {picks.length < 2 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
            <Plus className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Add at least 2 stocks to start comparing.</p>
          </div>
        )}

        {picks.length >= 2 && isLoading && (
          <Skeleton height={420} />
        )}

        {picks.length >= 2 && !isLoading && quotes.length >= 2 && (
          <>
            <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="border-b border-border bg-background/40">
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Metric</th>
                      {quotes.map((q) => (
                        <th key={q.symbol} className="text-left px-5 py-3">
                          <Link to={`/stock/${q.symbol}`} className="flex items-center gap-2 hover:text-primary transition">
                            <StockAvatar symbol={q.symbol} size={28} />
                            <div>
                              <div className="font-bold">{q.symbol}</div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{q.exchange}</div>
                            </div>
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const best = bestIndexFor(row);
                      return (
                        <tr key={row.label} className="border-b border-border last:border-0 hover:bg-background/40">
                          <td className="px-5 py-3 text-muted-foreground font-medium">{row.label}</td>
                          {row.values.map((v, i) => {
                            const display = row.format ? row.format(v) : String(v);
                            const isBest = i === best;
                            const isChange = row.label === "Change %";
                            const num = typeof v === "number" ? v : null;
                            const colorClass = isChange && num !== null ? (num >= 0 ? "text-success" : "text-danger") : "";
                            return (
                              <td key={i} className={`px-5 py-3 tabular-nums font-semibold ${colorClass} ${isBest ? "text-success" : ""}`}>
                                {display}{isBest && <span className="ml-1.5 text-[10px] uppercase tracking-wider rounded-full bg-success/15 text-success px-1.5 py-0.5 font-bold">Best</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {winner && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 flex items-center gap-4">
                <div className="gradient-primary h-12 w-12 rounded-xl flex items-center justify-center shrink-0">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-primary">Strongest setup right now</div>
                  <div className="mt-1 font-bold text-lg">{winner.symbol} — {winner.name}</div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Highest strength score ({winner.strengthScore}/100) with a {winner.trend.toLowerCase()} trend. This is educational analysis only — always do your own research.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}
