import { useEffect, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { stocksApi } from "@/services/stocks";

type Status = "checking" | "ok" | "error";

export default function Health() {
  const { user } = useAuth();
  const [stocks, setStocks] = useState<Status>("checking");
  const [chat, setChat] = useState<Status>("checking");

  useEffect(() => {
    stocksApi.quote("RELIANCE", "NSE").then(() => setStocks("ok")).catch(() => setStocks("error"));
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, { method: "OPTIONS" })
      .then((r) => setChat(r.ok ? "ok" : "error"))
      .catch(() => setChat("error"));
  }, []);

  const Item = ({ label, status }: { label: string; status: Status }) => (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm">{label}</span>
      {status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {status === "ok" && <Check className="h-4 w-4 text-success" />}
      {status === "error" && <X className="h-4 w-4 text-danger" />}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight">Health Check</h1>
        <p className="text-sm text-muted-foreground mt-1">System status diagnostics.</p>
        <div className="mt-6 space-y-2">
          <Item label="Stocks API (Yahoo Finance)" status={stocks} />
          <Item label="AI Chat (Gemini)" status={chat} />
          <Item label={user ? `Signed in as ${user.email}` : "Not signed in"} status={user ? "ok" : "error"} />
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          Note: Pages such as Portfolio, Watchlist, Learn, Compare, Sectors, and Profile are scaffolded as routes but not yet built — they will be added in follow-up updates.
        </p>
      </div>
    </div>
  );
}
