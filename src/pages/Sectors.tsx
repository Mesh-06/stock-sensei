import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StockCard } from "@/components/StockCard";
import { Skeleton } from "@/components/Skeleton";
import { useStocks } from "@/hooks/useStock";
import { SECTORS, ALL_INDIAN } from "@/data/catalog";
import { Layers, TrendingUp, TrendingDown } from "lucide-react";

function SectorStocks({ symbols }: { symbols: string[] }) {
  const items = symbols
    .map((s) => ALL_INDIAN.find((x) => x.symbol === s))
    .filter(Boolean)
    .map((m) => ({ symbol: m!.symbol, exchange: m!.exchange }));
  const { data, isLoading } = useStocks(items);
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => <Skeleton key={s.symbol} height={140} />)}
      </div>
    );
  }
  const quotes = data?.quotes || [];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {quotes.map((q) => <StockCard key={q.symbol} quote={q} />)}
    </div>
  );
}

export default function Sectors() {
  const [activeId, setActiveId] = useState(SECTORS[0].id);
  const active = SECTORS.find((s) => s.id === activeId)!;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="gradient-hero">
        <div className="mx-auto max-w-6xl px-4 lg:px-6 pt-14 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium backdrop-blur">
            <Layers className="h-3.5 w-3.5 text-primary" /> Sector Explorer
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Explore <span className="gradient-text">Indian Sectors</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Understand what drives each sector and discover the top stocks within it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 lg:px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-20 self-start">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
              <div className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Sectors</div>
              <div className="mt-1 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                {SECTORS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className={`shrink-0 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-left whitespace-nowrap transition ${activeId === s.id ? "gradient-primary text-white shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                  >
                    <span className="text-lg">{s.icon}</span> {s.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{active.icon}</span>
                    <h2 className="text-2xl font-extrabold tracking-tight">{active.name}</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Benchmark Index: <span className="text-foreground font-semibold">{active.indexName}</span></p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">{active.description}</p>

              <div className="mt-5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Key Drivers to Watch</div>
                <div className="flex flex-wrap gap-2">
                  {active.drivers.map((d) => (
                    <span key={d} className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">{d}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-end justify-between mb-4">
                <h3 className="text-xl font-extrabold tracking-tight">Top stocks in {active.name}</h3>
                <span className="text-xs text-muted-foreground">{active.stocks.length} stocks</span>
              </div>
              <SectorStocks symbols={active.stocks} />
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center gap-2 text-success">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Bull case</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">When the macro drivers above turn positive, this sector typically leads the market.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center gap-2 text-danger">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Bear case</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Watch for negative signals in the drivers above — they precede sector-wide weakness.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
