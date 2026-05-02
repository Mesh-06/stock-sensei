import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/services/stocks";
import { toast } from "sonner";

interface Props { symbol: string; exchange?: string; currentPrice: number; currency?: string }

export function PriceAlertButton({ symbol, exchange = "NSE", currentPrice, currency = "INR" }: Props) {
  const { user } = useAuth();
  const { alerts, create, remove } = useAlerts();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(currentPrice.toFixed(2));
  const [direction, setDirection] = useState<"above" | "below">("above");

  const symbolAlerts = alerts.filter((a: any) => a.symbol === symbol);

  const handleSave = () => {
    if (!user) { toast.info("Sign in to set price alerts"); return; }
    const t = parseFloat(target);
    if (isNaN(t) || t <= 0) { toast.error("Enter a valid price"); return; }
    create({ symbol, exchange, target_price: t, direction });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-accent" aria-label="Set price alert">
          <Bell size={18} className="text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set price alert for {symbol}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
            Current price: <span className="font-semibold tabular-nums">{formatCurrency(currentPrice, currency)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection("above")}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${direction === "above" ? "border-success bg-success-muted" : "border-border bg-card hover:bg-accent"}`}
            >
              ↑ Above
            </button>
            <button
              onClick={() => setDirection("below")}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${direction === "below" ? "border-danger bg-danger-muted" : "border-border bg-card hover:bg-accent"}`}
            >
              ↓ Below
            </button>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Target price ({currency})</label>
            <input
              type="number"
              step="0.01"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full gradient-primary text-white rounded-xl px-5 py-2.5 font-medium shadow-md hover:opacity-90 transition"
          >
            Set alert
          </button>

          {symbolAlerts.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground">Existing alerts</p>
              {symbolAlerts.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm">
                  <span>
                    {a.direction === "above" ? "↑" : "↓"} {formatCurrency(a.target_price, currency)}
                    {a.triggered && <span className="ml-2 rounded-full bg-success-muted px-2 py-0.5 text-xs">triggered</span>}
                  </span>
                  <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
