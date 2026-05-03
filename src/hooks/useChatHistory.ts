import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DBMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function useConversations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Conversation[];
    },
    enabled: !!user,
  });

  const createConv = useMutation({
    mutationFn: async (title: string) => {
      if (!user) throw new Error("Sign in required");
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user.id, title: title.slice(0, 80) || "New chat" })
        .select()
        .single();
      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const renameConv = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("chat_conversations")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const deleteConv = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("chat_messages").delete().eq("conversation_id", id);
      const { error } = await supabase.from("chat_conversations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  return {
    conversations: list.data || [],
    isLoading: list.isLoading,
    createConv: createConv.mutateAsync,
    renameConv: renameConv.mutate,
    deleteConv: deleteConv.mutate,
  };
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as DBMessage[];
    },
    enabled: !!conversationId,
  });
}

export async function persistMessage(params: {
  userId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
}) {
  await supabase.from("chat_messages").insert({
    user_id: params.userId,
    conversation_id: params.conversationId,
    role: params.role,
    content: params.content,
  });
  await supabase
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.conversationId);
}
