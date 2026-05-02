// Stock catalog: Indian + Global symbols and sector metadata.

export interface StockMeta {
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE" | "NASDAQ" | "NYSE";
  sector: string;
}

export const POPULAR_INDIAN: StockMeta[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", sector: "Energy" },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", sector: "IT" },
  { symbol: "INFY", name: "Infosys", exchange: "NSE", sector: "IT" },
  { symbol: "HDFCBANK", name: "HDFC Bank", exchange: "NSE", sector: "Banking" },
  { symbol: "WIPRO", name: "Wipro", exchange: "NSE", sector: "IT" },
  { symbol: "ITC", name: "ITC Limited", exchange: "NSE", sector: "FMCG" },
  { symbol: "ICICIBANK", name: "ICICI Bank", exchange: "NSE", sector: "Banking" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", exchange: "NSE", sector: "Banking" },
  { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", sector: "Banking" },
  { symbol: "TATAMOTORS", name: "Tata Motors", exchange: "NSE", sector: "Auto" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", exchange: "NSE", sector: "FMCG" },
  { symbol: "MARUTI", name: "Maruti Suzuki", exchange: "NSE", sector: "Auto" },
];

export const MORE_INDIAN: StockMeta[] = [
  { symbol: "TITAN", name: "Titan Company", exchange: "NSE", sector: "Consumer" },
  { symbol: "ADANIPORTS", name: "Adani Ports", exchange: "NSE", sector: "Infra" },
  { symbol: "LT", name: "Larsen & Toubro", exchange: "NSE", sector: "Infra" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", exchange: "NSE", sector: "Infra" },
  { symbol: "NESTLEIND", name: "Nestle India", exchange: "NSE", sector: "FMCG" },
  { symbol: "POWERGRID", name: "Power Grid Corp", exchange: "NSE", sector: "Energy" },
  { symbol: "NTPC", name: "NTPC Limited", exchange: "NSE", sector: "Energy" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", exchange: "NSE", sector: "Pharma" },
  { symbol: "DRREDDY", name: "Dr Reddy's Labs", exchange: "NSE", sector: "Pharma" },
  { symbol: "DIVISLAB", name: "Divi's Labs", exchange: "NSE", sector: "Pharma" },
  { symbol: "CIPLA", name: "Cipla", exchange: "NSE", sector: "Pharma" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", exchange: "NSE", sector: "Banking" },
  { symbol: "AXISBANK", name: "Axis Bank", exchange: "NSE", sector: "Banking" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", exchange: "NSE", sector: "Banking" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", exchange: "NSE", sector: "Telecom" },
  { symbol: "JSWSTEEL", name: "JSW Steel", exchange: "NSE", sector: "Metals" },
  { symbol: "TATASTEEL", name: "Tata Steel", exchange: "NSE", sector: "Metals" },
  { symbol: "HINDALCO", name: "Hindalco Industries", exchange: "NSE", sector: "Metals" },
  { symbol: "M&M", name: "Mahindra & Mahindra", exchange: "NSE", sector: "Auto" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", exchange: "NSE", sector: "Auto" },
  { symbol: "INDIGO", name: "InterGlobe Aviation", exchange: "NSE", sector: "Aviation" },
  { symbol: "DLF", name: "DLF Limited", exchange: "NSE", sector: "Infra" },
  { symbol: "HCLTECH", name: "HCL Technologies", exchange: "NSE", sector: "IT" },
  { symbol: "TECHM", name: "Tech Mahindra", exchange: "NSE", sector: "IT" },
];

export const ALL_INDIAN = [...POPULAR_INDIAN, ...MORE_INDIAN];

export const GLOBAL_STOCKS: StockMeta[] = [
  { symbol: "AAPL", name: "Apple Inc", exchange: "NASDAQ", sector: "Tech" },
  { symbol: "GOOGL", name: "Alphabet Inc", exchange: "NASDAQ", sector: "Tech" },
  { symbol: "MSFT", name: "Microsoft Corp", exchange: "NASDAQ", sector: "Tech" },
  { symbol: "TSLA", name: "Tesla Inc", exchange: "NASDAQ", sector: "Auto" },
  { symbol: "AMZN", name: "Amazon.com Inc", exchange: "NASDAQ", sector: "Tech" },
  { symbol: "META", name: "Meta Platforms", exchange: "NASDAQ", sector: "Tech" },
];

// Indices for the home market overview & ticker
export const INDICES = [
  { symbol: "^BSESN", name: "Sensex", display: "SENSEX" },
  { symbol: "^NSEI", name: "Nifty 50", display: "NIFTY 50" },
  { symbol: "^NSEBANK", name: "Bank Nifty", display: "BANK NIFTY" },
  { symbol: "^CNXIT", name: "Nifty IT", display: "NIFTY IT" },
  { symbol: "^CNXAUTO", name: "Nifty Auto", display: "NIFTY AUTO" },
  { symbol: "^CNXPHARMA", name: "Nifty Pharma", display: "NIFTY PHARMA" },
];

export const TICKER_ITEMS = [
  ...INDICES.slice(0, 4),
  { symbol: "GC=F", name: "Gold", display: "GOLD" },
  { symbol: "INR=X", name: "USD/INR", display: "USD/INR" },
];

// Sectors metadata
export const SECTORS = [
  {
    id: "banking",
    name: "Banking & Finance",
    icon: "🏛️",
    indexSymbol: "^NSEBANK",
    indexName: "Bank Nifty",
    description:
      "India's banking and financial services sector forms the backbone of the economy. It includes private banks, public sector banks, NBFCs (non-banking financial companies), and insurance companies. Key drivers are credit growth, interest rates set by the RBI, and asset quality (NPA ratios). The sector is highly sensitive to economic cycles.",
    drivers: ["RBI repo rate", "Credit growth %", "Net NPA ratio", "CASA ratio", "Net Interest Margin"],
    stocks: ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK", "BAJFINANCE", "INDUSINDBK"],
  },
  {
    id: "it",
    name: "Information Technology",
    icon: "💻",
    indexSymbol: "^CNXIT",
    indexName: "Nifty IT",
    description:
      "India's IT services sector serves global clients, primarily in the US and Europe. Revenue is largely in US dollars, so a weaker rupee benefits the sector. Watch for client spending trends, attrition rates, and large deal wins. Most companies are large-cap with healthy cash reserves and dividend payouts.",
    drivers: ["USD/INR rate", "US client spending", "Attrition %", "Operating margins", "Deal pipeline"],
    stocks: ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM"],
  },
  {
    id: "energy",
    name: "Energy & Power",
    icon: "⚡",
    indexSymbol: "^NSEI",
    indexName: "Nifty 50",
    description:
      "Covers oil & gas (Reliance, ONGC), power generation (NTPC, Tata Power), and transmission (Power Grid). Highly sensitive to crude oil prices, government policy, and infrastructure capex. Also includes the rapidly growing renewable energy segment.",
    drivers: ["Crude oil price", "Power demand", "Capex cycle", "Government tariffs"],
    stocks: ["RELIANCE", "NTPC", "POWERGRID"],
  },
  {
    id: "fmcg",
    name: "FMCG & Consumer",
    icon: "🛒",
    indexSymbol: "^NSEI",
    indexName: "Nifty 50",
    description:
      "Fast-moving consumer goods (FMCG) covers companies like HUL, Nestle, ITC. Defensive sector — demand is steady through economic cycles. Watch input costs (palm oil, agri commodities) and rural demand trends. P/E ratios are usually high (40-60x) due to brand power.",
    drivers: ["Rural demand", "Input costs", "Volume growth", "Premiumization"],
    stocks: ["HINDUNILVR", "ITC", "NESTLEIND", "TITAN"],
  },
  {
    id: "pharma",
    name: "Pharmaceuticals",
    icon: "💊",
    indexSymbol: "^CNXPHARMA",
    indexName: "Nifty Pharma",
    description:
      "Indian pharma companies are global generics powerhouses. Major export market is the US. Watch for USFDA inspections, patent expirations of branded drugs, and R&D pipelines. The sector is somewhat defensive but US pricing pressure can hurt margins.",
    drivers: ["USFDA approvals", "USD/INR", "R&D pipeline", "Generics pricing"],
    stocks: ["SUNPHARMA", "DRREDDY", "DIVISLAB", "CIPLA"],
  },
  {
    id: "infra",
    name: "Infrastructure & Real Estate",
    icon: "🏗️",
    indexSymbol: "^NSEI",
    indexName: "Nifty 50",
    description:
      "Construction, cement, capital goods, and real estate. Highly cyclical — does well when government capex is high (roads, railways, ports) and home loan rates are low. Watch order books and execution rates.",
    drivers: ["Govt. capex", "Home loan rates", "Cement demand", "Order book size"],
    stocks: ["LT", "ULTRACEMCO", "ADANIPORTS", "DLF"],
  },
  {
    id: "auto",
    name: "Automobiles",
    icon: "🚗",
    indexSymbol: "^CNXAUTO",
    indexName: "Nifty Auto",
    description:
      "Two-wheelers, passenger vehicles, commercial vehicles, and tractors. Cyclical sector — strong during economic upswings, weak during slowdowns. Watch monthly sales numbers, fuel prices, and the EV transition.",
    drivers: ["Monthly sales volume", "Fuel prices", "EV adoption", "Rural demand"],
    stocks: ["MARUTI", "TATAMOTORS", "M&M", "BAJAJ-AUTO"],
  },
  {
    id: "metals",
    name: "Metals & Mining",
    icon: "🔩",
    indexSymbol: "^NSEI",
    indexName: "Nifty 50",
    description:
      "Steel, aluminium, copper, and iron ore producers. Highly cyclical — prices follow global commodity cycles closely. Watch China demand (biggest consumer of metals globally) and global PMI data.",
    drivers: ["China demand", "Global PMI", "Commodity prices", "Capacity utilization"],
    stocks: ["TATASTEEL", "JSWSTEEL", "HINDALCO"],
  },
  {
    id: "telecom",
    name: "Telecom & Media",
    icon: "📡",
    indexSymbol: "^NSEI",
    indexName: "Nifty 50",
    description:
      "Telecom in India is now a 3-player market (Jio, Airtel, Vi). Watch ARPU (average revenue per user) and 5G capex. Margins were under pressure for years but are now recovering.",
    drivers: ["ARPU trends", "Subscriber additions", "5G capex", "Spectrum costs"],
    stocks: ["BHARTIARTL", "RELIANCE"],
  },
  {
    id: "aviation",
    name: "Aviation & Tourism",
    icon: "✈️",
    indexSymbol: "^NSEI",
    indexName: "Nifty 50",
    description:
      "Airlines and travel-related companies. IndiGo dominates Indian aviation. Highly sensitive to crude oil prices (jet fuel = 30-40% of cost) and travel demand. Asset-heavy and often loss-making historically.",
    drivers: ["Jet fuel prices", "Passenger load factor", "Yields per seat-km", "Travel demand"],
    stocks: ["INDIGO"],
  },
];

// Get sector for a symbol
export function getSector(symbol: string): string {
  const meta = ALL_INDIAN.find((s) => s.symbol === symbol);
  return meta?.sector || "Other";
}

export function getSimilarStocks(symbol: string, limit = 3): StockMeta[] {
  const sector = getSector(symbol);
  return ALL_INDIAN.filter((s) => s.sector === sector && s.symbol !== symbol).slice(0, limit);
}
