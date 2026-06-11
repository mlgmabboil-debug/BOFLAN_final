import { useState } from "react";
import { AlertTriangle, Shield, Zap, Search, TrendingUp, TrendingDown, Eye, ExternalLink, RefreshCw, Brain, Target } from "lucide-react";
import { motion } from "motion/react";
import { useDexFeed } from "../hooks/useDexFeed";
import { formatPrice, formatVolume } from "../hooks/useMarketPrices";

function ScamScore({ score }: { score: number }) {
  const color =
    score < 20 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : score < 50 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
    : score < 80 ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
    : "text-red-400 bg-red-500/10 border-red-500/20";
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${color}`}>
      {score}
    </span>
  );
}

function RugRisk({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    "Низкий": "text-emerald-400",
    "Средний": "text-yellow-400",
    "Высокий": "text-orange-400",
    "Критический": "text-red-400",
  };
  return <span className={`text-xs font-medium ${map[risk] ?? "text-white/40"}`}>{risk}</span>;
}

function ForecastBadge({ forecast }: { forecast: { direction: 'bullish' | 'bearish' | 'neutral'; confidence: number; target: number } }) {
  const colors = {
    bullish: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    bearish: "text-red-400 bg-red-500/10 border-red-500/20",
    neutral: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  };
  
  const icons = {
    bullish: <TrendingUp size={10} />,
    bearish: <TrendingDown size={10} />,
    neutral: <Target size={10} />,
  };

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${colors[forecast.direction]}`}>
      {icons[forecast.direction]}
      <span>{forecast.confidence}%</span>
    </div>
  );
}

function generateForecast(token: any) {
  // Simulate AI-based forecast based on token metrics
  const baseScore = (100 - token.scamScore) / 100;
  const liquidityScore = Math.min(token.liquidity / 100000, 1);
  const trendScore = token.positive ? 0.7 : 0.3;
  
  const bullishProbability = (baseScore * 0.4 + liquidityScore * 0.3 + trendScore * 0.3) * 100;
  
  let direction: 'bullish' | 'bearish' | 'neutral';
  if (bullishProbability > 65) direction = 'bullish';
  else if (bullishProbability < 35) direction = 'bearish';
  else direction = 'neutral';
  
  const confidence = Math.round(Math.abs(bullishProbability - 50) * 2);
  const targetMultiplier = direction === 'bullish' ? 1.5 : direction === 'bearish' ? 0.7 : 1.1;
  
  return {
    direction,
    confidence: Math.min(confidence, 95),
    target: token.price * targetMultiplier,
  };
}

export function Dex() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Все");
  const { tokens, loading, error, refresh } = useDexFeed(30000);

  const filters = ["Все", "Безопасные", "Новые", "Trending", "Honeypot ⚠️"];

  const filtered = tokens.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "Безопасные") return c.scamScore < 25;
    if (filter === "Honeypot ⚠️") return c.honeypot;
    if (filter === "Новые") return c.age.includes("мин.") || c.age.includes("ч.");
    if (filter === "Trending") return c.change24h > 15;
    return true;
  });

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={16} className="text-yellow-400" />
          <h1 className="text-white text-xl font-semibold">DEX Скринер (Live)</h1>
          <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Brain size={10} />
            AI Прогнозы
          </span>
        </div>
        <p className="text-white/40 text-sm">
          Новые токены и пулы в реальном времени с AI-прогнозами (Dexscreener, включая Pump-подобные листинги).
        </p>
      </div>

      {/* Warning banner */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 mb-5 flex items-start gap-3">
        <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-yellow-400/80 text-xs leading-relaxed">
          DEX монеты крайне рискованны. Всегда проверяй аудит смарт-контракта, распределение холдеров и ликвидность.
          Honeypot = невозможность продать токен. Не инвестируй больше, чем готов потерять.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Новых в выдаче", value: String(tokens.length), icon: <Zap size={13} className="text-yellow-400" /> },
          { label: "Безопасных", value: String(tokens.filter((t) => t.scamScore < 25).length), icon: <Shield size={13} className="text-emerald-400" /> },
          { label: "Honeypot", value: String(tokens.filter((t) => t.honeypot).length), icon: <AlertTriangle size={13} className="text-red-400" /> },
          { label: "Ликвидность", value: formatVolume(tokens.reduce((s, t) => s + t.liquidity, 0)), icon: <Eye size={13} className="text-blue-400" /> },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              {s.icon}
              <span className="text-white/40 text-xs">{s.label}</span>
            </div>
            <div className="text-white font-mono font-semibold">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#1a1a1a] flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded px-3 py-1.5 flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск токена..."
              className="bg-transparent text-white/70 text-sm outline-none placeholder-white/20 w-full"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "text-white/40 hover:text-white hover:bg-[#1a1a1a]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 border-b border-[#1a1a1a]">
          {["Токен", "Цена", "24ч", "Market Cap", "Ликвидность", "Scam Score", "Риск rug", "Прогноз AI", "Источник"].map((h) => (
            <span key={h} className="text-white/30 text-xs flex items-center gap-1">
              {h}
              {h === "Прогноз AI" && <Brain size={10} className="text-blue-400" />}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div>
          {filtered.map((coin, i) => (
            <motion.div
              key={coin.symbol}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="grid lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] grid-cols-1 gap-3 px-4 py-4 border-b border-[#0f0f0f] hover:bg-[#151515] transition-colors cursor-pointer"
            >
              {/* Token */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-[#2a2a2a] flex items-center justify-center text-xs font-bold text-white/70 flex-shrink-0">
                  {coin.symbol.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-white text-sm font-medium">{coin.symbol}</span>
                    {coin.honeypot && (
                      <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1 rounded">HP</span>
                    )}
                  </div>
                  <div className="text-white/30 text-[10px]">{coin.age}</div>
                </div>
              </div>

              {/* Price */}
              <div className="flex flex-col justify-center">
                <span className="text-white font-mono text-xs">{formatPrice(coin.price)}</span>
              </div>

              {/* 24h change */}
              <div className={`flex items-center gap-1 text-xs font-mono font-medium ${coin.positive ? "text-emerald-400" : "text-red-400"}`}>
                {coin.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {coin.change24h >= 0 ? "+" : ""}{coin.change24h.toFixed(2)}%
              </div>

              {/* Market Cap */}
              <div className="text-white/60 text-xs font-mono">{formatVolume(coin.marketCap)}</div>

              {/* Liquidity */}
              <div className="text-white/60 text-xs font-mono">{formatVolume(coin.liquidity)}</div>

              {/* Scam Score */}
              <div>
                <ScamScore score={coin.scamScore} />
              </div>

              {/* Rug Risk */}
              <div className="flex flex-col gap-1">
                <RugRisk risk={coin.rugRisk} />
                <div className="text-[10px] text-white/40">Heuristic</div>
              </div>

              {/* AI Forecast */}
              <div className="flex flex-col gap-1">
                <ForecastBadge forecast={generateForecast(coin)} />
                <div className="text-[10px] text-white/40">
                  Цель: {formatPrice(generateForecast(coin).target)}
                </div>
              </div>

              {/* Source */}
              <div className="flex items-center gap-1">
                <span className="text-white/30 text-xs">{coin.source}</span>
                {coin.url && (
                  <a href={coin.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-white/30 text-sm text-center">
              {loading ? "Загрузка DEX-потока..." : "Нет токенов по выбранному фильтру"}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={refresh} className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1.5">
          <RefreshCw size={11} />
          Обновить сейчас
        </button>
        {error && <span className="text-red-400/80 text-xs">Ошибка источника: {error}</span>}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-emerald-400 font-bold">0-20</span>
          <span className="text-white/30 text-xs">= Безопасно</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-yellow-400 font-bold">20-50</span>
          <span className="text-white/30 text-xs">= Внимание</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-orange-400 font-bold">50-80</span>
          <span className="text-white/30 text-xs">= Рискованно</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-red-400 font-bold">80-100</span>
          <span className="text-white/30 text-xs">= Скам/Мошенничество</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1 rounded font-mono">HP</span>
          <span className="text-white/30 text-xs">= Honeypot (продать нельзя)</span>
        </div>
      </div>
    </div>
  );
}