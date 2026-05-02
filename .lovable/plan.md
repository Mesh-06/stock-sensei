# StockSense AI — Build Plan

A full-stack Indian stock market education and analysis platform. Dark fintech aesthetic, real Yahoo Finance data, Gemini-powered AI tutor, full auth + persistence.

## 1. Foundation

**Design system** (`index.css` + `tailwind.config.ts`)
- Inter font from Google Fonts
- HSL color tokens for dark (default) and light themes; primary indigo→violet gradient, success green, danger red
- Custom utilities: `.gradient-primary`, `.gradient-text`, `.bg-success-muted`, `.bg-danger-muted`
- Animations: `fade-in`, `slide-up`, `pulse-slow`, marquee scroll for ticker
- Component primitives: rounded-2xl cards, gradient pill buttons, focus-ring inputs, badges
- ThemeContext (dark default, persists to localStorage + `profiles.theme` when logged in)

## 2. Backend (Lovable Cloud / Supabase)

**Database tables** (all with RLS — user sees only their own data):
- `profiles` — auto-created via trigger on signup; name, avatar_url, risk_appetite, preferred_sectors, notifications_enabled, theme
- `watchlist` — user_id, symbol, exchange (unique per user+symbol)
- `portfolio_holdings` — symbol, name, exchange, quantity, avg_price, current_price, purchased_at
- `price_alerts` — symbol, target_price, direction (above/below), triggered
- `chat_conversations` — title, timestamps
- `chat_messages` — conversation_id, role, content
- `stock_cache` *(added)* — symbol, exchange, action, payload (jsonb), updated_at; used as Yahoo fallback when live fetch fails

Trigger `handle_new_user()` inserts a profile row on `auth.users` insert.

**Edge function: `stocks`**
- Actions: `quote`, `history`, `search`, `news`
- Indian symbols get `.NS`/`.BO` suffix; global symbols pass through
- Calls Yahoo Finance chart, search, and news endpoints
- Computes RSI(14), SMA(50/200), MACD, Bollinger Bands from history
- Derives bullish/bearish/neutral trend from 4 signals + a 0–100 strength score
- On every successful quote/history, writes to `stock_cache`
- On Yahoo failure or rate-limit, serves last cached payload (with `stale: true` flag for the UI)
- Generates a short plain-language `aiExplanation` per stock from indicator state (no AI call needed for the basic explanation)
- CORS enabled, returns JSON, never throws

**Edge function: `chat`**
- Proxies SSE streaming to Google Gemini 1.5 Flash (your own `GEMINI_API_KEY` Supabase secret)
- System prompt = StockSense AI tutor persona (Indian markets focus, beginner-friendly, mandatory educational disclaimer, never gives buy/sell signals)
- Sends last 10 messages as context
- Translates OpenAI-style `messages` → Gemini `contents`, re-emits stream as `data: {"delta": "..."}` SSE chunks ending in `[DONE]`
- Handles abort, returns clean errors as SSE events

You'll be prompted to add `GEMINI_API_KEY` as a secret after the plan is approved.

## 3. Auth

- Email/password only, auto-confirm enabled (instant signup → login)
- Pages: `/login`, `/signup`, `/forgot-password`, `/reset-password`
- AuthContext with `onAuthStateChange` listener set up before `getSession()`
- `<ProtectedRoute>` wrapper for `/portfolio`, `/watchlist`, `/profile`
- Password strength meter on signup, password requirements checklist on reset
- LocalStorage → DB migration on login for anonymous price alerts

## 4. Pages

**`/` Home** — Hero with gradient background and large search; auto-scrolling market ticker (Sensex, Nifty 50, Bank Nifty, IT, Gold, USD/INR); "Your Watchlist" section if logged in; 6-card market overview grid with sparklines; 12 popular Indian stocks grid; 6 global stocks; features section; footer.

**`/stock/:symbol`** — The flagship page:
- Header with gradient initials, price, change badge, watchlist heart, price-alert bell, compare button
- Recharts AreaChart with green/red gradient fill, 1W/1M/3M/6M/1Y/5Y tabs
- Toggleable overlays: MA50, MA200, Bollinger Bands, Volume bars
- Price stats row, fundamentals row, 52-week range visual bar
- Three technical indicator cards (RSI with colored bar, MA position, MACD signal)
- "Should I Learn About This Stock?" deep analysis card with sentiment badge, 0–100 strength bar, 4-factor analyst summary, key levels table, mandatory disclaimer
- "Beginner Explanation" expandable plain-language card
- "Learn While You Invest" contextual lesson pills
- Similar stocks (same sector)
- Real Yahoo news feed (8 items, external links)

**`/chatbot`** — Three-column layout: conversation sidebar (CRUD on `chat_conversations`), main chat with markdown rendering (tables, code, lists), suggested-question pills on welcome state, true token-by-token streaming, Stop button (AbortController), 2000-char counter. Anonymous users get a "Sign in to save history" banner; chat still works.

**`/learn`** — 3 tracks (Beginner / Technical / Fundamental), 15 accordion lessons total with difficulty badges, durations, glossary tooltips, SVG diagrams for candlestick patterns and MA crossovers. Three inline interactive calculators:
- SIP Calculator (with Recharts bar chart)
- Position Size Calculator (1% rule)
- P/E Analyzer (vs industry average)

Per-lesson "Mark complete" → localStorage progress, "Ask AI about this" pre-fills chatbot. Glossary section with 40+ terms.

**`/compare`** — Up to 3 stocks side by side, 17-row comparison table with best-value highlighting, normalized overlay line chart with date-range tabs, "Generate AI Comparison Summary" button that streams Gemini output.

**`/portfolio`** *(login required)* — Summary cards (invested, current value, P&L, today's change), holdings table with inline edit, Add Holding modal with searchable stock dropdown, donut chart for stock allocation, bar chart for sector allocation, area chart for value over time. All persisted in DB.

**`/watchlist`** *(login required)* — Grid of watchlisted stock cards, add modal, remove buttons, empty state.

**`/sectors`** — 10 sectors (Banking, IT, Energy, FMCG, Pharma, Infra, Auto, Metals, Telecom, Aviation), each with description, sector index card, 6–9 key companies with live data, sector-specific metrics, beginner's guide accordion.

**`/profile`** — Avatar, editable name/email, member-since, stats, risk-appetite buttons, preferred-sectors chips, theme toggle, notification toggles, change password, CSV export of watchlist/portfolio, delete account.

**`/health`** — Diagnostic page: Supabase ✅/❌, stocks edge function ✅/❌, chat edge function ✅/❌, auth status.

## 5. Shared components & hooks

- **Navbar** — logo, nav links, compact search, theme toggle, notifications bell with triggered-alert badge, user avatar dropdown, mobile drawer
- **SearchBar** — debounced 300ms, live Yahoo suggestions, keyboard navigation, exchange badges
- **StockCard** — gradient initials, price, change badge, 7-day sparkline, watchlist heart
- **WatchlistButton**, **PriceAlertButton** (modal with current price + direction toggle), **NotificationsPanel**
- **GlossaryTooltip** — dotted underline + hover definition for terms like RSI, P/E, Demat, SIP
- **Skeleton loaders** for every data-fetching surface; thoughtful empty states; error states with retry; sonner toasts (bottom-right)
- Hooks: `useStock`, `useStockHistory`, `useWatchlist`, `usePortfolio`, `useChatHistory`, `useTheme`
- TanStack Query with 60s refetch on quotes
- Routes lazy-loaded with `React.lazy` + Suspense
- Mobile-first responsive; tested at 375px

## 6. Build order

1. Design system, theme, fonts, animations
2. DB schema + RLS + profile trigger
3. Auth pages + AuthContext + ProtectedRoute
4. `stocks` edge function with caching
5. Navbar, SearchBar, StockCard, glossary tooltip
6. Home page
7. Stock Detail page
8. `chat` edge function + Chatbot page
9. Learn page (lessons + calculators + glossary)
10. Compare page
11. Portfolio page
12. Watchlist page
13. Sectors page
14. Profile page + Notifications
15. Health page + final polish (loading/empty/error states, mobile pass)

## Technical notes

- Frontend never calls Yahoo or Gemini directly — always via edge functions
- `GEMINI_API_KEY` stored as Supabase secret (you'll add it after approval)
- Both edge functions run with `verify_jwt = false` (auth handled in code where needed)
- All user data in Supabase tables with RLS; localStorage only for theme + lesson progress + anonymous price alerts (migrated to DB on login)
- Yahoo cache table makes the demo resilient to rate limits — critical for a graded project

## Heads-up on scope

This is a very large single build (11 pages, 2 edge functions, 8 tables, 15 lessons with interactive calculators). I'll get everything functional and visually polished in the first pass, but expect a few targeted follow-up messages to refine specific sections (e.g., a particular calculator, a chart interaction, mobile tweaks on the comparison table). That's normal for a build this size and faster than trying to perfect everything in one shot.
