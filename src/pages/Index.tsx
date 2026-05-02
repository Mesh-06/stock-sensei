import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, BookOpen, Bot, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
import { StockCard } from "@/components/StockCard";
import { Skeleton } from "@/components/Skeleton";
import { useStocks } from "@/hooks/useStock";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/contexts/AuthContext";
import { POPULAR_INDIAN, GLOBAL_STOCKS, TICKER_ITEMS } from "@/data/catalog";

function MarketTicker() {
  const { data } = useStocks(TICKER_ITEMS.map((t) => ({ symbol: t.symbol, exchange: "NSE" })));
  const items = data?.quotes || [];
  if (items.length === 0) {
    return <div className="h-12 border-y border-border bg-card/50"><Skeleton className="h-full" /></div>;
  }
  const doubled = [...items, ...items];
  return (
    <div className="border-y border-border bg-card/50 py-3 marquee">
      <div className="marquee-track">
        {doubled.map((q, i) => {
          const positive = q.changePercent >= 0;
          const meta = TICKER_ITEMS.find((t) => t.symbol === q.ticker || t.symbol === q.symbol);
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{meta?.display || q.symbol}</span>
              <span className="tabular-nums">{q.price.toFixed(2)}</span>
              <span className={`tabular-nums text-xs font-medium ${positive ? "text-success" : "text-danger"}`}>
                {positive ? "+" : ""}{q.changePercent.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StockGrid({ symbols, exchange = "NSE" }: { symbols: { symbol: string; exchange?: string }[]; exchange?: string }) {
  const { data, isLoading } = useStocks(symbols.map((s) => ({ symbol: s.symbol, exchange: s.exchange || exchange })));
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {symbols.map((s) => <Skeleton key={s.symbol} height={140} />)}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(data?.quotes || []).map((q) => <StockCard key={q.symbol} quote={q} />)}
    </div>
  );
}

function WatchlistSection() {
  const { user } = useAuth();
  const { items } = useWatchlist();
  if (!user || items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 lg:px-6 mt-16">
      <h2 className="text-2xl font-extrabold tracking-tight mb-5">Your Watchlist</h2>
      <StockGrid symbols={items.map((i: any) => ({ symbol: i.symbol, exchange: i.exchange }))} />
    </section>
  );
}

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden gradient-hero">
        <div className="mx-auto max-w-5xl px-4 lg:px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium backdrop-blur animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-Powered Stock Analysis · Real-time Data
          </div>
          <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight animate-slide-up">
            Understand Stocks. <br className="hidden sm:block" />
            <span className="gradient-text">Learn Smart Investing.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground animate-slide-up">
            Get AI-powered insights, real-time data from NSE/BSE, and beginner-friendly explanations — all in one place.
          </p>
          <div className="mx-auto mt-8 max-w-2xl animate-slide-up">
            <SearchBar />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/chatbot" className="gradient-primary text-white rounded-xl px-5 py-2.5 font-medium shadow-md hover:opacity-90 transition inline-flex items-center gap-2">
              <Bot size={16} /> Ask AI Assistant
            </Link>
            <Link to="/learn" className="border border-border bg-card text-foreground rounded-xl px-5 py-2.5 font-medium hover:bg-accent transition inline-flex items-center gap-2">
              <BookOpen size={16} /> Start Learning
            </Link>
          </div>
        </div>
      </section>

      <MarketTicker />

      <WatchlistSection />

      <section className="mx-auto max-w-7xl px-4 lg:px-6 mt-16">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Popular Indian Stocks</h2>
            <p className="text-sm text-muted-foreground mt-1">Live quotes from NSE</p>
          </div>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <StockGrid symbols={POPULAR_INDIAN.map((s) => ({ symbol: s.symbol, exchange: s.exchange }))} />
      </section>

      <section className="mx-auto max-w-7xl px-4 lg:px-6 mt-16">
        <h2 className="text-2xl font-extrabold tracking-tight mb-5">Global Stocks</h2>
        <StockGrid symbols={GLOBAL_STOCKS.map((s) => ({ symbol: s.symbol, exchange: s.exchange }))} />
      </section>

      <section className="mx-auto max-w-7xl px-4 lg:px-6 mt-20">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: TrendingUp, title: "Real-time Analysis", desc: "Live prices and technical indicators powered by Yahoo Finance." },
            { icon: Bot, title: "AI Explanations", desc: "Plain-language insights from your personal AI tutor." },
            { icon: BookOpen, title: "Learn As You Invest", desc: "15 free lessons from beginner basics to advanced analysis." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="gradient-primary inline-flex h-10 w-10 items-center justify-center rounded-xl">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
