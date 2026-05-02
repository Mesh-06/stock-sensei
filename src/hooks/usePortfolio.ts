import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PortfolioHolding {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  exchange: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  purchased_at: string;
}

export function usePortfolio() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ["portfolio", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("portfolio_holdings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PortfolioHolding[];
    },
    enabled: !!user,
  });

  const add = useMutation({
    mutationFn: async (h: Omit<PortfolioHolding, "id" | "user_id">) => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("portfolio_holdings").insert({
        user_id: user.id,
        symbol: h.symbol,
        name: h.name,
        exchange: h.exchange,
        quantity: h.quantity,
        avg_price: h.avg_price,
        current_price: h.current_price,
        purchased_at: h.purchased_at,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Added to portfolio");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PortfolioHolding> & { id: string }) => {
      const { error } = await supabase.from("portfolio_holdings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio_holdings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Holding removed");
    },
  });

  // Computed totals
  const totals = holdings.reduce(
    (acc, h) => {
      const invested = h.quantity * h.avg_price;
      const current = h.quantity * h.current_price;
      acc.invested += invested;
      acc.current += current;
      acc.pnl += current - invested;
      return acc;
    },
    { invested: 0, current: 0, pnl: 0 }
  );

  return {
    holdings,
    isLoading,
    totals: { ...totals, pnlPercent: totals.invested ? (totals.pnl / totals.invested) * 100 : 0 },
    add: add.mutate,
    update: update.mutate,
    remove: remove.mutate,
  };
}
