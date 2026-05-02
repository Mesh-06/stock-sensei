import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Send, Sparkles, Loader2, RefreshCw, User } from "lucide-react";
import { streamChat, type ChatMessage } from "@/services/chat";
import { toast } from "sonner";

type Level = "Beginner" | "Intermediate" | "Advanced";
type Risk = "Conservative" | "Balanced" | "Aggressive";

interface Lesson {
  id: string;
  level: Level;
  title: string;
  summary: string;
  body: string[];
  takeaways: string[];
}

interface Props {
  lesson: Lesson;
}

const SUGGESTED = [
  "Explain this in simpler words",
  "Give me a real Indian stock example",
  "What are the common mistakes?",
  "How does this fit my portfolio?",
];

function buildContext(lesson: Lesson, userLevel: Level, risk: Risk): string {
  return `I'm currently studying the lesson **"${lesson.title}"** on StockSense AI.

**My experience level:** ${userLevel}
**My risk appetite:** ${risk}

**Lesson content:**
${lesson.body.join("\n\n")}

**Key takeaways:**
${lesson.takeaways.map((t) => `- ${t}`).join("\n")}

Please tailor every answer to a ${userLevel.toLowerCase()} investor with a ${risk.toLowerCase()} risk appetite. Use Indian rupee (₹) examples and reference Indian stocks/markets when relevant. Keep answers focused on this lesson topic.`;
}

export function LessonAITutor({ lesson }: Props) {
  const [userLevel, setUserLevel] = useState<Level>(lesson.level);
  const [risk, setRisk] = useState<Risk>("Balanced");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const isFirst = messages.length === 0;
    const userContent = isFirst
      ? `${buildContext(lesson, userLevel, risk)}\n\n---\n\n**My question:** ${trimmed}`
      : trimmed;

    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: isFirst ? trimmed : trimmed }, // displayed clean
    ];
    // For the API call we need the full context on first turn
    const apiMessages: ChatMessage[] = isFirst
      ? [{ role: "user", content: userContent }]
      : [
          // Resend lesson context so the model stays focused even across turns
          { role: "user", content: buildContext(lesson, userLevel, risk) },
          { role: "assistant", content: "Got it — I'll tailor everything to your level and risk appetite." },
          ...messages,
          { role: "user", content: trimmed },
        ];

    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    abortRef.current = new AbortController();

    let acc = "";
    await streamChat({
      messages: apiMessages,
      signal: abortRef.current.signal,
      onDelta: (chunk) => {
        acc += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      },
      onDone: () => setStreaming(false),
      onError: (err) => {
        toast.error(err.message || "Couldn't reach the AI tutor. Try again.");
        setStreaming(false);
      },
    });
  };

  const summarize = () => send("Give me a short, plain-language summary of this lesson tailored to my level and risk appetite. End with 3 action steps I can take this week.");
  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setStreaming(false);
  };

  return (
    <div className="mt-6 rounded-xl border border-border bg-background/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
        <div className="h-7 w-7 rounded-lg bg-foreground text-background flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold">AI Tutor</div>
          <div className="text-[11px] text-muted-foreground">Personalised explanations · follow-up questions</div>
        </div>
        {messages.length > 0 && (
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-accent transition" aria-label="Reset chat">
            <RefreshCw size={12} /> Reset
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Your level</label>
            <div className="mt-1.5 flex gap-1.5">
              {(["Beginner", "Intermediate", "Advanced"] as Level[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setUserLevel(l)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition ${userLevel === l ? "bg-foreground text-background border-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Risk appetite</label>
            <div className="mt-1.5 flex gap-1.5">
              {(["Conservative", "Balanced", "Aggressive"] as Risk[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition ${risk === r ? "bg-foreground text-background border-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="space-y-3">
            <button
              onClick={summarize}
              disabled={streaming}
              className="w-full rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Bot size={15} /> Summarise this lesson for me
            </button>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Try asking</div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={streaming}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-accent transition disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "" : ""}`}>
                <div className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center ${m.role === "user" ? "bg-muted text-foreground" : "bg-foreground text-background"}`}>
                  {m.role === "user" ? <User size={13} /> : <Sparkles size={13} />}
                </div>
                <div className={`flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-muted/60" : "bg-card border border-border"}`}>
                  {m.role === "assistant" && m.content === "" ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                    </div>
                  ) : (
                    <div className="prose-chat">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2 pt-1"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.length === 0 ? "Ask anything about this lesson…" : "Ask a follow-up…"}
            disabled={streaming}
            className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition"
            aria-label="Send"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  );
}
