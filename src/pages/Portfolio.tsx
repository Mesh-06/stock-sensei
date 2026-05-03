import { useEffect, useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, X, Pencil } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
import { StockAvatar } from "@/components/StockAvatar";
import { usePortfolio, type PortfolioHolding } from "@/hooks/usePortfolio";
import { useStocks } from "@/hooks/useStock";
import { formatCurrency } from "@/services/stocks";
import type { SearchResult } from "@/services/stocks";
import { Link } from "react-router-dom";

export default function Portfolio() {
  const { holdings, isLoading, totals, add, update, remove } = usePortfolio();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Refresh current_price for holdings
  const items = holdings.map((h) => ({ symbol: h.symbol, exchange: h.exchange }));
  const { data: live } = useStocks(items);

  useEffect(() => {
    if (!live?.quotes) return;
    holdings.forEach((h) => {
      const q = live.quotes.find((x) => x.symbol === h.symbol);
      if (q && Math.abs(q.price - h.current_price) > 0.01) {
        update({ id: h.id, current_price: q.price });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 lg:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Portfolio</h1>
            <p className="text-sm text-muted-foreground">Track your holdings and live P&amp;L</p>
          </div>
          <button
            onClick={() => { setEditingId(null); setShowAdd(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            <Plus size={16} /> Add Holding
          </button>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <SummaryCard label="Invested" value={formatCurrency(totals.invested)} icon={<Wallet size={18} />} />
          <SummaryCard label="Current Value" value={formatCurrency(totals.current)} icon={<Wallet size={18} />} />
          <SummaryCard
            label="Unrealized P&L"
            value={`${totals.pnl >= 0 ? "+" : ""}${formatCurrency(totals.pnl)}`}
            sub={`${totals.pnlPercent >= 0 ? "+" : ""}${totals.pnlPercent.toFixed(2)}%`}
            icon={totals.pnl >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            tone={totals.pnl >= 0 ? "up" : "down"}
          />
        </div>

        {/* Holdings */}
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Loading…</div>
        ) : holdings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Wallet className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No holdings yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start by adding your first stock to track returns.</p>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Plus size={16} /> Add your first holding
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="hidden md:grid grid-cols-12 gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <div className="col-span-3">Stock</div>
              <div className="col-span-1 text-right">Qty</div>
              <div className="col-span-2 text-right">Avg Price</div>
              <div className="col-span-2 text-right">LTP</div>
              <div className="col-span-2 text-right">Value</div>
              <div className="col-span-2 text-right">P&amp;L</div>
            </div>
            {holdings.map((h) => {
              const invested = h.quantity * h.avg_price;
              const current = h.quantity * h.current_price;
              const pnl = current - invested;
              const pnlPct = invested ? (pnl / invested) * 100 : 0;
              const up = pnl >= 0;
              return (
                <div key={h.id} className="grid grid-cols-12 gap-3 items-center border-b border-border last:border-0 px-4 py-3 hover:bg-accent/40 transition">
                  <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                    <StockAvatar symbol={h.symbol} size={36} />
                    <div className="min-w-0">
                      <Link to={`/stock/${h.symbol}?ex=${h.exchange}`} className="font-semibold hover:underline">{h.symbol}</Link>
                      <div className="text-xs text-muted-foreground truncate">{h.name}</div>
                    </div>
                  </div>
                  <div className="col-span-4 md:col-span-1 text-right tabular-nums">{h.quantity}</div>
                  <div className="col-span-4 md:col-span-2 text-right tabular-nums">{formatCurrency(h.avg_price)}</div>
                  <div className="col-span-4 md:col-span-2 text-right tabular-nums font-medium">{formatCurrency(h.current_price)}</div>
                  <div className="col-span-6 md:col-span-2 text-right tabular-nums">{formatCurrency(current)}</div>
                  <div className="col-span-6 md:col-span-2 text-right">
                    <div className={`tabular-nums font-semibold ${up ? "text-success" : "text-danger"}`}>
                      {up ? "+" : ""}{formatCurrency(pnl)}
                    </div>
                    <div className={`text-xs ${up ? "text-success" : "text-danger"}`}>{up ? "+" : ""}{pnlPct.toFixed(2)}%</div>
                  </div>
                  <div className="col-span-12 flex justify-end gap-1 -mt-1">
                    <button onClick={() => { setEditingId(h.id); setShowAdd(true); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(h.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger" aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />

      {showAdd && (
        <HoldingDialog
          editing={editingId ? holdings.find((h) => h.id === editingId) : undefined}
          onClose={() => { setShowAdd(false); setEditingId(null); }}
          onSave={(payload) => {
            if (editingId) update({ id: editingId, ...payload });
            else add(payload as any);
            setShowAdd(false);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, icon, tone }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone?: "up" | "down" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        <span>{icon}</span>
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${tone === "up" ? "text-success" : tone === "down" ? "text-danger" : ""}`}>{value}</div>
      {sub && <div className={`text-xs font-medium ${tone === "up" ? "text-success" : tone === "down" ? "text-danger" : "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}

function HoldingDialog({ editing, onClose, onSave }: {
  editing?: PortfolioHolding;
  onClose: () => void;
  onSave: (h: Omit<PortfolioHolding, "id" | "user_id">) => void;
}) {
  const [picked, setPicked] = useState<{ symbol: string; name: string; exchange: string } | null>(
    editing ? { symbol: editing.symbol, name: editing.name, exchange: editing.exchange } : null
  );
  const [qty, setQty] = useState<string>(editing?.quantity.toString() ?? "");
  const [price, setPrice] = useState<string>(editing?.avg_price.toString() ?? "");
  const [date, setDate] = useState<string>(
    editing?.purchased_at ? editing.purchased_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked || !qty || !price) return;
    onSave({
      symbol: picked.symbol,
      name: picked.name,
      exchange: picked.exchange,
      quantity: parseFloat(qty),
      avg_price: parseFloat(price),
      current_price: editing?.current_price ?? parseFloat(price),
      purchased_at: new Date(date).toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{editing ? "Edit Holding" : "Add Holding"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent" aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {!editing && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Stock</label>
              {picked ? (
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
                  <div className="flex items-center gap-2">
                    <StockAvatar symbol={picked.symbol} size={28} />
                    <div>
                      <div className="font-semibold text-sm">{picked.symbol}</div>
                      <div className="text-xs text-muted-foreground">{picked.name}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setPicked(null)} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
                </div>
              ) : (
                <SearchBar
                  size="compact"
                  placeholder="Search to pick a stock…"
                  onSelect={(r: SearchResult) => setPicked({ symbol: r.symbol, name: r.name, exchange: r.exchange })}
                />
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</label>
              <input type="number" step="0.0001" min="0" value={qty} onChange={(e) => setQty(e.target.value)} required className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Avg. Price</label>
              <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Purchased on</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button type="submit" disabled={!picked || !qty || !price} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {editing ? "Save Changes" : "Add Holding"}
          </button>
        </form>
      </div>
    </div>
  );
}
