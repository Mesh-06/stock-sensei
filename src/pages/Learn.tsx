import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BookOpen, ChevronRight, Calculator, Search, GraduationCap, Sparkles } from "lucide-react";

interface Lesson {
  id: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  title: string;
  summary: string;
  body: string[];
  takeaways: string[];
}

const LESSONS: Lesson[] = [
  {
    id: "what-is-stock",
    level: "Beginner",
    title: "What is a Stock?",
    summary: "Understand share ownership and how the market works.",
    body: [
      "A stock (or share) represents partial ownership in a company. When you buy 1 share of Reliance, you literally own a tiny slice of the business.",
      "Companies issue stocks to raise capital. In return, shareholders get two potential rewards: capital appreciation (price goes up) and dividends (a cut of profits).",
      "Stocks trade on exchanges like NSE and BSE in India. Prices move every second based on demand, supply, news, earnings, and market sentiment.",
    ],
    takeaways: [
      "A share = a tiny ownership stake in a company",
      "Returns come from price appreciation + dividends",
      "Indian stocks trade on NSE and BSE",
    ],
  },
  {
    id: "nse-vs-bse",
    level: "Beginner",
    title: "NSE vs BSE — What's the Difference?",
    summary: "Learn about India's two main stock exchanges.",
    body: [
      "BSE (Bombay Stock Exchange) was founded in 1875 — Asia's oldest. NSE (National Stock Exchange) was founded in 1992 and pioneered electronic trading in India.",
      "NSE has higher trading volumes and is preferred for most active stocks. BSE lists more total companies (~5000+) but many are small caps.",
      "The benchmark indices are the BSE Sensex (top 30 companies) and NSE Nifty 50 (top 50 companies). Both move similarly day-to-day.",
    ],
    takeaways: [
      "NSE = higher volume, faster execution",
      "BSE = older, more listings, Sensex index",
      "You can buy the same stock on either exchange",
    ],
  },
  {
    id: "market-cap",
    level: "Beginner",
    title: "Market Cap — Large, Mid, Small",
    summary: "How company size affects risk and return.",
    body: [
      "Market Capitalization = Share Price × Total Shares Outstanding. It's the total value the market assigns to a company.",
      "SEBI classifies: Large-cap = top 100 companies (₹20,000+ Cr), Mid-cap = ranks 101–250, Small-cap = rank 251+.",
      "Large-caps are more stable, slower growth. Small-caps are riskier but can grow faster. Most beginners should start with large-caps.",
    ],
    takeaways: [
      "Large-cap = stable, lower returns, lower risk",
      "Small-cap = higher growth potential, higher volatility",
      "Diversify across sizes for balance",
    ],
  },
  {
    id: "pe-ratio",
    level: "Intermediate",
    title: "P/E Ratio — Is a Stock Expensive?",
    summary: "The most popular valuation metric explained simply.",
    body: [
      "P/E (Price-to-Earnings) = Share Price ÷ Earnings Per Share (EPS). It tells you how many years of current earnings you're paying for.",
      "Example: If TCS trades at ₹3500 and EPS is ₹125, P/E = 28. You're paying ₹28 for every ₹1 the company earns annually.",
      "Compare P/E to: (1) the company's historical average, (2) sector peers, (3) the broader market (Nifty P/E ~22). High P/E can mean over-valued OR strong growth ahead.",
    ],
    takeaways: [
      "Lower P/E = cheaper relative to earnings",
      "Always compare within the same sector",
      "Don't use P/E alone — pair with growth and debt",
    ],
  },
  {
    id: "rsi",
    level: "Intermediate",
    title: "RSI — Is a Stock Overbought?",
    summary: "A momentum indicator from 0 to 100.",
    body: [
      "RSI (Relative Strength Index) measures the speed and change of price movements over the last 14 days. It oscillates between 0 and 100.",
      "RSI > 70 = Overbought (price may correct soon). RSI < 30 = Oversold (potential bounce). RSI between 40–60 = Neutral.",
      "RSI is a tool, not a signal. A stock can stay overbought for weeks during a strong uptrend. Combine with trend and volume.",
    ],
    takeaways: [
      "RSI > 70 → Overbought zone",
      "RSI < 30 → Oversold zone",
      "Best used to confirm, not lead, decisions",
    ],
  },
  {
    id: "moving-averages",
    level: "Intermediate",
    title: "Moving Averages — 50 DMA & 200 DMA",
    summary: "Smooth out noise and spot the real trend.",
    body: [
      "A Moving Average (MA) is the average closing price over the last N days. The 50-day MA shows the medium-term trend; the 200-day MA shows the long-term trend.",
      "If price > 200 DMA → long-term uptrend. If price < 200 DMA → long-term weakness.",
      "When the 50 DMA crosses ABOVE the 200 DMA, it's called a 'Golden Cross' (bullish). When it crosses BELOW, it's a 'Death Cross' (bearish).",
    ],
    takeaways: [
      "50 DMA = medium-term trend; 200 DMA = long-term",
      "Golden Cross is bullish, Death Cross is bearish",
      "MAs act as dynamic support/resistance levels",
    ],
  },
  {
    id: "macd",
    level: "Intermediate",
    title: "MACD — Trend & Momentum Together",
    summary: "Combines two moving averages to spot trend changes.",
    body: [
      "MACD = (12-day EMA) − (26-day EMA). The Signal line is a 9-day EMA of MACD itself.",
      "When MACD crosses ABOVE the Signal → bullish momentum. When MACD crosses BELOW → bearish momentum.",
      "Best used alongside volume and the broader trend. Crossovers near the zero line are stronger than those far away.",
    ],
    takeaways: [
      "MACD above Signal → bullish",
      "MACD below Signal → bearish",
      "Crossovers near zero are most reliable",
    ],
  },
  {
    id: "bollinger",
    level: "Advanced",
    title: "Bollinger Bands — Volatility Map",
    summary: "Bands that expand and contract with market volatility.",
    body: [
      "Bollinger Bands = a 20-day moving average plus/minus 2 standard deviations. They expand in volatile markets and squeeze when things calm down.",
      "Price touching the UPPER band = strong momentum or overbought. Price touching the LOWER band = weakness or oversold.",
      "A 'squeeze' (bands very tight) often precedes a big breakout move — direction unknown until it happens.",
    ],
    takeaways: [
      "Upper band touch → strong/overbought",
      "Lower band touch → weak/oversold",
      "A squeeze precedes a volatility expansion",
    ],
  },
  {
    id: "diversification",
    level: "Beginner",
    title: "Diversification — Don't Put All Eggs in One Basket",
    summary: "The single biggest free lunch in investing.",
    body: [
      "Diversification means spreading your money across different stocks, sectors, and asset classes so a single bad bet doesn't wipe you out.",
      "A simple rule: no single stock > 10% of your portfolio. Across at least 3-4 sectors. Mix large-caps with some mid-caps if you have appetite for risk.",
      "Add other assets too: gold (5–10%), debt funds, and international exposure via Nasdaq ETFs to balance Indian-only risk.",
    ],
    takeaways: [
      "Cap individual stocks at ~10% of portfolio",
      "Spread across 3-4+ sectors",
      "Add gold, debt, and global exposure",
    ],
  },
  {
    id: "sip",
    level: "Beginner",
    title: "SIP — Systematic Investment Plan",
    summary: "The disciplined way to build wealth slowly.",
    body: [
      "SIP means investing a fixed amount every month into the same stock or mutual fund — regardless of market level.",
      "It enforces discipline, removes the need to time the market, and uses 'rupee cost averaging' — you buy more units when prices are low, fewer when high.",
      "Even ₹5,000/month at 12% annual return becomes ~₹50 lakh in 20 years thanks to compounding.",
    ],
    takeaways: [
      "Invest a fixed amount every month",
      "Reduces timing risk via rupee cost averaging",
      "Compounding does the heavy lifting over time",
    ],
  },
  {
    id: "compounding",
    level: "Beginner",
    title: "The Power of Compounding",
    summary: "Why time is the most important factor in investing.",
    body: [
      "Compounding = earning returns on your returns. Year 1: ₹100 → ₹112. Year 2: ₹112 → ₹125. The base keeps growing.",
      "Rule of 72: divide 72 by your annual return to find how many years to double money. At 12%, money doubles in 6 years.",
      "Starting at age 25 vs 35 with the same monthly amount can mean 3x more wealth at 60. Time matters more than amount.",
    ],
    takeaways: [
      "Start early — time is your biggest ally",
      "Rule of 72: years to double = 72 ÷ rate",
      "Don't break compounding — let it run",
    ],
  },
  {
    id: "stop-loss",
    level: "Intermediate",
    title: "Stop-Loss — Protecting Your Capital",
    summary: "The first rule: don't lose money.",
    body: [
      "A stop-loss is a pre-set price at which you exit a losing trade automatically. It caps your downside.",
      "Common rule: never risk more than 1–2% of your total portfolio on a single trade. Set the stop based on technical levels (below support) or a fixed % (e.g., 8% below entry).",
      "Discipline matters more than the exact level. Honour your stops — don't move them down hoping the stock recovers.",
    ],
    takeaways: [
      "Pre-define your exit before entering",
      "Risk 1–2% of portfolio per trade",
      "Never move a stop-loss against you",
    ],
  },
  {
    id: "fundamental-vs-technical",
    level: "Intermediate",
    title: "Fundamental vs Technical Analysis",
    summary: "Two schools of thought — and how to combine them.",
    body: [
      "Fundamental Analysis: studies the business — revenue, profit, debt, management, sector outlook. Best for long-term investing.",
      "Technical Analysis: studies the price chart — trends, indicators, patterns. Best for short-to-medium term timing.",
      "Smart investors use BOTH: fundamentals decide WHAT to buy; technicals decide WHEN to buy.",
    ],
    takeaways: [
      "Fundamentals = WHAT (the business)",
      "Technicals = WHEN (the timing)",
      "Use both for stronger decisions",
    ],
  },
  {
    id: "ipo",
    level: "Intermediate",
    title: "What is an IPO?",
    summary: "How private companies go public.",
    body: [
      "An IPO (Initial Public Offering) is when a private company first sells shares to the public via a stock exchange.",
      "Investors apply during a 3-day window. Allotment is via lottery for retail (under ₹2 lakh applications). Shares list on the exchange ~1 week later.",
      "Read the Red Herring Prospectus (RHP) before applying — check valuation, growth, debt, and 'Why is the company going public?' (raising fresh capital is good; only existing shareholders selling is a yellow flag).",
    ],
    takeaways: [
      "Read the RHP before applying",
      "Retail allotment is lottery-based",
      "Listing day price = pure sentiment, not value",
    ],
  },
  {
    id: "behavioral",
    level: "Advanced",
    title: "Behavioural Mistakes Beginners Make",
    summary: "The market doesn't beat you — your emotions do.",
    body: [
      "FOMO buying at all-time highs after seeing headlines. Panic selling at the bottom during corrections. Anchoring to your buy price instead of current value.",
      "Confirmation bias: only reading news that supports your existing position. Overconfidence after a few wins.",
      "Cure: have a written plan, journal every trade, automate via SIPs, and review monthly — not hourly.",
    ],
    takeaways: [
      "Have a written investment plan",
      "Automate to remove emotion (SIPs)",
      "Review monthly, not minute-by-minute",
    ],
  },
];

function SipCalculator() {
  const [monthly, setMonthly] = useState(5000);
  const [years, setYears] = useState(15);
  const [rate, setRate] = useState(12);
  const result = useMemo(() => {
    const months = years * 12;
    const r = rate / 100 / 12;
    const fv = monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
    const invested = monthly * months;
    const gains = fv - invested;
    return { fv, invested, gains };
  }, [monthly, years, rate]);
  const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="font-bold">SIP Calculator</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground">Monthly (₹)</label>
          <input type="number" value={monthly} onChange={(e) => setMonthly(+e.target.value || 0)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Years</label>
          <input type="number" value={years} onChange={(e) => setYears(+e.target.value || 0)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Annual return %</label>
          <input type="number" value={rate} onChange={(e) => setRate(+e.target.value || 0)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Invested" value={fmt(result.invested)} />
        <Stat label="Est. Gains" value={fmt(result.gains)} accent="success" />
        <Stat label="Future Value" value={fmt(result.fv)} accent="primary" />
      </div>
    </div>
  );
}

function PositionSizeCalculator() {
  const [capital, setCapital] = useState(100000);
  const [riskPct, setRiskPct] = useState(2);
  const [entry, setEntry] = useState(500);
  const [stop, setStop] = useState(460);
  const result = useMemo(() => {
    const riskRupees = (capital * riskPct) / 100;
    const perShare = Math.max(entry - stop, 0.01);
    const qty = Math.floor(riskRupees / perShare);
    const exposure = qty * entry;
    return { riskRupees, qty, exposure };
  }, [capital, riskPct, entry, stop]);
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="font-bold">Position Size Calculator</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Capital (₹)" value={capital} setter={setCapital} />
        <Field label="Risk per trade %" value={riskPct} setter={setRiskPct} />
        <Field label="Entry price (₹)" value={entry} setter={setEntry} />
        <Field label="Stop-loss price (₹)" value={stop} setter={setStop} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Max risk" value={"₹" + Math.round(result.riskRupees).toLocaleString("en-IN")} />
        <Stat label="Quantity" value={result.qty.toString()} accent="primary" />
        <Stat label="Exposure" value={"₹" + Math.round(result.exposure).toLocaleString("en-IN")} accent="success" />
      </div>
    </div>
  );
}

function PERatioCalculator() {
  const [price, setPrice] = useState(3500);
  const [eps, setEps] = useState(125);
  const pe = useMemo(() => (eps > 0 ? price / eps : 0), [price, eps]);
  const verdict =
    pe === 0 ? "Enter EPS" : pe < 15 ? "Cheap zone (verify quality)" : pe < 30 ? "Fairly valued" : pe < 50 ? "Premium pricing" : "Very expensive — needs strong growth";
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="font-bold">P/E Ratio Calculator</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Share price (₹)" value={price} setter={setPrice} />
        <Field label="EPS (₹)" value={eps} setter={setEps} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Stat label="P/E Ratio" value={pe.toFixed(2)} accent="primary" />
        <Stat label="Verdict" value={verdict} />
      </div>
    </div>
  );
}

function Field({ label, value, setter }: { label: string; value: number; setter: (n: number) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input type="number" value={value} onChange={(e) => setter(+e.target.value || 0)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "primary" | "success" }) {
  const cls = accent === "primary" ? "text-primary" : accent === "success" ? "text-success" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-extrabold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

export default function Learn() {
  const [active, setActive] = useState<Lesson | null>(null);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<"All" | Lesson["level"]>("All");

  const filtered = LESSONS.filter(
    (l) =>
      (level === "All" || l.level === level) &&
      (query === "" || l.title.toLowerCase().includes(query.toLowerCase()) || l.summary.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="gradient-hero">
        <div className="mx-auto max-w-6xl px-4 lg:px-6 pt-14 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium backdrop-blur">
            <GraduationCap className="h-3.5 w-3.5 text-primary" /> Free Learning · 15 Lessons
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Learn the <span className="gradient-text">Indian Stock Market</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            From "What is a stock?" to advanced indicators — bite-sized lessons plus interactive calculators.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 lg:px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lessons…"
              className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(["All", "Beginner", "Intermediate", "Advanced"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`rounded-xl px-3 py-2 text-xs font-medium border transition ${level === l ? "gradient-primary text-white border-transparent" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <button
              key={l.id}
              onClick={() => setActive(l)}
              className="text-left rounded-2xl border border-border bg-card p-5 shadow-card hover:border-primary/40 hover:shadow-glow transition group"
            >
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${l.level === "Beginner" ? "bg-success/15 text-success" : l.level === "Intermediate" ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger"}`}>
                  {l.level}
                </span>
                <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
              </div>
              <h3 className="mt-3 font-bold leading-tight">{l.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{l.summary}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Read lesson <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight">Interactive Calculators</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <SipCalculator />
            <PositionSizeCalculator />
            <PERatioCalculator />
          </div>
        </div>
      </section>

      {active && (
        <div
          onClick={() => setActive(null)}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-card animate-slide-up"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${active.level === "Beginner" ? "bg-success/15 text-success" : active.level === "Intermediate" ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger"}`}>
                  {active.level}
                </span>
                <h3 className="mt-2 text-2xl font-extrabold tracking-tight">{active.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{active.summary}</p>
              </div>
              <button onClick={() => setActive(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-relaxed text-foreground/90">
              {active.body.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Key Takeaways</div>
              <ul className="space-y-1.5 text-sm">
                {active.takeaways.map((t, i) => (
                  <li key={i} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
