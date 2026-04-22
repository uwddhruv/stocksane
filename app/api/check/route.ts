import { NextRequest, NextResponse } from "next/server";

const YAHOO_SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search";
// Used to compute week-over-week momentum from daily prices.
const WEEK_LOOKBACK_SECONDS = 7 * 24 * 60 * 60;

type StockData = {
  price: number;
  high52: number;
  low52: number;
  changePercent: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeSymbol(input: string): string {
  // Keep characters used by market data providers:
  // "." for exchange suffixes (RELIANCE.NS), "-" for share classes (BRK-B),
  // "^" for indices (^NSEI), and "=" for forex pairs (EURUSD=X).
  return input.toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "");
}

async function fetchChartForSymbol(symbol: string): Promise<StockData> {
  const yahooUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  yahooUrl.searchParams.set("interval", "1d");
  yahooUrl.searchParams.set("range", "1y");

  const res = await fetch(yahooUrl.toString(), {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) throw new Error("Yahoo Finance API error");

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta?.regularMarketPrice) throw new Error("No chart data");

  const closes: unknown[] = Array.isArray(result?.indicators?.quote?.[0]?.close) ? result.indicators.quote[0].close : [];
  const timestamps: unknown[] = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const entries: Array<{ close: number; timestamp: number }> = [];
  const pairCount = Math.min(closes.length, timestamps.length);
  for (let index = 0; index < pairCount; index += 1) {
    const close = closes[index];
    const timestamp = timestamps[index];
    if (typeof close === "number" && typeof timestamp === "number") {
      entries.push({ close, timestamp });
    }
  }
  const currentPrice = meta.regularMarketPrice;
  const latestTimestamp = entries.at(-1)?.timestamp ?? Math.floor(Date.now() / 1000);
  const targetTimestamp = latestTimestamp - WEEK_LOOKBACK_SECONDS;
  let weekAgoPrice = currentPrice;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].timestamp <= targetTimestamp) {
      weekAgoPrice = entries[i].close;
      break;
    }
  }
  const weekChange = weekAgoPrice > 0 ? ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100 : 0;

  return {
    price: currentPrice,
    high52: meta.fiftyTwoWeekHigh ?? currentPrice,
    low52: meta.fiftyTwoWeekLow ?? currentPrice,
    changePercent: weekChange,
  };
}

async function fetchStockData(symbol: string) {
  const safeSymbol = sanitizeSymbol(symbol);
  if (!safeSymbol) throw new Error("Invalid symbol");

  const candidateSymbols = [safeSymbol];
  if (/^[A-Z0-9]+$/.test(safeSymbol)) {
    candidateSymbols.push(`${safeSymbol}.NS`, `${safeSymbol}.BO`);
  }

  for (const candidate of candidateSymbols) {
    try {
      return await fetchChartForSymbol(candidate);
    } catch {
      // Try next candidate
    }
  }

  // Internal error code mapped to user-friendly messages in the POST catch block.
  throw new Error(`SYMBOL_DATA_UNAVAILABLE:${safeSymbol}`);
}

async function resolveSymbol(rawSymbol: string): Promise<string> {
  const trimmed = rawSymbol.trim();
  const direct = sanitizeSymbol(trimmed);
  if (direct && !trimmed.includes(" ")) {
    return direct;
  }

  const url = new URL(YAHOO_SEARCH_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("quotesCount", "10");
  url.searchParams.set("newsCount", "0");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error("SYMBOL_RESOLUTION_FAILED");

  const data = await res.json();
  const quote = data?.quotes?.find(
    (item: { quoteType?: string; symbol?: string }) =>
      (item.quoteType === "EQUITY" || item.quoteType === "ETF") && item.symbol
  );

  if (!quote?.symbol) throw new Error("SYMBOL_NOT_FOUND");
  return sanitizeSymbol(quote.symbol);
}

function formatSymbolForDisplay(input: string): string {
  const safe = sanitizeSymbol(input);
  if (!safe) return input.toUpperCase();
  const normalized = safe.replace(/\.NS$|\.BO$/, "");
  if (/^[A-Z0-9]+$/.test(normalized)) {
    return normalized;
  }
  return safe;
}

function runRuleEngine(
  stockData: { price: number; high52: number; low52: number; changePercent: number },
  amount: number,
  portfolioValue: number | null,
  riskLevel: string,
  symbol: string
): string[] {
  const warnings: string[] = [];

  // Rule 1: Near 52-week high (within 5%)
  const distFromHigh = (stockData.high52 - stockData.price) / stockData.high52;
  if (distFromHigh <= 0.05) {
    warnings.push(`This smells like FOMO 👀 — ${symbol} is trading near its 52-week high (₹${stockData.high52.toLocaleString("en-IN")}). You might be buying the top.`);
  }

  // Rule 2: Recent spike >10% in last week
  if (stockData.changePercent > 10) {
    warnings.push(`Riding the hype train 🚂 — ${symbol} is up ${stockData.changePercent.toFixed(1)}% recently. Chasing momentum is how retail investors get burned.`);
  }

  // Rule 3: >30% portfolio allocation
  if (portfolioValue && portfolioValue > 0) {
    const allocation = (amount / portfolioValue) * 100;
    if (allocation > 30) {
      warnings.push(`You're going too heavy on this one 💼 — ₹${amount.toLocaleString("en-IN")} is ${allocation.toFixed(0)}% of your portfolio. Diversification isn't just a buzzword.`);
    }
  }

  // Rule 4: No portfolio + large amount
  if (!portfolioValue && amount > 50000) {
    warnings.push(`Going in blind with big money 🙈 — You're putting in ₹${amount.toLocaleString("en-IN")} without telling us your portfolio size. Do you even know your allocation?`);
  }

  // Rule 5: Low risk user + high volatility stock
  const volatility = ((stockData.high52 - stockData.low52) / stockData.low52) * 100;
  if (riskLevel === "Low" && volatility > 40) {
    warnings.push(`This doesn't match your risk appetite 😬 — You said you're low-risk, but ${symbol} has swung ${volatility.toFixed(0)}% in the last year. That's not a calm ride.`);
  }

  // Rule 6: Rounded number (impulse buy vibes)
  if (amount % 1000 === 0) {
    warnings.push(`Impulse buy vibes 🤔 — ₹${amount.toLocaleString("en-IN")} is a suspiciously round number. Did you actually calculate this, or did you just pick a round figure?`);
  }

  return warnings;
}

function getVerdict(warnings: string[]): string {
  if (warnings.length === 0) return "Looks reasonable ✅";
  if (warnings.length <= 2) return "A bit risky ⚠️";
  return "High-risk decision 🚫";
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const payload = body;
    const symbol = typeof payload.symbol === "string" ? payload.symbol.trim() : "";
    if (!symbol || payload.amount == null) {
      return NextResponse.json({ error: "Symbol and amount are required" }, { status: 400 });
    }
    const amountValue = typeof payload.amount === "number" ? payload.amount : Number(payload.amount);
    const portfolioValue = payload.portfolioValue == null ? null : Number(payload.portfolioValue);
    const riskLevel = typeof payload.riskLevel === "string" ? payload.riskLevel : "Medium";
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }
    const normalizedPortfolioValue =
      portfolioValue != null && Number.isFinite(portfolioValue) && portfolioValue > 0 ? portfolioValue : null;

    const resolvedSymbol = await resolveSymbol(symbol);
    const stockData = await fetchStockData(resolvedSymbol);
    const displaySymbol = formatSymbolForDisplay(resolvedSymbol);
    const warnings = runRuleEngine(stockData, amountValue, normalizedPortfolioValue, riskLevel, displaySymbol);
    const verdict = getVerdict(warnings);

    return NextResponse.json({
      verdict,
      warnings,
      stockData: {
        symbol: displaySymbol,
        price: Math.round(stockData.price * 100) / 100,
        high52: Math.round(stockData.high52 * 100) / 100,
        low52: Math.round(stockData.low52 * 100) / 100,
        changePercent: Math.round(stockData.changePercent * 100) / 100,
      },
    });
  } catch (err) {
    console.error("API error:", err);
    const message = err instanceof Error ? err.message : "";
    if (message === "SYMBOL_NOT_FOUND") {
      return NextResponse.json({ error: "No matching stock was found. Please select a symbol from the dropdown." }, { status: 404 });
    }
    if (message.startsWith("SYMBOL_DATA_UNAVAILABLE:")) {
      return NextResponse.json({ error: "Live data is unavailable for this symbol right now. Please try another one." }, { status: 502 });
    }
    if (message === "SYMBOL_RESOLUTION_FAILED") {
      return NextResponse.json({ error: "Unable to resolve the stock symbol right now. Please try again shortly." }, { status: 502 });
    }
    return NextResponse.json({ error: "An unexpected error occurred. Please try again shortly." }, { status: 500 });
  }
}
