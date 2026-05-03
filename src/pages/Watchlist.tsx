import { Heart, Plus } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
import { StockCard } from "@/components/StockCard";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useStocks } from "@/hooks/useStock";
import { Link } from "react-router-dom";

export default function Watchlist() {
  const { items, isLoading } = useWatchlist();
  const symbols = items.map((i: any) => ({ symbol: i.symbol, exchange: i.exchange }));
  const { data, isLoading: quotesLoading } = useStocks(symbols);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 lg:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Watchlist</h1>
            <p className="text-sm text-muted-foreground">Stocks you're keeping an eye on</p>
          </div>
        </div>

        <div className="mb-6 max-w-xl">
          <SearchBar size="compact" placeholder="Search and open a stock to add to watchlist…" />
        </div>

        {isLoading || quotesLoading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Your watchlist is empty</h3>
            <p className="text-sm text-muted-foreground mb-4">Open any stock and tap the heart icon to save it.</p>
            <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Plus size={16} /> Browse Stocks
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.quotes?.map((q) => <StockCard key={q.symbol} quote={q} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
