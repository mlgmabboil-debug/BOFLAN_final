import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { MARKET_COINS } from "../data/mockData";
import { MiniChart } from "../components/MiniChart";
import { useMarketPrices, formatPrice, formatVolume, getCustomCoins, saveCustomCoins } from "../hooks/useMarketPrices";
import {
  TrendingUp, TrendingDown, Search, ArrowUpDown,
  RefreshCw, Wifi, WifiOff, X, Sparkles, Plus
} from "lucide-react";
import { motion } from "motion/react";

const getCustomCategory = (symbol: string): string => {
  try {
    const raw = localStorage.getItem("custom_market_coins_categories");
    if (raw) {
      const cats = JSON.parse(raw);
      return cats[symbol.toUpperCase()] || "";
    }
  } catch (e) {}
  return "";
}

const saveCustomCategory = (symbol: string, category: string) => {
  try {
    const raw = localStorage.getItem("custom_market_coins_categories") || "{}";
    const cats = JSON.parse(raw);
    cats[symbol.toUpperCase()] = category;
    localStorage.setItem("custom_market_coins_categories", JSON.stringify(cats));
  } catch (e) {}
}

const FILTERS = [
  "All",
  "Hot",
  "Top",
  "New",
  "AI",
  "Meme",
  "DeFi",
  "Layer 1&2",
  "Top gainers",
  "Top losers"
];

const AI_SYMBOLS = new Set([
  "RNDR", "RENDER", "GRT", "THETA", "AKT", "NEAR", "ICP", "FET", "AGIX", "OCEAN", "FIL"
]);
const MEME_SYMBOLS = new Set([
  "DOGE", "SHIB", "PEPE", "WIF", "FLOKI", "BONK"
]);
const DEFI_SYMBOLS = new Set([
  "LINK", "UNI", "ARB", "LDO", "MKR", "AAVE", "INJ", "RUNE", "JUP", "AKT", "GRT", "FIL", "PENDLE", "CRV", "COMP", "SUSHI", "YFI", "SNX", "BAL", "ZRX"
]);
const L1_L2_SYMBOLS = new Set([
  "BTC", "ETH", "BNB", "SOL", "XRP", "TON", "ADA", "AVAX", "DOT", "TRX", "MATIC", "LTC", "NEAR", "ARB", "APT", "ICP", "ETC", "ATOM", "IMX", "OP", "VET", "FTM", "SUI", "ALGO", "STX", "EGLD", "FLOW", "SEI", "BEAM"
]);
const HOT_SYMBOLS = new Set([
  "BTC", "ETH", "SOL", "DOGE", "PEPE", "WIF", "SUI", "PENDLE", "JUP", "RNDR", "TON"
]);
const NEW_SYMBOLS = new Set([
  "PEPE", "WIF", "BONK", "SUI", "SEI", "JUP", "PENDLE", "BEAM"
]);

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
  const [activeFilter, setActiveFilter] = useState("All");

  // Auto-align sorting columns when relevant tags are selected
  useEffect(() => {
    if (activeFilter === "Top gainers") {
      setSortBy("change");
      setSortDir("desc");
    } else if (activeFilter === "Top losers") {
      setSortBy("change");
      setSortDir("asc");
    } else if (activeFilter === "Top") {
      setSortBy("rank");
      setSortDir("asc");
    }
  }, [activeFilter]);

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

    const sym = (c: typeof coins[0]) => c.symbol.toUpperCase();

    if (activeFilter === "Hot") {
      list = list.filter((c) => HOT_SYMBOLS.has(sym(c)) || getCustomCategory(sym(c)) === "Hot");
    } else if (activeFilter === "Top") {
      list = list.filter((c) => (c.rank > 0 && c.rank <= 15) || getCustomCategory(sym(c)) === "Top");
    } else if (activeFilter === "New") {
      list = list.filter((c) => NEW_SYMBOLS.has(sym(c)) || getCustomCategory(sym(c)) === "New" || getCustomCoins().some(cc => cc.symbol.toUpperCase() === sym(c)));
    } else if (activeFilter === "AI") {
      list = list.filter((c) => AI_SYMBOLS.has(sym(c)) || getCustomCategory(sym(c)) === "AI");
    } else if (activeFilter === "Meme") {
      list = list.filter((c) => MEME_SYMBOLS.has(sym(c)) || getCustomCategory(sym(c)) === "Meme");
    } else if (activeFilter === "DeFi") {
      list = list.filter((c) => DEFI_SYMBOLS.has(sym(c)) || getCustomCategory(sym(c)) === "DeFi");
    } else if (activeFilter === "Layer 1&2") {
      list = list.filter((c) => L1_L2_SYMBOLS.has(sym(c)) || getCustomCategory(sym(c)) === "Layer 1&2");
    } else if (activeFilter === "Top gainers") {
      list = list.filter((c) => c.positive);
    } else if (activeFilter === "Top losers") {
      list = list.filter((c) => !c.positive);
    }

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

  // State for launcher modal and notifications
  const [showLauncher, setShowLauncher] = useState(false);
  const [launchName, setLaunchName] = useState("");
  const [launchSymbol, setLaunchSymbol] = useState("");
  const [launchPrice, setLaunchPrice] = useState("");
  const [launchCategory, setLaunchCategory] = useState("Meme");
  const [launching, setLaunching] = useState(false);
  const [launchSuccess, setLaunchSuccess] = useState<any | null>(null);

  const [activeToast, setActiveToast] = useState<{ symbol: string; name: string; price: number; change: number } | null>(null);

  useEffect(() => {
    const handleNewListing = (e: Event) => {
      const coin = (e as CustomEvent).detail;
      if (coin) {
        setActiveToast({
          symbol: coin.symbol,
          name: coin.name,
          price: coin.current_price,
          change: coin.price_change_percentage_24h || 0
        });
        
        const timer = setTimeout(() => {
          setActiveToast(null);
        }, 6000);
        return () => clearTimeout(timer);
      }
    };
    window.addEventListener("new_dex_listing", handleNewListing);
    return () => window.removeEventListener("new_dex_listing", handleNewListing);
  }, []);

  const handleLaunchToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!launchName || !launchSymbol || !launchPrice) return;
    
    setLaunching(true);
    
    setTimeout(() => {
      const sym = launchSymbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const newCoinState = {
        id: `custom-${sym.toLowerCase()}`,
        symbol: sym,
        name: launchName,
        current_price: parseFloat(launchPrice) || 0.1,
        price_change_24h: 0,
        price_change_percentage_24h: Number(((Math.random() - 0.2) * 8).toFixed(2)),
        market_cap: Math.floor(500000 + Math.random() * 1500000),
        market_cap_rank: 51 + getCustomCoins().length,
        total_volume: Math.floor(12000 + Math.random() * 45000),
        circulating_supply: 1000000000,
        last_updated: Date.now()
      };
      
      saveCustomCategory(sym, launchCategory);
      const custom = getCustomCoins();
      saveCustomCoins([newCoinState, ...custom]);
      
      setLaunching(false);
      setLaunchSuccess({
        ...newCoinState,
        txHash: "0x" + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join("")
      });
      
      setLaunchName("");
      setLaunchSymbol("");
      setLaunchPrice("");
    }, 1500);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-semibold mb-1">Рынок</h1>
          <p className="text-white/40 text-sm">Котировки криптоактивов и листинги в реальном времени</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowLauncher(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-emerald-500/10 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Запустить токен</span>
          </button>
          
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
        <div className="p-4 border-b border-[#1a1a1a] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-[#161616] border border-[#222222] rounded-lg px-3 py-2 w-full xl:max-w-md transition-all focus-within:border-white/20">
            <Search size={14} className="text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск монеты..."
              className="bg-transparent text-white text-sm outline-none placeholder-white/25 w-full font-sans"
            />
          </div>
          <div 
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            className="flex items-center gap-1 overflow-x-auto pb-1 xl:pb-0 max-w-full [&::-webkit-scrollbar]:hidden"
          >
            {FILTERS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeFilter === tab
                    ? "bg-[#222222] text-white border border-[#333333] shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-[#151515]"
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

      {/* Active Listing Toast */}
      {activeToast && (
        <div 
          onClick={() => {
            navigate(`/charts?coin=${encodeURIComponent(activeToast.symbol)}`);
            setActiveToast(null);
          }}
          className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#161616]/95 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] rounded-xl p-4 cursor-pointer hover:bg-[#1c1c1c] hover:border-emerald-500/50 transition-all flex items-start gap-3 backdrop-blur-md"
        >
          <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg mt-0.5">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 text-[10px] font-bold tracking-wider uppercase font-mono">DEX Листинг</span>
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveToast(null); }}
                className="text-white/20 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-white text-sm font-semibold mt-1">
              Запущен новый токен <span className="text-emerald-300 font-bold">{activeToast.name} ({activeToast.symbol})</span>!
            </p>
            <div className="flex items-center gap-2 mt-1.5 font-mono text-xs text-white/50">
              <span>Цена: ${activeToast.price.toFixed(4)}</span>
              <span className="text-emerald-400">+{activeToast.change.toFixed(2)}% 🚀</span>
            </div>
          </div>
        </div>
      )}

      {/* Token Launcher Modal */}
      {showLauncher && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111111] border border-[#222222] rounded-xl w-full max-w-md overflow-hidden relative shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                <h3 className="text-white font-semibold text-sm">Листинг нового токена (DEX Launcher)</h3>
              </div>
              <button 
                onClick={() => { setShowLauncher(false); setLaunchSuccess(null); }}
                className="text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Success screen */}
            {launchSuccess ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                  ✓
                </div>
                <h4 className="text-white font-medium text-lg mb-1">Токен успешно запущен!</h4>
                <p className="text-white/40 text-xs mb-4">Смарт-контракт развернут в тестовой сети Liquidi-DEX</p>
                
                <div className="bg-[#161616] border border-[#222222] rounded-lg p-3 text-left space-y-2 mb-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">Имя:</span>
                    <span className="text-white font-medium">{launchSuccess.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">Символ:</span>
                    <span className="text-white font-mono font-medium text-emerald-400">{launchSuccess.symbol}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">Нач. цена:</span>
                    <span className="text-white font-mono">${launchSuccess.current_price}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">Категория:</span>
                    <span className="bg-[#222222] text-white/70 px-2 py-0.5 rounded text-[10px]">{launchCategory}</span>
                  </div>
                  <div className="text-xs pt-1.5 border-t border-[#222222] flex flex-col gap-0.5">
                    <span className="text-white/30 text-[10px]">Tx Hash:</span>
                    <span className="text-white/50 font-mono text-[9px] truncate">{launchSuccess.txHash}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowLauncher(false);
                      setLaunchSuccess(null);
                      navigate(`/charts?coin=${encodeURIComponent(launchSuccess.symbol)}`);
                    }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Открыть график
                  </button>
                  <button
                    onClick={() => setLaunchSuccess(null)}
                    className="bg-[#1e1e1e] hover:bg-[#252525] text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Запустить еще
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLaunchToken} className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-white/50 text-xs">Название токена</label>
                  <input
                    value={launchName}
                    onChange={(e) => setLaunchName(e.target.value)}
                    required
                    maxLength={30}
                    placeholder="Например, Sora Artificial"
                    className="w-full bg-[#161616] border border-[#222222] rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500/40"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-xs">Символ (Тикер)</label>
                    <input
                      value={launchSymbol}
                      onChange={(e) => setLaunchSymbol(e.target.value)}
                      required
                      maxLength={8}
                      placeholder="Например, SORA"
                      className="w-full bg-[#161616] border border-[#222222] rounded-lg p-2.5 text-white font-mono text-sm outline-none focus:border-emerald-500/40 uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-xs">Нач. цена ($ USD)</label>
                    <input
                      type="number"
                      step="any"
                      min="0.00000001"
                      value={launchPrice}
                      onChange={(e) => setLaunchPrice(e.target.value)}
                      required
                      placeholder="0.05"
                      className="w-full bg-[#161616] border border-[#222222] rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500/40"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-white/50 text-xs">Категория рынка</label>
                  <select
                    value={launchCategory}
                    onChange={(e) => setLaunchCategory(e.target.value)}
                    className="w-full bg-[#161616] border border-[#222222] rounded-lg p-2.5 text-white text-sm outline-none focus:border-[#444] text-white"
                  >
                    <option value="Meme">Meme (Мем-токен)</option>
                    <option value="AI">AI (Искусственный интеллект)</option>
                    <option value="DeFi">DeFi (Децентрализованные финансы)</option>
                    <option value="Layer 1&2">Layer 1 & 2 (Уровень 1/2 системы)</option>
                    <option value="New">Hot / New (Новые списки)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={launching}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 px-4 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {launching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Развертывание контракта в сети...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Инициализировать DEX Листинг</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
