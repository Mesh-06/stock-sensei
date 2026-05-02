import { useRef, useState } from "react";
import { Send, Square, Sparkles, Bot, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Navbar } from "@/components/Navbar";
import { streamChat, type ChatMessage } from "@/services/chat";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const SUGGESTIONS = [
  "What is a stock and how does it work?",
  "How do I start investing in India with ₹500?",
  "Explain RSI in simple terms",
  "What is the difference between NSE and BSE?",
  "Are SIPs safe for beginners?",
  "Explain P/E ratio with an example",
];

export default function Chatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setStreaming(true);
    abortRef.current = new AbortController();

    let acc = "";
    setMessages((p) => [...p, { role: "assistant", content: "" }]);

    await streamChat({
      messages: newMsgs,
      signal: abortRef.current.signal,
      onDelta: (chunk) => {
        acc += chunk;
        setMessages((p) => {
          const next = [...p];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      },
      onError: (e) => {
        setMessages((p) => {
          const next = [...p];
          next[next.length - 1] = { role: "assistant", content: `⚠️ ${e.message}` };
          return next;
        });
      },
      onDone: () => setStreaming(false),
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 mx-auto w-full max-w-4xl flex flex-col px-4 lg:px-6 py-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="gradient-primary h-10 w-10 rounded-xl flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-bold">StockSense AI</h1>
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-slow" />
            </div>
            <p className="text-xs text-muted-foreground">Powered by Gemini · Ask about stocks & investing</p>
          </div>
        </div>

        {!user && (
          <div className="mt-3 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link> to save your conversation history.
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="gradient-primary inline-flex h-16 w-16 rounded-2xl items-center justify-center">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="mt-4 text-2xl font-extrabold">StockSense AI</h2>
              <p className="text-sm text-muted-foreground mt-1">Your personal stock market tutor.</p>
              <div className="mt-8 grid gap-2 sm:grid-cols-2 max-w-2xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-left rounded-xl border border-border bg-card hover:bg-accent transition p-3 text-sm">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                {m.role === "assistant" && (
                  <div className="gradient-primary h-8 w-8 shrink-0 rounded-xl flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "gradient-primary text-white" : "border border-border bg-card"}`}>
                  {m.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  ) : m.content ? (
                    <div className="prose-chat">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="sticky bottom-0 bg-background pt-2 pb-2"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-card">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask about stocks, investing, market terms…"
              rows={1}
              className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none max-h-32"
            />
            {streaming ? (
              <button type="button" onClick={() => abortRef.current?.abort()} className="h-9 w-9 flex items-center justify-center rounded-xl bg-danger text-white" aria-label="Stop">
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} className="h-9 w-9 flex items-center justify-center rounded-xl gradient-primary text-white disabled:opacity-50" aria-label="Send">
                <Send size={16} />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            AI-generated educational content only. Not investment advice. {input.length}/2000
          </p>
        </form>
      </div>
    </div>
  );
}
