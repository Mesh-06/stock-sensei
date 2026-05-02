// StockSense AI — Chat edge function
// Streams Google Gemini 1.5 Flash via SSE.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are StockSense AI, a friendly stock market tutor for Indian and global investors.

Your expertise covers:
- Indian markets: NSE, BSE, Nifty 50, Sensex, SEBI regulations, Demat accounts, SIPs, mutual funds, IPOs, F&O
- Global markets: NYSE, NASDAQ, S&P 500, Dow Jones
- Technical analysis: RSI, MACD, Bollinger Bands, Moving Averages, candlestick patterns, support/resistance
- Fundamental analysis: P/E ratio, P/B ratio, ROE, ROCE, EPS, Debt-to-Equity, current ratio, free cash flow
- Investment strategies: value investing, growth investing, index investing, SIP strategy, asset allocation
- Risk management: diversification, stop-loss, position sizing, the 1% rule, emergency fund

Guidelines:
- Use simple, beginner-friendly language with concrete rupee examples
- Use markdown: **bold**, bullet lists, tables, \`ticker symbols\`, ## headings
- Use emojis sparingly: 📈 📉 💡 ⚠️
- For specific stocks: share educational context (company overview, sector, key ratios) but ALWAYS add a disclaimer
- DISCLAIMER to always include: "⚠️ This is educational information only, not investment advice. Consult a SEBI-registered advisor."
- Never promise returns or give buy/sell signals
- For off-topic questions, politely redirect to finance/investing
- Keep responses skimmable: short paragraphs, bullet points, clear structure
- If asked about a specific Indian stock: mention its sector, approximate market cap category (large/mid/small cap), and what the company does
- Explain technical terms inline (e.g., "RSI (Relative Strength Index) — measures momentum on a scale of 0-100")`;

interface Msg { role: "user" | "assistant" | "system"; content: string }

function toGeminiContents(messages: Msg[]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { messages = [] } = await req.json();
    // Keep the last 10 messages for context
    const recent: Msg[] = messages.slice(-10);

    const contents = toGeminiContents(recent);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      console.error("Gemini error:", upstream.status, errText);
      return new Response(JSON.stringify({ error: `Gemini error ${upstream.status}` }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Re-emit Gemini SSE as our own simple SSE: data: {"delta": "..."} ... data: [DONE]
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buf = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buf.indexOf("\n")) !== -1) {
              let line = buf.slice(0, nl);
              buf = buf.slice(nl + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (!json) continue;
              try {
                const obj = JSON.parse(json);
                const text = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
                }
              } catch (_) { /* partial chunk */ }
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } catch (e) {
          console.error("stream err:", e);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "stream interrupted" })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...cors,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("chat error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
