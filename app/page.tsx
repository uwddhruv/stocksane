"use client";

import Link from "next/link";

export default function Home() {
  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-[#22c55e]">📊 StockSane</span>
          <div className="flex gap-4 items-center">
            <a href="#how-it-works" className="text-slate-400 hover:text-white text-sm transition-colors">How it works</a>
            <Link href="/app" className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded-lg text-sm hover:bg-green-400 transition-colors">
              Try it free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="inline-block bg-yellow-500/10 text-yellow-400 text-sm font-semibold px-3 py-1 rounded-full mb-6 border border-yellow-500/20">
            🔥 For retail investors who want to stop losing money
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
            Don&apos;t lose money making{" "}
            <span className="text-[#ef4444]">dumb stock</span> decisions.
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto">
            StockSane checks your trade before you hit buy. Get instant red flags, FOMO alerts, and a reality check — in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/app"
              className="bg-[#22c55e] text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-green-400 transition-all hover:scale-105 animate-pulse-glow"
            >
              🚀 Run a Sanity Check
            </Link>
            <button
              onClick={scrollToHowItWorks}
              className="border border-slate-600 text-white font-bold px-8 py-4 rounded-xl text-lg hover:border-slate-400 transition-all hover:scale-105"
            >
              See how it works ↓
            </button>
          </div>
        </div>
      </section>

      {/* Pain Section */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#eab308]">Sound familiar? 😬</h2>
          <p className="text-slate-400 text-lg mb-12">We&apos;ve all been here. Don&apos;t pretend you haven&apos;t.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { emoji: "📈", title: "Buying after a pump", desc: "Stock already up 40%? Sure, let's buy now. What could go wrong." },
              { emoji: "💸", title: "Going all-in on a hot tip", desc: "Your cousin said it's the next Tesla. Put your whole portfolio in." },
              { emoji: "🐑", title: "Pure hype investing", desc: "Twitter is buzzing, Reddit is mooning it. Time to YOLO in!" },
            ].map((item) => (
              <div key={item.title} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 text-left hover:border-red-500/50 transition-colors">
                <div className="text-4xl mb-3">{item.emoji}</div>
                <h3 className="text-lg font-bold mb-2 text-[#ef4444]">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-2xl font-bold text-slate-300">We&apos;ve all done this. 😅<br /><span className="text-[#22c55e]">StockSane helps you stop.</span></p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How it works</h2>
          <p className="text-center text-slate-400 mb-14 text-lg">Three steps. Zero BS. Pure honesty.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", emoji: "📝", title: "Enter your trade", desc: "Tell us what you're thinking of buying, how much, and your risk appetite." },
              { step: "02", emoji: "🔍", title: "We analyze behavior", desc: "We check live stock data and run behavioral analysis against your inputs." },
              { step: "03", emoji: "🚨", title: "Get instant red flags", desc: "We call out FOMO, overexposure, bad timing, and other classic mistakes." },
            ].map((item) => (
              <div key={item.step} className="relative pt-6">
                <div className="text-6xl font-extrabold text-slate-800 absolute top-0 left-0">{item.step}</div>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 pt-8 hover:border-[#22c55e]/50 transition-colors">
                  <div className="text-3xl mb-3">{item.emoji}</div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Output Card */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">See it in action</h2>
          <p className="text-slate-400 mb-10 text-lg">Here&apos;s what a typical sanity check looks like</p>
          <div className="bg-slate-800 border border-[#ef4444] rounded-2xl p-6 text-left shadow-2xl shadow-red-900/20">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🚫</span>
              <div>
                <div className="text-sm text-slate-400">Verdict for RELIANCE</div>
                <div className="text-2xl font-extrabold text-[#ef4444]">High-risk decision 🚫</div>
              </div>
            </div>
            <div className="border-t border-slate-700 pt-4 mt-4">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">🔴 Reality Check</p>
              <div className="space-y-3">
                {[
                  { icon: "👀", text: "This smells like FOMO — stock is trading near its 52-week high" },
                  { icon: "💼", text: "You're going too heavy on this one — over 40% of your portfolio" },
                  { icon: "🚂", text: "Riding the hype train — stock jumped 12% in the last week" },
                ].map((warning, i) => (
                  <div key={i} className="flex gap-3 bg-red-950/30 border border-red-900/30 rounded-lg p-3">
                    <span className="text-lg">{warning.icon}</span>
                    <span className="text-sm text-slate-300">{warning.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="w-full border border-slate-600 text-slate-300 rounded-lg py-2 text-sm text-center">
                ↩ Check another trade
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">Other apps vs StockSane</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-slate-400 mb-4">�� Other stock apps</h3>
              <ul className="space-y-3">
                {["Endless charts and candles", "Confusing technical jargon", "Data overload, no direction", "P/E ratios you'll never use", "Just more noise"].map((item) => (
                  <li key={item} className="flex gap-2 text-slate-400 text-sm"><span className="text-[#ef4444]">✗</span>{item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-green-950/30 border border-[#22c55e]/40 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-[#22c55e] mb-4">✅ StockSane</h3>
              <ul className="space-y-3">
                {["Simple, plain-English analysis", "Behavioral bias detection", "Instant red flags", "No learning curve", "Brutally honest — like a friend who knows finance"].map((item) => (
                  <li key={item} className="flex gap-2 text-slate-300 text-sm"><span className="text-[#22c55e]">✓</span>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">What people are saying</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Priya M.", handle: "@priya_invests", text: "StockSane literally saved me from buying at the top. It flagged my FOMO before I could click buy 😅", rating: "⭐⭐⭐⭐⭐" },
              { name: "Rahul K.", handle: "@rahul_trader", text: "This called out my FOMO instantly. Put in ₹80,000 into one stock and it said 'you're going too heavy'. It was right.", rating: "⭐⭐⭐⭐⭐" },
              { name: "Ananya S.", handle: "@ananya_fin", text: "Wish I had this earlier. Would have avoided that Adani situation entirely. Best sanity check tool out there.", rating: "⭐⭐⭐⭐⭐" },
            ].map((t) => (
              <div key={t.name} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-[#22c55e]/40 transition-colors">
                <p className="text-sm mb-4">{t.rating}</p>
                <p className="text-slate-300 text-sm mb-4 italic">&quot;{t.text}&quot;</p>
                <div>
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.handle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            Check your next trade<br /><span className="text-[#22c55e]">before you regret it.</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10">Free, instant, and brutally honest. No signup required.</p>
          <Link
            href="/app"
            className="inline-block bg-[#22c55e] text-black font-extrabold px-10 py-5 rounded-xl text-xl hover:bg-green-400 transition-all hover:scale-105 animate-pulse-glow"
          >
            🚀 Run Sanity Check
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 text-center text-slate-600 text-sm">
        <p>📊 StockSane — Not financial advice. Just a sanity check. 🧠</p>
      </footer>
    </main>
  );
}
