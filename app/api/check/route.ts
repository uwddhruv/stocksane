import { NextRequest, NextResponse } from "next/server";

const mockStocks: Record<string, { price: number; high52: number; low52: number; changePercent: number }> = {
  RELIANCE: { price: 2850, high52: 3024, low52: 2220, changePercent: 12.5 },
  TCS: { price: 3920, high52: 4255, low52: 3200, changePercent: 2.1 },
  INFY: { price: 1680, high52: 1953, low52: 1351, changePercent: -1.2 },
  WIPRO: { price: 520, high52: 620, low52: 380, changePercent: 5.3 },
  HDFC: { price: 1650, high52: 1794, low52: 1363, changePercent: 3.8 },
  ICICIBANK: { price: 1080, high52: 1196, low52: 872, changePercent: 9.1 },
  DEFAULT: { price: 1000, high52: 1200, low52: 700, changePercent: 8.0 },
};

async function fetchStockData(symbol: string) {
  try {
    // Sanitize symbol: allow only alphanumeric characters and dots
    const safeSymbol = symbol.replace(/[^A-Z0-9.]/g, "");
    if (!safeSymbol) throw new Error("Invalid symbol");
    const yahooUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(safeSymbol)}.NS`);
    yahooUrl.searchParams.set("interval", "1d");
    yahooUrl.searchParams.set("range", "1y");
    const res = await fetch(yahooUrl.toString(), {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("Yahoo Finance API error");
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error("No data");
    const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const recentCloses = closes.filter(Boolean).slice(-8);
    const weekAgoPrice = recentCloses[0] ?? meta.regularMarketPrice;
    const currentPrice = meta.regularMarketPrice;
    const weekChange = weekAgoPrice > 0 ? ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100 : 0;
    return {
      price: currentPrice,
      high52: meta.fiftyTwoWeekHigh ?? currentPrice * 1.2,
      low52: meta.fiftyTwoWeekLow ?? currentPrice * 0.8,
      changePercent: weekChange,
    };
  } catch {
    const mock = mockStocks[symbol] ?? mockStocks.DEFAULT;
    return mock;
  }
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
  // Flag amounts divisible by 5000, or divisible by 1000 but not 5000
  if (amount % 5000 === 0 || (amount % 1000 === 0 && amount % 5000 !== 0)) {
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
    const { symbol, amount, portfolioValue, riskLevel } = body;

    if (!symbol || !amount) {
      return NextResponse.json({ error: "Symbol and amount are required" }, { status: 400 });
    }

    const stockData = await fetchStockData(symbol);
    const warnings = runRuleEngine(stockData, amount, portfolioValue, riskLevel ?? "Medium", symbol);
    const verdict = getVerdict(warnings);

    return NextResponse.json({
      verdict,
      warnings,
      stockData: {
        symbol: symbol.toUpperCase(),
        price: Math.round(stockData.price * 100) / 100,
        high52: Math.round(stockData.high52 * 100) / 100,
        low52: Math.round(stockData.low52 * 100) / 100,
        changePercent: Math.round(stockData.changePercent * 100) / 100,
      },
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
