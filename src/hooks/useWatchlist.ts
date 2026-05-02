import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useWatchlist() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["watchlist", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", user.id)
        .order("added_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async ({ symbol, exchange = "NSE" }: { symbol: string; exchange?: string }) => {
      if (!user) throw new Error("Sign in to save your watchlist");
      const { error } = await supabase
        .from("watchlist")
        .insert({ user_id: user.id, symbol, exchange });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success("Added to watchlist");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (symbol: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("symbol", symbol);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success("Removed from watchlist");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    items,
    isLoading,
    isInWatchlist: (symbol: string) => items.some((i: any) => i.symbol === symbol),
    add: addMutation.mutate,
    remove: removeMutation.mutate,
    toggle: (symbol: string, exchange = "NSE") => {
      if (items.some((i: any) => i.symbol === symbol)) removeMutation.mutate(symbol);
      else addMutation.mutate({ symbol, exchange });
    },
  };
}
