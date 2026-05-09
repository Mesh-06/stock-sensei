import { useState, useCallback } from "react";

export interface PredictionResult {
  ticker: string;
  last_close: number;
  last_date: string;
  predicted_prices: number[];
  predictions: Record<string, number>;
  change_pct_day1: number;
  trend: "UPTREND" | "DOWNTREND";
  signal: "BUY" | "SELL";
  peers_used: string[];
  generated_at: string;
  metrics?: {
    RMSE?: number;
    MAPE?: number;
    DirectionalAccuracy?: number;
  };
}

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; ticker: string }
  | { status: "success"; result: PredictionResult }
  | { status: "error"; message: string };

// ── Set this to your Railway backend URL after deploying ──────
const API_BASE =
  import.meta.env.VITE_STOCK_ANALYSIS_API_URL ??
  "https://your-railway-backend.up.railway.app";

export function useStockAnalysis() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  const analyze = useCallback(
    async (ticker: string, forceRetrain = false) => {
      ticker = ticker.trim().toUpperCase();
      if (!ticker) return;

      setState({ status: "loading", ticker });

      try {
        const res = await fetch(`${API_BASE}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker, force_retrain: forceRetrain }),
          // Fine-tuning can take 3-5 min — generous timeout via AbortController
          signal: AbortSignal.timeout(8 * 60 * 1000),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail ?? `Server error ${res.status}`);
        }

        const result: PredictionResult = await res.json();
        setState({ status: "success", result });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setState({ status: "error", message });
      }
    },
    []
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, analyze, reset };
}
