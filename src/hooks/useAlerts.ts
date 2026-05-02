import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("price_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (a: { symbol: string; exchange?: string; target_price: number; direction: "above" | "below" }) => {
      if (!user) throw new Error("Sign in to set alerts");
      const { error } = await supabase
        .from("price_alerts")
        .insert({ user_id: user.id, symbol: a.symbol, exchange: a.exchange || "NSE", target_price: a.target_price, direction: a.direction });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Price alert set");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const markTriggered = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_alerts").update({ triggered: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  return { alerts, create: create.mutate, remove: remove.mutate, markTriggered: markTriggered.mutate };
}
