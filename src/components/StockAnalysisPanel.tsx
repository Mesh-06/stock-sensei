/**
 * StockAnalysisPanel.tsx
 *
 * Drop this into your Stocks page as a new tab/section.
 * Uses shadcn/ui + Recharts (both already in the project).
 * Calls the Railway FastAPI backend via useStockAnalysis().
 */

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { useStockAnalysis } from "@/hooks/useStockAnalysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Loader2, RefreshCw, Info } from "lucide-react";

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: dec });
}

function pctClass(v: number) {
  return v >= 0 ? "text-green-400" : "text-red-400";
}

// ─────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {label}
        {hint && (
          <TooltipProvider delayDuration={200}>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 cursor-help opacity-60" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
            </UITooltip>
          </TooltipProvider>
        )}
      </div>
      <span className="text-lg font-bold text-foreground">{value}</span>
    </div>
  );
}

function ForecastChart({
  lastClose,
  lastDate,
  predictions,
}: {
  lastClose: number;
  lastDate: string;
  predictions: Record<string, number>;
}) {
  const data = [
    { date: lastDate, price: lastClose, type: "actual" },
    ...Object.entries(predictions).map(([date, price]) => ({
      date,
      price,
      type: "forecast",
    })),
  ];

  const prices = data.map((d) => d.price);
  const minP   = Math.min(...prices) * 0.995;
  const maxP   = Math.max(...prices) * 1.005;

  const CustomDot = (props: Record<string, unknown>) => {
    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { type: string } };
    if (payload.type === "actual") return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#38BDF8"
        stroke="#0F172A"
        strokeWidth={2}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis
          domain={[minP, maxP]}
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          tickFormatter={(v) => fmt(v, 0)}
          width={64}
        />
        <Tooltip
          contentStyle={{
            background: "#1E293B",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#94A3B8" }}
          formatter={(v: number) => [`₹ ${fmt(v)}`, "Price"]}
        />
        <ReferenceLine
          x={lastDate}
          stroke="rgba(255,255,255,0.2)"
          strokeDasharray="4 2"
          label={{ value: "Today", fill: "#94A3B8", fontSize: 10 }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#38BDF8"
          strokeWidth={2.5}
          dot={<CustomDot />}
          activeDot={{ r: 6, fill: "#38BDF8" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main panel
// ─────────────────────────────────────────────────────────────
export function StockAnalysisPanel({ prefilledTicker = "" }: { prefilledTicker?: string }) {
  const [ticker, setTicker] = useState(prefilledTicker);
  const { state, analyze, reset } = useStockAnalysis();

  function handleAnalyze() {
    analyze(ticker);
  }

  return (
    <div className="space-y-6 py-4">
      {/* ── Input row ── */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Enter ticker — e.g. RELIANCE.NS, AAPL, TCS.NS"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          className="max-w-sm bg-white/5 border-white/10 placeholder:text-muted-foreground"
        />
        <Button
          onClick={handleAnalyze}
          disabled={state.status === "loading" || !ticker.trim()}
          className="gap-2"
        >
          {state.status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            "Analyze"
          )}
        </Button>
        {state.status !== "idle" && (
          <Button variant="ghost" size="icon" onClick={reset} title="Reset">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ── Loading state ── */}
      {state.status === "loading" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
          <div className="text-center">
            <p className="font-semibold text-foreground">
              Running AI analysis for {state.ticker}…
            </p>
            <p className="text-sm mt-1">
              First-time stocks need ~3–5 minutes to fine-tune the TGT model.
              <br />
              Already-trained stocks return in seconds.
            </p>
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {state.status === "error" && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
          <p className="font-semibold">Analysis failed</p>
          <p className="text-sm mt-1 opacity-80">{state.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => analyze(ticker)}
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── Success state ── */}
      {state.status === "success" && (() => {
        const r = state.result;
        const isUp = r.trend === "UPTREND";
        const isBuy = r.signal === "BUY";

        return (
          <div className="space-y-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight">{r.ticker}</h2>
                <Badge
                  className={
                    isBuy
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }
                >
                  {r.signal}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    isUp
                      ? "text-green-400 border-green-500/30"
                      : "text-red-400 border-red-500/30"
                  }
                >
                  {isUp ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {r.trend}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                as of {r.last_date} · generated {new Date(r.generated_at).toLocaleTimeString()}
              </span>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                label="Last Close"
                value={`₹ ${fmt(r.last_close)}`}
              />
              <MetricCard
                label="Day 1 Forecast"
                value={`₹ ${fmt(r.predicted_prices[0])}`}
              />
              <MetricCard
                label="Day 1 Change"
                value={`${r.change_pct_day1 >= 0 ? "+" : ""}${fmt(r.change_pct_day1)}%`}
                hint="Predicted % change from last close to first forecast day"
              />
              <MetricCard
                label="5-Day Target"
                value={`₹ ${fmt(r.predicted_prices[4])}`}
              />
            </div>

            {/* Chart */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  5-Day Price Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ForecastChart
                  lastClose={r.last_close}
                  lastDate={r.last_date}
                  predictions={r.predictions}
                />
              </CardContent>
            </Card>

            {/* Forecast table */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Daily Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-white/5">
                  {Object.entries(r.predictions).map(([date, price], i) => {
                    const prev = i === 0 ? r.last_close : r.predicted_prices[i - 1];
                    const chg  = ((price - prev) / prev) * 100;
                    return (
                      <div
                        key={date}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          Day {i + 1} · {date}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className={pctClass(chg)}>
                            {chg >= 0 ? "+" : ""}
                            {fmt(chg)}%
                          </span>
                          <span className="font-semibold tabular-nums w-24 text-right">
                            ₹ {fmt(price)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Model metrics + peers */}
            <div className="grid sm:grid-cols-2 gap-4">
              {r.metrics && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Model Accuracy (Test Set)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {r.metrics.DirectionalAccuracy !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Directional Accuracy</span>
                        <span className="font-semibold text-sky-400">
                          {fmt(r.metrics.DirectionalAccuracy)}%
                        </span>
                      </div>
                    )}
                    {r.metrics.MAPE !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">MAPE</span>
                        <span className="font-semibold">
                          {fmt(r.metrics.MAPE)}%
                        </span>
                      </div>
                    )}
                    {r.metrics.RMSE !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">RMSE</span>
                        <span className="font-semibold">{fmt(r.metrics.RMSE)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Peer Stocks Used (GCN Graph)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {r.peers_used.map((p) => (
                      <Badge
                        key={p}
                        variant="outline"
                        className="text-xs border-white/10 text-muted-foreground"
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground opacity-60 leading-relaxed">
              ⚠️ AI model predictions are for educational purposes only and do not constitute
              financial advice. Past model accuracy does not guarantee future results.
              Always consult a qualified financial advisor before making investment decisions.
            </p>
          </div>
        );
      })()}

      {/* ── Idle placeholder ── */}
      {state.status === "idle" && (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-muted-foreground space-y-2">
          <TrendingUp className="h-10 w-10 mx-auto opacity-30" />
          <p className="font-medium">Enter a stock ticker above to run AI analysis</p>
          <p className="text-sm opacity-60">
            Supports NSE India (.NS), BSE (.BO), NYSE/NASDAQ, LSE (.L), and more
          </p>
        </div>
      )}
    </div>
  );
}
