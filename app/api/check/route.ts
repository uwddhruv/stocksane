import { NextRequest, NextResponse } from "next/server";

const YAHOO_SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search";

type StockData = {
  price: number;
  high52: number;
  low52: number;
  changePercent: number;
};

function sanitizeSymbol(input: string): string {
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

  const closes: number[] = result?.indicators?.quote?.[0]?.close ?? [];
  const recentCloses = closes.filter((price: unknown): price is number => typeof price === "number").slice(-8);
  const weekAgoPrice = recentCloses[0] ?? meta.regularMarketPrice;
  const currentPrice = meta.regularMarketPrice;
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
  if (!safeSymbol.includes(".") && !safeSymbol.includes("=")) {
    candidateSymbols.push(`${safeSymbol}.NS`, `${safeSymbol}.BO`);
  }

  for (const candidate of candidateSymbols) {
    try {
      return await fetchChartForSymbol(candidate);
    } catch {
      // Try next candidate
    }
  }

  throw new Error("Could not fetch stock data");
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
  if (!res.ok) throw new Error("Could not resolve symbol");

  const data = await res.json();
  const quote = data?.quotes?.find(
    (item: { quoteType?: string; symbol?: string }) =>
      (item.quoteType === "EQUITY" || item.quoteType === "ETF") && item.symbol
  );

  if (!quote?.symbol) throw new Error("No matching stock found");
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
    const body = await req.json();
    const { symbol, amount, portfolioValue, riskLevel } = body as {
      symbol?: string;
      amount?: number;
      portfolioValue?: number | null;
      riskLevel?: string;
    };

    if (!symbol || !amount) {
      return NextResponse.json({ error: "Symbol and amount are required" }, { status: 400 });
    }

    const resolvedSymbol = await resolveSymbol(symbol);
    const stockData = await fetchStockData(resolvedSymbol);
    const displaySymbol = formatSymbolForDisplay(resolvedSymbol);
    const warnings = runRuleEngine(stockData, amount, portfolioValue ?? null, riskLevel ?? "Medium", displaySymbol);
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
    return NextResponse.json({ error: "Couldn't fetch live market data for this stock." }, { status: 500 });
  }
}
