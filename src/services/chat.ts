// Streaming chat client for the StockSense AI chat edge function

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamChatOpts {
  messages: ChatMessage[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export async function streamChat({ messages, onDelta, onDone, onError, signal }: StreamChatOpts) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON}`,
      },
      body: JSON.stringify({ messages }),
      signal,
    });
    if (!resp.ok || !resp.body) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Chat stream failed: ${resp.status} ${txt}`);
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let done = false;
    while (!done) {
      const { done: rdone, value } = await reader.read();
      if (rdone) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") {
          done = true;
          break;
        }
        try {
          const obj = JSON.parse(json);
          if (obj.delta) onDelta(obj.delta);
          else if (obj.error) throw new Error(obj.error);
        } catch (_) {
          // partial JSON, push back
          buf = line + "\n" + buf;
          break;
        }
      }
    }
    onDone();
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      onDone();
      return;
    }
    onError?.(err as Error);
    onDone();
  }
}
