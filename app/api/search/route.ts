import { NextRequest, NextResponse } from "next/server";

const YAHOO_SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search";

type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  quoteType?: string;
};

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = new URL(YAHOO_SEARCH_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("quotesCount", "20");
    url.searchParams.set("newsCount", "0");
    url.searchParams.set("enableFuzzyQuery", "true");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error("Search API request failed");

    const data = await res.json();
    const quotes: YahooQuote[] = Array.isArray(data?.quotes) ? data.quotes : [];

    const results = quotes
      .filter((quote) => quote.symbol && (quote.quoteType === "EQUITY" || quote.quoteType === "ETF"))
      .map((quote) => ({
        symbol: quote.symbol,
        name: quote.shortname ?? quote.longname ?? quote.symbol,
        exchange: quote.exchDisp ?? "Unknown Exchange",
      }))
      .slice(0, 20);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
