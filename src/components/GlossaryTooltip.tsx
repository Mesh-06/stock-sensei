import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const GLOSSARY: Record<string, string> = {
  RSI: "Relative Strength Index — momentum on a 0–100 scale. Above 70 = overbought, below 30 = oversold.",
  "P/E": "Price-to-Earnings ratio — how much investors pay per ₹1 of company earnings.",
  "P/E Ratio": "Price-to-Earnings ratio — how much investors pay per ₹1 of company earnings.",
  EPS: "Earnings Per Share — company's profit divided by the number of shares.",
  MACD: "Moving Average Convergence Divergence — a momentum indicator showing trend strength and direction.",
  SIP: "Systematic Investment Plan — investing a fixed amount in a mutual fund every month.",
  Demat: "Dematerialised account — holds your stocks electronically (like a bank account, but for shares).",
  NSE: "National Stock Exchange — India's largest stock exchange.",
  BSE: "Bombay Stock Exchange — Asia's oldest stock exchange.",
  SEBI: "Securities and Exchange Board of India — the regulator for the Indian capital markets.",
  ETF: "Exchange-Traded Fund — a basket of stocks that trades on an exchange like a single stock.",
  ROE: "Return on Equity — profit a company generates per ₹1 of shareholder equity.",
  ROCE: "Return on Capital Employed — profit per ₹1 of total capital used.",
  EBITDA: "Earnings Before Interest, Taxes, Depreciation and Amortisation — operating profit measure.",
  IPO: "Initial Public Offering — when a private company first sells shares to the public.",
  NAV: "Net Asset Value — per-unit value of a mutual fund.",
  "F&O": "Futures and Options — contracts that derive their value from an underlying stock or index.",
  Bullish: "Expecting prices to go up.",
  Bearish: "Expecting prices to go down.",
  "Market Cap": "Total value of a company = share price × total shares.",
  Volume: "Number of shares traded during a period.",
  "Bollinger Bands": "Volatility bands plotted around a moving average — wider = more volatile.",
  Sensex: "30-stock benchmark index of the BSE.",
  "Nifty 50": "50-stock benchmark index of the NSE.",
  Dividend: "Cash distribution from a company to its shareholders.",
  "Book Value": "What a company would be worth if liquidated = assets minus liabilities.",
};

export function GlossaryTooltip({ term, children }: { term: string; children?: ReactNode }) {
  const def = GLOSSARY[term];
  if (!def) return <>{children || term}</>;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="glossary-term">{children || term}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          <p className="font-semibold mb-1">{term}</p>
          <p>{def}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const GLOSSARY_TERMS = GLOSSARY;
