import { useQuery } from "@tanstack/react-query";
import { stocksApi } from "@/services/stocks";

export function useStock(symbol: string | undefined, exchange = "NSE") {
  return useQuery({
    queryKey: ["stock", symbol, exchange],
    queryFn: () => stocksApi.quote(symbol!, exchange),
    enabled: !!symbol,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useStocks(items: { symbol: string; exchange?: string }[]) {
  return useQuery({
    queryKey: ["stocks", items.map((i) => `${i.symbol}:${i.exchange || "NSE"}`).join(",")],
    queryFn: () => stocksApi.quotes(items),
    enabled: items.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useStockHistory(symbol: string | undefined, exchange = "NSE", period = "1y") {
  return useQuery({
    queryKey: ["history", symbol, exchange, period],
    queryFn: () => stocksApi.history(symbol!, exchange, period),
    enabled: !!symbol,
    staleTime: 5 * 60_000,
  });
}

export function useStockNews(symbol: string | undefined, exchange = "NSE") {
  return useQuery({
    queryKey: ["news", symbol, exchange],
    queryFn: () => stocksApi.news(symbol!, exchange),
    enabled: !!symbol,
    staleTime: 10 * 60_000,
  });
}
