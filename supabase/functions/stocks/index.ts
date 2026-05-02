// StockSense AI — Stocks edge function
// Fetches data from Yahoo Finance, computes technical indicators,
// caches every successful response, and falls back to cache when Yahoo fails.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

// ----- Ticker formatting -----
const GLOBAL_TICKERS = new Set([
  "AAPL","GOOGL","GOOG","MSFT","AMZN","TSLA","META","NVDA","NFLX","BABA","TSM",
  "AMD","INTC","ORCL","CRM","ADBE","DIS","V","MA","JPM","BAC","WMT","NKE","KO","PEP",
]);

function buildTicker(symbol: string, exchange: string): string {
  const sym = symbol.toUpperCase().trim();
  if (sym.includes(".")) return sym; // already formatted
  if (GLOBAL_TICKERS.has(sym)) return sym;
  if (exchange === "BSE") return `${sym}.BO`;
  return `${sym}.NS`;
}

function exchangeFromTicker(ticker: string, exchange: string): string {
  if (ticker.endsWith(".NS")) return "NSE";
  if (ticker.endsWith(".BO")) return "BSE";
  if (!ticker.includes(".") && GLOBAL_TICKERS.has(ticker)) return "NASDAQ";
  return exchange || "NSE";
}

// ----- Indicator math -----
function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period || 0.0001;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

function computeSMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] || 0;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function computeEMASeries(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let prev = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema[period - 1] = prev;
  for (let i = period; i < closes.length; i++) {
    prev = closes[i] * k + prev * (1 - k);
    ema[i] = prev;
  }
  return ema;
}

function computeMACD(closes: number[]): { macd: number; signal: number } {
  if (closes.length < 35) return { macd: 0, signal: 0 };
  const ema12 = computeEMASeries(closes, 12);
  const ema26 = computeEMASeries(closes, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (ema12[i] != null && ema26[i] != null) macdLine.push(ema12[i] - ema26[i]);
  }
  const signalLine = computeEMASeries(macdLine, 9);
  return {
    macd: +(macdLine[macdLine.length - 1] || 0).toFixed(3),
    signal: +(signalLine[signalLine.length - 1] || 0).toFixed(3),
  };
}

function computeBollinger(closes: number[], period = 20, mult = 2) {
  if (closes.length < period) return { upper: 0, lower: 0, middle: 0 };
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((s, x) => s + (x - mean) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return { upper: mean + mult * sd, lower: mean - mult * sd, middle: mean };
}

// ----- Cache helpers -----
async function readCache(key: string): Promise<any | null> {
  const { data } = await supabase
    .from("stock_cache")
    .select("payload")
    .eq("cache_key", key)
    .maybeSingle();
  return data?.payload ?? null;
}

async function writeCache(key: string, symbol: string, exchange: string, action: string, payload: any) {
  await supabase.from("stock_cache").upsert(
    { cache_key: key, symbol, exchange, action, payload, updated_at: new Date().toISOString() },
    { onConflict: "cache_key" }
  );
}

// ----- Yahoo fetchers -----
async function yfetch(url: string): Promise<any> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  return res.json();
}

function relativeTime(epochSec: number): string {
  const diffSec = Math.floor(Date.now() / 1000 - epochSec);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return `${Math.floor(diffSec / 604800)}w ago`;
}

function generateExplanation(d: any): string {
  const rsiState = d.rsi >= 70 ? "overbought" : d.rsi <= 30 ? "oversold" : "neutral";
  const maState = d.price > d.movingAvg50 ? "above its 50-day average (positive medium-term)" : "below its 50-day average (cautious medium-term)";
  const longTerm = d.price > d.movingAvg200 ? "above the 200-day average (long-term uptrend)" : "below the 200-day average (long-term weakness)";
  const macdState = d.macd > d.macdSignal ? "MACD is bullish" : "MACD is bearish";
  return `${d.symbol} is currently ${d.trend.toLowerCase()}. RSI is at ${d.rsi} (${rsiState}). The price is trading ${maState} and ${longTerm}. ${macdState}. This is educational analysis only — always do your own research.`;
}

async function fetchQuote(symbol: string, exchange: string) {
  const ticker = buildTicker(symbol, exchange);
  const cacheKey = `quote:${ticker}`;
  try {
    // Get history (1y) + summary in one call
    const histUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y&includePrePost=false`;
    const hist = await yfetch(histUrl);
    const result = hist?.chart?.result?.[0];
    if (!result) throw new Error("No chart data");

    const meta = result.meta || {};
    const closes: number[] = (result.indicators?.quote?.[0]?.close || []).filter((x: any) => x != null);
    const volumes: number[] = (result.indicators?.quote?.[0]?.volume || []).filter((x: any) => x != null);
    const lastClose = closes[closes.length - 1] || meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || closes[closes.length - 2] || lastClose;
    const change = lastClose - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    const rsi = computeRSI(closes);
    const ma50 = computeSMA(closes, 50);
    const ma200 = computeSMA(closes, 200);
    const macdData = computeMACD(closes);
    const boll = computeBollinger(closes);

    const week52High = meta.fiftyTwoWeekHigh || Math.max(...closes);
    const week52Low = meta.fiftyTwoWeekLow || Math.min(...closes);
    const avgVolume = volumes.length ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;

    // Try summary endpoint for fundamentals (best-effort)
    let pe = 0, eps = 0, dividendYield = 0, marketCap = 0, name = meta.longName || meta.shortName || symbol;
    try {
      const summaryUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;
      const summary = await yfetch(summaryUrl);
      const q = summary?.quoteResponse?.result?.[0];
      if (q) {
        pe = q.trailingPE || 0;
        eps = q.epsTrailingTwelveMonths || 0;
        dividendYield = (q.trailingAnnualDividendYield || 0) * 100;
        marketCap = q.marketCap || 0;
        name = q.longName || q.shortName || name;
      }
    } catch (_) { /* fundamentals optional */ }

    // Trend
    const bullishSignals = [
      rsi >= 40 && rsi <= 70,
      lastClose > ma50,
      lastClose > ma200,
      macdData.macd > macdData.signal,
    ].filter(Boolean).length;
    const trend = bullishSignals >= 3 ? "Bullish" : bullishSignals <= 1 ? "Bearish" : "Neutral";
    const trendType = trend === "Bullish" ? "success" : trend === "Bearish" ? "danger" : "neutral";

    const data: any = {
      symbol: symbol.toUpperCase().replace(/\.(NS|BO)$/, ""),
      ticker,
      name,
      exchange: exchangeFromTicker(ticker, exchange),
      currency: meta.currency || (ticker.endsWith(".NS") || ticker.endsWith(".BO") ? "INR" : "USD"),
      price: +lastClose.toFixed(2),
      change: +change.toFixed(2),
      changePercent: +changePercent.toFixed(2),
      open: +(meta.regularMarketOpen || closes[closes.length - 1] || 0).toFixed(2),
      high: +(meta.regularMarketDayHigh || lastClose).toFixed(2),
      low: +(meta.regularMarketDayLow || lastClose).toFixed(2),
      volume: meta.regularMarketVolume || volumes[volumes.length - 1] || 0,
      avgVolume: Math.round(avgVolume),
      marketCap,
      pe: +pe.toFixed(2),
      eps: +eps.toFixed(2),
      dividendYield: +dividendYield.toFixed(2),
      week52High: +week52High.toFixed(2),
      week52Low: +week52Low.toFixed(2),
      rsi,
      movingAvg50: +ma50.toFixed(2),
      movingAvg200: +ma200.toFixed(2),
      macd: macdData.macd,
      macdSignal: macdData.signal,
      bollingerUpper: +boll.upper.toFixed(2),
      bollingerLower: +boll.lower.toFixed(2),
      trend,
      trendType,
      bullishSignals,
      strengthScore: Math.round((bullishSignals / 4) * 100),
      stale: false,
      fetchedAt: new Date().toISOString(),
    };
    data.aiExplanation = generateExplanation(data);

    await writeCache(cacheKey, data.symbol, data.exchange, "quote", data);
    return data;
  } catch (err) {
    const cached = await readCache(cacheKey);
    if (cached) return { ...cached, stale: true };
    throw err;
  }
}

async function fetchHistory(symbol: string, exchange: string, period: string) {
  const ticker = buildTicker(symbol, exchange);
  const cacheKey = `history:${ticker}:${period}`;
  try {
    const interval = ["1y", "2y", "5y"].includes(period) ? "1d" : period === "1w" ? "60m" : "1d";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${period}`;
    const json = await yfetch(url);
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error("No history");
    const ts: number[] = result.timestamp || [];
    const closes: number[] = result.indicators?.quote?.[0]?.close || [];
    const opens: number[] = result.indicators?.quote?.[0]?.open || [];
    const highs: number[] = result.indicators?.quote?.[0]?.high || [];
    const lows: number[] = result.indicators?.quote?.[0]?.low || [];
    const volumes: number[] = result.indicators?.quote?.[0]?.volume || [];
    const points = ts
      .map((t, i) => ({
        date: new Date(t * 1000).toISOString().slice(0, 10),
        timestamp: t * 1000,
        open: opens[i],
        high: highs[i],
        low: lows[i],
        close: closes[i],
        volume: volumes[i] || 0,
      }))
      .filter((p) => p.close != null);
    const data = { symbol: symbol.toUpperCase(), ticker, period, points, stale: false };
    await writeCache(cacheKey, symbol, exchange, "history", data);
    return data;
  } catch (err) {
    const cached = await readCache(cacheKey);
    if (cached) return { ...cached, stale: true };
    throw err;
  }
}

async function searchStocks(query: string) {
  if (!query || query.length < 1) return { results: [] };
  const cacheKey = `search:${query.toLowerCase()}`;
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
    const json = await yfetch(url);
    const results = (json?.quotes || [])
      .filter((q: any) => q.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF" || q.quoteType === "INDEX"))
      .map((q: any) => {
        const sym = q.symbol;
        let exchange = "NASDAQ";
        let display = sym;
        if (sym.endsWith(".NS")) { exchange = "NSE"; display = sym.replace(".NS", ""); }
        else if (sym.endsWith(".BO")) { exchange = "BSE"; display = sym.replace(".BO", ""); }
        return {
          symbol: display,
          ticker: sym,
          name: q.shortname || q.longname || sym,
          exchange,
          type: q.quoteType,
        };
      });
    const data = { results };
    await writeCache(cacheKey, query, "ANY", "search", data);
    return data;
  } catch (err) {
    const cached = await readCache(cacheKey);
    if (cached) return { ...cached, stale: true };
    return { results: [], error: "Search failed" };
  }
}

async function fetchNews(symbol: string, exchange: string) {
  const ticker = buildTicker(symbol, exchange);
  const cacheKey = `news:${ticker}`;
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=0&newsCount=10`;
    const json = await yfetch(url);
    const items = (json?.news || []).slice(0, 8).map((n: any) => ({
      title: n.title,
      source: n.publisher || "Yahoo Finance",
      time: n.providerPublishTime ? relativeTime(n.providerPublishTime) : "recent",
      url: n.link,
    }));
    const data = { items };
    await writeCache(cacheKey, symbol, exchange, "news", data);
    return data;
  } catch (err) {
    const cached = await readCache(cacheKey);
    if (cached) return { ...cached, stale: true };
    return { items: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const { action, symbol, exchange = "NSE", period = "1y", query, symbols } = body;

    let result: any;

    if (action === "quote") {
      result = await fetchQuote(symbol, exchange);
    } else if (action === "quotes" && Array.isArray(symbols)) {
      // Batch quotes
      const arr = await Promise.all(
        symbols.map((s: any) =>
          fetchQuote(s.symbol || s, s.exchange || "NSE").catch(() => null)
        )
      );
      result = { quotes: arr.filter(Boolean) };
    } else if (action === "history") {
      result = await fetchHistory(symbol, exchange, period);
    } else if (action === "search") {
      result = await searchStocks(query);
    } else if (action === "news") {
      result = await fetchNews(symbol, exchange);
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stocks error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
