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

export interface OHLCVPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; ticker: string }
  | { status: "success"; result: PredictionResult }
  | { status: "error"; message: string };

const API_BASE = (
  import.meta.env.VITE_STOCK_ANALYSIS_API_URL ??
  "https://web-production-6f2903.up.railway.app"
).replace(/\/$/, "");

export function useStockAnalysis() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  const analyze = useCallback(
    async (ticker: string, ohlcv?: OHLCVPoint[], forceRetrain = false) => {
      ticker = ticker.trim().toUpperCase();
      if (!ticker) return;

      setState({ status: "loading", ticker });

      try {
        const res = await fetch(`${API_BASE}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            force_retrain: forceRetrain,
            ohlcv: ohlcv ?? null,   // send OHLCV from page so Railway skips yfinance
          }),
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
