"use client";

import { useRef, useState } from "react";
import Link from "next/link";

interface CheckResult {
  verdict: string;
  warnings: string[];
  stockData: {
    symbol: string;
    price: number;
    high52: number;
    low52: number;
    changePercent: number;
  };
}

interface PastCheck {
  symbol: string;
  verdict: string;
  timestamp: string;
}

interface StockSuggestion {
  symbol: string;
  name: string;
  exchange: string;
}

const verdictColor = (verdict: string) => {
  if (verdict.includes("✅")) return "text-[#22c55e] border-[#22c55e]";
  if (verdict.includes("⚠️")) return "text-[#eab308] border-[#eab308]";
  return "text-[#ef4444] border-[#ef4444]";
};

const verdictBg = (verdict: string) => {
  if (verdict.includes("✅")) return "bg-green-950/30 border-green-900/30";
  if (verdict.includes("⚠️")) return "bg-yellow-950/30 border-yellow-900/30";
  return "bg-red-950/30 border-red-900/30";
};

export default function AppPage() {
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [portfolioValue, setPortfolioValue] = useState("");
  const [riskLevel, setRiskLevel] = useState("Medium");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState("");
  const [pastChecks, setPastChecks] = useState<PastCheck[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("stocksane_checks");
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [searchingStocks, setSearchingStocks] = useState(false);
  const [selectedStockLabel, setSelectedStockLabel] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setSearchingStocks(false);
      return;
    }

    setSearchingStocks(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) {
        setSuggestions(data.results);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setSearchingStocks(false);
    }
  };

  const handleSymbolInputChange = (nextValue: string) => {
    setSymbol(nextValue);
    const picked = suggestions.find((item) => item.symbol === nextValue);
    setSelectedStockLabel(picked ? `${picked.name} · ${picked.exchange}` : "");

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!nextValue.trim()) {
      setSuggestions([]);
      setSearchingStocks(false);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      void fetchSuggestions(nextValue);
    }, 250);
  };

  const savePastCheck = (sym: string, verdict: string) => {
    const newCheck: PastCheck = {
      symbol: sym.toUpperCase(),
      verdict,
      timestamp: new Date().toLocaleString("en-IN"),
    };
    const updated = [newCheck, ...pastChecks].slice(0, 5);
    setPastChecks(updated);
    localStorage.setItem("stocksane_checks", JSON.stringify(updated));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !amount) {
      setError("Please enter a stock symbol and amount.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.trim().toUpperCase(),
          amount: parseFloat(amount),
          portfolioValue: portfolioValue ? parseFloat(portfolioValue) : null,
          riskLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data);
      savePastCheck(symbol.trim(), data.verdict);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check trade");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setSymbol("");
    setAmount("");
    setPortfolioValue("");
    setRiskLevel("Medium");
    setSuggestions([]);
    setSelectedStockLabel("");
    setSearchingStocks(false);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#22c55e]">📊 StockSane</Link>
          <span className="text-slate-400 text-sm">Sanity check your trades</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold mb-2">Run a Sanity Check 🧠</h1>
          <p className="text-slate-400">Tell us about your trade. We&apos;ll be brutally honest.</p>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Stock Symbol / Name <span className="text-[#ef4444]">*</span>
              </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => handleSymbolInputChange(e.target.value)}
                  placeholder="Type and pick a stock (e.g. RELIANCE, AAPL)"
                  list="stock-symbol-suggestions"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#22c55e] transition-colors"
                />
                <datalist id="stock-symbol-suggestions">
                  {suggestions.map((item) => (
                    <option
                      key={`${item.symbol}-${item.exchange}`}
                      value={item.symbol}
                      label={`${item.name} · ${item.exchange}`}
                    />
                  ))}
                </datalist>
                <p className="mt-2 text-xs text-slate-500">
                  {searchingStocks
                    ? "Searching across 2000+ live market symbols..."
                    : selectedStockLabel || "Search and select from live suggestions to avoid typing full names."}
                </p>
              </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Amount you want to invest (₹) <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                min="1"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Total portfolio value (₹) <span className="text-slate-500 font-normal">(optional, for allocation check)</span>
              </label>
              <input
                type="number"
                value={portfolioValue}
                onChange={(e) => setPortfolioValue(e.target.value)}
                placeholder="e.g. 200000"
                min="1"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Your Risk Level</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e] transition-colors"
              >
                <option value="Low">🟢 Low — I prefer stable, boring investments</option>
                <option value="Medium">🟡 Medium — I can handle some ups and downs</option>
                <option value="High">🔴 High — I live for the thrill (and the losses)</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-800 rounded-xl p-3 text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#22c55e] text-black font-extrabold py-4 rounded-xl text-lg hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⚙️</span> Analyzing your trade...
                </>
              ) : (
                "🚀 Run Sanity Check"
              )}
            </button>
          </form>
        ) : (
          <div className="animate-fade-in">
            {/* Verdict */}
            <div className={`border-2 rounded-2xl p-6 mb-6 text-center ${verdictColor(result.verdict)}`}>
              <div className="text-6xl mb-3">
                {result.verdict.includes("✅") ? "✅" : result.verdict.includes("⚠️") ? "⚠️" : "🚫"}
              </div>
              <div className={`text-3xl font-extrabold ${verdictColor(result.verdict).split(" ")[0]}`}>
                {result.verdict}
              </div>
              <div className="text-slate-400 text-sm mt-2">
                for {result.stockData.symbol} · ₹{parseFloat(amount).toLocaleString("en-IN")}
              </div>
            </div>

            {/* Stock Info */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">📊 Stock Snapshot</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Price</p>
                  <p className="font-bold">₹{result.stockData.price.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">52W High</p>
                  <p className="font-bold">₹{result.stockData.high52.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">52W Low</p>
                  <p className="font-bold">₹{result.stockData.low52.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Change %</p>
                  <p className={`font-bold ${result.stockData.changePercent >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {result.stockData.changePercent >= 0 ? "+" : ""}{result.stockData.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-6">
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">🔴 Reality Check</p>
                <div className="space-y-3">
                  {result.warnings.map((w, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 rounded-lg p-3 border animate-slide-in ${verdictBg(result.verdict)}`}
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <span className="text-lg shrink-0">🚨</span>
                      <span className="text-sm text-slate-300">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.warnings.length === 0 && (
              <div className="bg-green-950/30 border border-green-900/30 rounded-2xl p-5 mb-6">
                <p className="text-[#22c55e] font-bold mb-1">✅ No red flags found!</p>
                <p className="text-slate-400 text-sm">This trade looks reasonably well thought out. Still do your own research though! 😄</p>
              </div>
            )}

            <button
              onClick={resetForm}
              className="w-full border border-slate-600 text-slate-300 rounded-xl py-3 text-sm hover:border-slate-400 hover:text-white transition-colors"
            >
              ↩ Check another trade
            </button>
          </div>
        )}

        {/* Past Checks */}
        {pastChecks.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold mb-4 text-slate-300">🕐 Past Checks</h2>
            <div className="space-y-3">
              {pastChecks.map((check, i) => (
                <div key={i} className="bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm">{check.symbol}</span>
                    <span className="text-slate-500 text-xs ml-3">{check.timestamp}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    check.verdict.includes("✅") ? "bg-green-950/50 text-[#22c55e]" :
                    check.verdict.includes("⚠️") ? "bg-yellow-950/50 text-[#eab308]" :
                    "bg-red-950/50 text-[#ef4444]"
                  }`}>
                    {check.verdict}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
