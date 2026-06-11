import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { MARKET_COINS } from "../data/mockData";
import { MiniChart } from "../components/MiniChart";
import { useMarketPrices, formatPrice, formatVolume } from "../hooks/useMarketPrices";
import {
  TrendingUp, TrendingDown, Search, ArrowUpDown,
  RefreshCw, Wifi, WifiOff,
} from "lucide-react";
import { motion } from "motion/react";

const FILTERS = ["Топ", "Gainers", "Losers", "DeFi", "Layer1"];

export function Market() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const coin = searchParams.get("coin") || searchParams.get("symbol");
    const search = searchParams.get("search");
    if (coin) setSearch(coin);
    if (search) setSearch(search);
  }, [searchParams]);
  const [sortBy, setSortBy] = useState<"rank" | "price" | "change" | "volume">("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activeFilter, setActiveFilter] = useState("Топ");

  const { prices, loading, error, refreshTopPrices } = useMarketPrices();

  const [globalMcap, setGlobalMcap] = useState<number | null>(null);
  const [globalVol, setGlobalVol] = useState<number | null>(null);
  const [globalBtcDom, setGlobalBtcDom] = useState<number | null>(null);
  const [globalMcapCh24, setGlobalMcapCh24] = useState<number | null>(null);
  const [defiTvl, setDefiTvl] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.coingecko.com/api/v3/global")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((g: { data?: Record<string, unknown> }) => {
        const d = g.data as {
          total_market_cap?: { usd?: number };
          total_volume?: { usd?: number };
          market_cap_percentage?: { btc?: number };
          market_cap_change_percentage_24h_usd?: number;
        };
        if (cancelled || !d) return;
        setGlobalMcap(d.total_market_cap?.usd ?? null);
        setGlobalVol(d.total_volume?.usd ?? null);
        setGlobalBtcDom(d.market_cap_percentage?.btc ?? null);
        setGlobalMcapCh24(
          typeof d.market_cap_change_percentage_24h_usd === "number"
            ? d.market_cap_change_percentage_24h_usd
            : null
        );
      })
      .catch(() => {
        if (!cancelled) {
          setGlobalMcap(null);
          setGlobalVol(null);
          setGlobalBtcDom(null);
          setGlobalMcapCh24(null);
        }
      });
    fetch("https://api.coingecko.com/api/v3/global/decentralized_finance_defi")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: { defi_market_cap?: number } } | null) => {
        if (cancelled || !j?.data?.defi_market_cap) return;
        setDefiTvl(j.data.defi_market_cap);
      })
      .catch(() => {
        if (!cancelled) setDefiTvl(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Use only real data from CoinGecko API
  const coins = useMemo(() => {
    return prices.map((coin) => ({
      rank: coin.market_cap_rank,
      symbol: coin.symbol,
      name: coin.name,
      price: formatPrice(coin.current_price),
      change24h: `${(coin.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}${(coin.price_change_percentage_24h ?? 0).toFixed(2)}%`,
      positive: (coin.price_change_percentage_24h ?? 0) >= 0,
      marketCap: formatVolume(coin.market_cap),
      volume: formatVolume(coin.total_volume),
      _raw: coin,
    }));
  }, [prices]);

  const avgChangeNum =
    prices.length > 0 ? prices.reduce((s, p) => s + (p.price_change_percentage_24h ?? 0), 0) / prices.length : 0;

  const STATS = useMemo(() => {
    const mcapStr = globalMcap != null ? formatVolume(globalMcap) : "…";
    const volStr =
      globalVol != null ? formatVolume(globalVol) : prices.length > 0
        ? formatVolume(prices.reduce((s, p) => s + p.total_volume, 0))
        : "…";
    const domStr = globalBtcDom != null ? `${globalBtcDom.toFixed(1)}%` : "…";
    const defiStr = defiTvl != null ? formatVolume(defiTvl) : "…";
    const mch = globalMcapCh24 ?? 0;
    const avgCh = avgChangeNum;

    return [
      {
        label: "Капитализация (глобал.)",
        value: mcapStr,
        change: `${mch >= 0 ? "+" : ""}${mch.toFixed(2)}%`,
        positive: mch >= 0,
      },
      {
        label: "Объём 24ч (глобал.)",
        value: volStr,
        change: `${avgCh >= 0 ? "+" : ""}${avgCh.toFixed(2)}%`,
        positive: avgCh >= 0,
      },
      {
        label: "DeFi market cap",
        value: defiStr,
        change: avgCh >= 0 ? `рынок ↑` : `рынок ↓`,
        positive: avgCh >= 0,
      },
      {
        label: "Доминация BTC",
        value: domStr,
        change: "live",
        positive: true,
      },
    ];
  }, [globalMcap, globalVol, globalBtcDom, globalMcapCh24, defiTvl, prices, avgChangeNum]);

  const topGainers = useMemo(() => {
    return [...coins].sort((a, b) => (b._raw.price_change_percentage_24h || 0) - (a._raw.price_change_percentage_24h || 0)).slice(0, 3);
  }, [coins]);

  const topLosers = useMemo(() => {
    return [...coins].sort((a, b) => (a._raw.price_change_percentage_24h || 0) - (b._raw.price_change_percentage_24h || 0)).slice(0, 3);
  }, [coins]);

  const popular = useMemo(() => {
    return [...coins].sort((a, b) => (b._raw.total_volume || 0) - (a._raw.total_volume || 0)).slice(0, 3);
  }, [coins]);

  const HIGHLIGHTS = [
    { title: "🔥 Популярные (Объём)", data: popular },
    { title: "🚀 Растущие", data: topGainers },
    { title: "🔻 Падающие", data: topLosers },
  ];

  // Filter and sort
  const filtered = useMemo(() => {
    let list = [...coins];

    if (search) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.symbol.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (activeFilter === "Gainers") list = list.filter((c) => c.positive);
    if (activeFilter === "Losers") list = list.filter((c) => !c.positive);

    list.sort((a, b) => {
      let va = 0, vb = 0;
      if (sortBy === "rank") { va = a.rank; vb = b.rank; }
      else if (sortBy === "price") { va = a._raw?.current_price || 0; vb = b._raw?.current_price || 0; }
      else if (sortBy === "change") { va = a._raw?.price_change_percentage_24h || 0; vb = b._raw?.price_change_percentage_24h || 0; }
      else if (sortBy === "volume") { va = a._raw?.total_volume || 0; vb = b._raw?.total_volume || 0; }
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return list;
  }, [coins, search, activeFilter, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-semibold mb-1">Рынок</h1>
          <p className="text-white/40 text-sm">Котировки в реальном времени · CoinGecko</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {error ? (
              <WifiOff size={13} className="text-red-400" />
            ) : (
              <Wifi size={13} className="text-emerald-400" />
            )}
            <span className={`text-xs ${error ? "text-red-400" : "text-emerald-400"}`}>
              {error ? "Ошибка API" : "Live"}
            </span>
          </div>
          <button
            onClick={refreshTopPrices}
            className="p-1.5 rounded text-white/30 hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-4"
          >
            <div className="text-white/40 text-xs mb-1">{stat.label}</div>
            <div className="text-white font-mono font-semibold text-lg">{stat.value}</div>
            <div
              className={`text-xs font-mono mt-0.5 flex items-center gap-1 ${
                stat.positive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {stat.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {stat.change} 24ч
            </div>
          </motion.div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2">
          <WifiOff size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-red-400/80 text-xs">
            Не удалось загрузить данные: {error}. Отображаются последние известные значения.
          </span>
        </div>
      )}

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {HIGHLIGHTS.map((col) => (
          <div key={col.title} className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-4">
            <h3 className="text-white text-sm font-semibold mb-3">{col.title}</h3>
            <div className="space-y-3">
              {col.data.map((coin) => (
                <div 
                  key={coin.symbol}
                  onClick={() => navigate(`/charts?coin=${encodeURIComponent(coin.symbol)}`)}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#1e1e1e] flex items-center justify-center text-[10px] font-bold text-white/60 group-hover:bg-[#252525] transition-colors">
                      {coin.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white/90 text-xs font-semibold">{coin.symbol}</div>
                      <div className="text-white/40 text-[10px]">{coin.price}</div>
                    </div>
                  </div>
                  <div className={`font-mono text-xs flex items-center gap-1 ${coin.positive ? "text-emerald-400" : "text-red-400"}`}>
                    {coin.positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {coin.change24h}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-[#1a1a1a] flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded px-3 py-1.5 flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск монеты..."
              className="bg-transparent text-white/70 text-sm outline-none placeholder-white/20 w-full"
            />
          </div>
          <div className="flex items-center gap-1">
            {FILTERS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${
                  activeFilter === tab
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-white/40 hover:text-white hover:bg-[#1a1a1a]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="hidden md:grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_100px] gap-4 px-4 py-2.5 border-b border-[#1a1a1a]">
          {[
            { label: "#", key: "rank" },
            { label: "Монета", key: null },
            { label: "Цена", key: "price" },
            { label: "24ч", key: "change" },
            { label: "Кап.", key: null },
            { label: "Объём 24ч", key: "volume" },
            { label: "7 дней", key: null },
          ].map((h) => (
            <button
              key={h.label}
              onClick={() => h.key && toggleSort(h.key as any)}
              className="flex items-center gap-1 text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              {h.label}
              {h.key && <ArrowUpDown size={10} className={sortBy === h.key ? "text-blue-400" : ""} />}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div>
          {filtered.map((coin, i) => (
            <motion.div
              key={coin.symbol}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="grid md:grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_100px] grid-cols-[1fr_1fr_1fr] gap-4 px-4 py-3.5 border-b border-[#0f0f0f] hover:bg-[#151515] transition-colors cursor-pointer items-center"
              onClick={() => navigate(`/charts?coin=${encodeURIComponent(coin.symbol)}`)}
            >
              <span className="text-white/30 text-xs font-mono hidden md:block">{coin.rank}</span>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center text-xs font-bold text-white/60 flex-shrink-0">
                  {coin.symbol.charAt(0)}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">{coin.symbol}</div>
                  <div className="text-white/40 text-[10px] hidden sm:block">{coin.name}</div>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-white font-mono text-sm">{coin.price}</span>
              </div>

              <div
                className={`font-mono text-sm flex items-center gap-1 ${
                  coin.positive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {coin.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {coin.change24h}
              </div>

              <div className="text-white/60 text-sm font-mono hidden md:block">{coin.marketCap}</div>
              <div className="text-white/60 text-sm font-mono hidden md:block">{coin.volume}</div>

              <div className="w-24 h-10 hidden md:block">
                <MiniChart
                  symbol={coin.symbol}
                  height={40}
                  width={96}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-white/20 text-sm">
            Монеты не найдены
          </div>
        )}
      </div>
    </div>
  );
}
