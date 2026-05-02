import { supabase } from "@/integrations/supabase/client";

const STOCKS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stocks`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callStocks(body: any) {
  const res = await fetch(STOCKS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Stocks ${res.status}`);
  return res.json();
}

export interface StockQuote {
  symbol: string;
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  pe: number;
  eps: number;
  dividendYield: number;
  week52High: number;
  week52Low: number;
  rsi: number;
  movingAvg50: number;
  movingAvg200: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerLower: number;
  trend: "Bullish" | "Bearish" | "Neutral";
  trendType: "success" | "danger" | "neutral";
  bullishSignals: number;
  strengthScore: number;
  aiExplanation: string;
  stale: boolean;
}

export interface PricePoint {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockHistory {
  symbol: string;
  ticker: string;
  period: string;
  points: PricePoint[];
  stale: boolean;
}

export interface SearchResult {
  symbol: string;
  ticker: string;
  name: string;
  exchange: string;
  type: string;
}

export interface NewsItem {
  title: string;
  source: string;
  time: string;
  url: string;
}

export const stocksApi = {
  quote: (symbol: string, exchange = "NSE") =>
    callStocks({ action: "quote", symbol, exchange }) as Promise<StockQuote>,
  quotes: (items: { symbol: string; exchange?: string }[]) =>
    callStocks({ action: "quotes", symbols: items }) as Promise<{ quotes: StockQuote[] }>,
  history: (symbol: string, exchange = "NSE", period = "1y") =>
    callStocks({ action: "history", symbol, exchange, period }) as Promise<StockHistory>,
  search: (query: string) =>
    callStocks({ action: "search", query }) as Promise<{ results: SearchResult[] }>,
  news: (symbol: string, exchange = "NSE") =>
    callStocks({ action: "news", symbol, exchange }) as Promise<{ items: NewsItem[] }>,
};

// Currency formatter
export function formatCurrency(value: number, currency: string = "INR"): string {
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export function formatLargeNumber(num: number, currency = "INR"): string {
  if (!num) return "—";
  if (currency === "INR") {
    if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)} Cr`;
    if (num >= 1e5) return `₹${(num / 1e5).toFixed(2)} L`;
    return `₹${num.toLocaleString("en-IN")}`;
  }
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
}

export function formatVolume(num: number): string {
  if (!num) return "—";
  if (num >= 1e7) return `${(num / 1e7).toFixed(2)} Cr`;
  if (num >= 1e5) return `${(num / 1e5).toFixed(2)} L`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}
