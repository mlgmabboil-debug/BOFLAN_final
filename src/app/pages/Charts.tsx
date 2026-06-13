'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { PriceChartLW } from '../components/PriceChartLW'
import { AIChat } from '../components/AIChat'
import { MiniChart } from '../components/MiniChart'
import { useMarketPrices, getCustomCoins } from '../hooks/useMarketPrices'
import { useDexFeed } from '../hooks/useDexFeed'
import { useSearchParams, useNavigate } from 'react-router'
import {
  TrendingUp, TrendingDown, BarChart3, CandlestickChart, Activity, Search, ArrowUpDown,
  Zap, Shield, AlertTriangle, Eye, Target, Brain, ExternalLink, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react'

const TIMEFRAMES = [
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
] as const

// Standard stablecoin checklist to be absolutely sure they are hidden
const STABLECOIN_SYMBOLS = new Set([
  'USDT', 'USDC', 'DAI', 'FDUSD', 'USDE', 'USDP', 'EURA', 'EURC', 'PYUSD', 'TUSD', 'BUSD', 'UST'
])

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
  "BTC", "ETH", "BNB", "SOL", "XRP", "TON", "ADA", "AVAX", "DOT", "TRX", "MATIC", "LTC", "NEAR", "ARB", "APT", "ICP", "ETC", "ATOM", "IMX", "OP", "VET", "FTM", "SUI", "ALGO", "STX", "EGLD", "FLOW", "SEI", "BEAM", "TIA", "WLD", "FET", "AGIX", "ORDI", "ARKM", "PYTH", "JTO", "STRK"
]);
const HOT_SYMBOLS = new Set([
  "BTC", "ETH", "SOL", "DOGE", "PEPE", "WIF", "SUI", "PENDLE", "JUP", "RNDR", "TON", "TIA", "WLD", "FET"
]);
const NEW_SYMBOLS = new Set([
  "PEPE", "WIF", "BONK", "SUI", "SEI", "JUP", "PENDLE", "BEAM", "TIA", "WLD", "ARKM", "PYTH", "JTO", "STRK"
]);

const USD_TO_RUB = 92.40

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

// Custom Formatting functions supporting dynamic USD/RUB conversion
function formatDynamicPrice(price: number, currency: 'USD' | 'RUB') {
  const converted = currency === 'RUB' ? price * USD_TO_RUB : price
  const symbol = currency === 'RUB' ? ' ₽' : ' $'
  
  let decimals = 2
  if (converted > 0 && converted < 0.01) {
    decimals = 6
  } else if (converted > 0 && converted < 1) {
    decimals = 4
  }
  
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(converted)
  
  return `${formatted}${symbol}`
}

function formatDynamicVolume(value: number, currency: 'USD' | 'RUB') {
  const converted = currency === 'RUB' ? value * USD_TO_RUB : value
  const symbol = currency === 'RUB' ? ' ₽' : ' $'
  
  if (converted >= 1e12) {
    return `${(converted / 1e12).toFixed(2)}Т${symbol}` // Trillion
  }
  if (converted >= 1e9) {
    return `${(converted / 1e9).toFixed(2)}Б${symbol}` // Billion
  }
  if (converted >= 1e6) {
    return `${(converted / 1e6).toFixed(2)}М${symbol}` // Million
  }
  if (converted >= 1e3) {
    return `${(converted / 1e3).toFixed(1)}К${symbol}` // Thousand
  }
  return `${converted.toFixed(2)}${symbol}`
}

// DEX Utility Components and Helper Logic
function ScamScore({ score }: { score: number }) {
  const color =
    score < 20 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : score < 50 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
    : score < 80 ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
    : "text-red-400 bg-red-500/10 border-red-500/20"
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${color}`}>
      {score}
    </span>
  )
}

function RugRisk({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    "Низкий": "text-emerald-400",
    "Средний": "text-yellow-400",
    "Высокий": "text-orange-400",
    "Критический": "text-red-400",
  }
  return <span className={`text-xs font-medium ${map[risk] ?? "text-white/40"}`}>{risk}</span>
}

function ForecastBadge({ forecast }: { forecast: { direction: 'bullish' | 'bearish' | 'neutral'; confidence: number; target: number } }) {
  const colors = {
    bullish: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    bearish: "text-red-400 bg-red-500/10 border-red-500/20",
    neutral: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  }
  
  const icons = {
    bullish: <TrendingUp size={10} />,
    bearish: <TrendingDown size={10} />,
    neutral: <Target size={10} />,
  }

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${colors[forecast.direction]}`}>
      {icons[forecast.direction]}
      <span>{forecast.confidence}%</span>
    </div>
  )
}

function generateForecast(token: any) {
  const baseScore = (100 - token.scamScore) / 100
  const liquidityScore = Math.min(token.liquidity / 100000, 1)
  const trendScore = token.positive ? 0.7 : 0.3
  
  const bullishProbability = (baseScore * 0.4 + liquidityScore * 0.3 + trendScore * 0.3) * 100
  
  let direction: 'bullish' | 'bearish' | 'neutral'
  if (bullishProbability > 65) direction = 'bullish'
  else if (bullishProbability < 35) direction = 'bearish'
  else direction = 'neutral'
  
  const confidence = Math.round(Math.abs(bullishProbability - 50) * 2)
  const targetMultiplier = direction === 'bullish' ? 1.5 : direction === 'bearish' ? 0.7 : 1.1
  
  return {
    direction,
    confidence: Math.min(confidence, 95),
    target: token.price * targetMultiplier,
  }
}

export default function Charts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'crypto' | 'dex'>(
    searchParams.get('tab') === 'dex' ? 'dex' : 'crypto'
  )
  
  // Shared currency toggle states (USD / RUB)
  const [activeCurrency, setActiveCurrency] = useState<'USD' | 'RUB'>('USD')

  // Crypto coins and chart states
  const [selectedCoin, setSelectedCoin] = useState<string | null>(searchParams.get('coin')?.toUpperCase() || null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '4h' | '1d' | '1w' | '1m'>('1d')
  const [chartType, setChartType] = useState<'candlestick' | 'area'>('candlestick')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'rank' | 'price' | 'change' | 'volume'>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [cryptoFilter, setCryptoFilter] = useState<string>('All')
  
  // Auto-align sorting columns when relevant tags are selected
  useEffect(() => {
    if (cryptoFilter === "Top gainers") {
      setSortBy("change");
      setSortDir("desc");
    } else if (cryptoFilter === "Top losers") {
      setSortBy("change");
      setSortDir("asc");
    } else if (cryptoFilter === "Top") {
      setSortBy("rank");
      setSortDir("asc");
    }
  }, [cryptoFilter]);
  
  // Pagination State (Exactly 10 coins per page)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const chartRef = useRef<HTMLDivElement | null>(null)
  
  const { prices, loading: pricesLoading } = useMarketPrices()
  const selectedCoinData = selectedCoin ? prices.find(p => p.symbol === selectedCoin) : null

  // DEX hook state
  const { tokens: dexTokens, loading: dexLoading, error: dexError, refresh: refreshDex } = useDexFeed(30000)
  const [dexSearch, setDexSearch] = useState("")
  const [dexFilter, setDexFilter] = useState("Все")
  const dexFilters = ["Все", "Безопасные", "Новые", "Trending", "Honeypot ⚠️"]

  // Sync tab with URL query parameter
  const handleTabChange = (tab: 'crypto' | 'dex') => {
    setActiveTab(tab)
    const next = new URLSearchParams(searchParams)
    if (tab === 'dex') {
      next.set('tab', 'dex')
    } else {
      next.delete('tab')
    }
    setSearchParams(next, { replace: true })
  }

  // Pre-filter and sort standard coins while hiding stablecoins
  const filteredPrices = useMemo(() => {
    // Hidden stablecoins checklist
    let list = prices.filter(p => !STABLECOIN_SYMBOLS.has(p.symbol))

    if (search) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.symbol.toLowerCase().includes(search.toLowerCase())
      )
    }

    const sym = (p: typeof prices[0]) => p.symbol.toUpperCase();

    if (cryptoFilter === 'Hot') {
      list = list.filter((p) => HOT_SYMBOLS.has(sym(p)) || getCustomCategory(sym(p)) === "Hot");
    } else if (cryptoFilter === 'Top') {
      list = list.filter((p) => (p.market_cap_rank > 0 && p.market_cap_rank <= 15) || getCustomCategory(sym(p)) === "Top");
    } else if (cryptoFilter === 'New') {
      list = list.filter((p) => NEW_SYMBOLS.has(sym(p)) || getCustomCategory(sym(p)) === "New" || getCustomCoins().some(cc => cc.symbol.toUpperCase() === sym(p)));
    } else if (cryptoFilter === 'AI') {
      list = list.filter((p) => AI_SYMBOLS.has(sym(p)) || getCustomCategory(sym(p)) === "AI");
    } else if (cryptoFilter === 'Meme') {
      list = list.filter((p) => MEME_SYMBOLS.has(sym(p)) || getCustomCategory(sym(p)) === "Meme");
    } else if (cryptoFilter === 'DeFi') {
      list = list.filter((p) => DEFI_SYMBOLS.has(sym(p)) || getCustomCategory(sym(p)) === "DeFi");
    } else if (cryptoFilter === 'Layer 1&2') {
      list = list.filter((p) => L1_L2_SYMBOLS.has(sym(p)) || getCustomCategory(sym(p)) === "Layer 1&2");
    } else if (cryptoFilter === 'Top gainers') {
      list = list.filter((p) => (p.price_change_percentage_24h || 0) >= 0);
    } else if (cryptoFilter === 'Top losers') {
      list = list.filter((p) => (p.price_change_percentage_24h || 0) < 0);
    }
    
    return list.sort((a, b) => {
      let va = 0, vb = 0
      if (sortBy === 'rank') { va = a.market_cap_rank; vb = b.market_cap_rank }
      else if (sortBy === 'price') { va = a.current_price; vb = b.current_price }
      else if (sortBy === 'change') { va = a.price_change_percentage_24h || 0; vb = b.price_change_percentage_24h || 0 }
      else if (sortBy === 'volume') { va = a.total_volume; vb = b.total_volume }
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }, [prices, search, sortBy, sortDir, cryptoFilter])

  // Reset to first page when search filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, cryptoFilter, sortBy])

  // Paginated standard coins display
  const paginatedPrices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredPrices.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredPrices, currentPage])

  const totalPages = Math.ceil(filteredPrices.length / itemsPerPage)

  // Smart Pagination Ranges matching standard OKX style: < 1 2 3 ... 17 >
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages)
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  // Filter DEX tokens list
  const filteredDexTokens = useMemo(() => {
    return dexTokens.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(dexSearch.toLowerCase()) ||
        c.symbol.toLowerCase().includes(dexSearch.toLowerCase())
      if (!matchSearch) return false
      if (dexFilter === "Безопасные") return c.scamScore < 25
      if (dexFilter === "Honeypot ⚠️") return c.honeypot
      if (dexFilter === "Новые") return c.age.includes("мин.") || c.age.includes("ч.")
      if (dexFilter === "Trending") return c.change24h > 15
      return true
    })
  }, [dexTokens, dexSearch, dexFilter])

  const handleSelectCoin = (coin: string) => {
    const upper = coin.toUpperCase()
    setSelectedCoin(upper)
    const next = new URLSearchParams(searchParams)
    next.set('coin', upper)
    setSearchParams(next, { replace: true })
    chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  return (
    <>
      <div className="max-w-[1400px] mx-[#0000] mx-auto px-4 py-6">
        {/* Header and consolidated currency toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-white text-2xl font-bold mb-1">Рынок</h1>
            <p className="text-white/40 text-sm">Котировки криптовалютных активов и DEX листингов</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Elegant high-precision currency switcher */}
            <span className="text-white/40 text-xs hidden sm:inline">Валюта рынка:</span>
            <div className="flex bg-[#111111] border border-[#222222] rounded-lg p-1.5 gap-1 shadow-sm">
              <button
                onClick={() => setActiveCurrency('USD')}
                className={`px-3 py-1 text-xs rounded-md transition-all font-semibold ${
                  activeCurrency === 'USD'
                    ? 'bg-white text-black font-bold shadow'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setActiveCurrency('RUB')}
                className={`px-3 py-1 text-xs rounded-md transition-all font-semibold ${
                  activeCurrency === 'RUB'
                    ? 'bg-white text-black font-bold shadow'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                RUB (₽)
              </button>
            </div>
          </div>
        </div>

        {/* Tab switchers modeled after OKX: Cryptocurrency & DEX */}
        <div className="flex border-b border-[#222222] mb-6 gap-6">
          <button
            onClick={() => handleTabChange('crypto')}
            className={`pb-3 text-base font-bold transition-all relative ${
              activeTab === 'crypto'
                ? 'text-white border-b-2 border-white'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Криптовалюта
          </button>
          <button
            onClick={() => handleTabChange('dex')}
            className={`pb-3 text-base font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'dex'
                ? 'text-white border-b-2 border-white'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <Zap size={14} className={activeTab === 'dex' ? 'text-yellow-400' : ''} />
            DEX
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'crypto' ? (
            <motion.div
              key="crypto-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Chart Section */}
              {selectedCoin && selectedCoinData && (
                <div ref={chartRef} className="space-y-4">
                  {/* Chart Controls */}
                  <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-1">
                      {/* Timeframe Selector */}
                      <div>
                        <label className="block text-white/60 text-xs font-medium mb-2">
                          Таймфрейм
                        </label>
                        <div className="grid grid-cols-5 gap-1">
                          {TIMEFRAMES.map(tf => (
                            <button
                              key={tf.value}
                              onClick={() => setSelectedTimeframe(tf.value as any)}
                              className={`px-2 py-2 text-xs rounded transition-colors ${
                                selectedTimeframe === tf.value
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-[#1a1a1a] text-white/60 hover:text-white'
                              }`}
                            >
                              {tf.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Chart Type Selector */}
                      <div>
                        <label className="block text-white/60 text-xs font-medium mb-2">
                          Тип графика
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setChartType('candlestick')}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded transition-colors ${
                              chartType === 'candlestick'
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#1a1a1a] text-white/60 hover:text-white'
                            }`}
                          >
                            <CandlestickChart size={14} />
                            Свечи
                          </button>
                          <button
                            onClick={() => setChartType('area')}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded transition-colors ${
                              chartType === 'area'
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#1a1a1a] text-white/60 hover:text-white'
                            }`}
                          >
                            <Activity size={14} />
                            Линия
                          </button>
                        </div>
                      </div>

                      {/* Current Price Display converting dynamic values */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white/40 text-xs">Текущая цена</div>
                          <div className="text-2xl font-bold text-white font-mono mt-1">
                            {formatDynamicPrice(selectedCoinData.current_price, activeCurrency)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                            selectedCoinData.price_change_24h >= 0 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/15 text-red-400 border border-red-500/20'
                          }`}>
                            {selectedCoinData.price_change_24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {selectedCoinData.price_change_24h >= 0 ? '+' : ''}
                            {selectedCoinData.price_change_percentage_24h.toFixed(2)}%
                          </div>
                          <div className="text-white/30 text-xs mt-1">24ч изменение</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Chart */}
                  <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                          {selectedCoin.charAt(0)}
                        </div>
                        <h2 className="text-lg font-bold text-white">
                          {selectedCoin} / USD
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/coin/${encodeURIComponent(selectedCoin)}`)}
                          className="flex items-center gap-1.5 bg-[#222] hover:bg-[#333] border border-[#333] text-white px-3 py-1 rounded text-sm transition-all"
                        >
                          <BarChart3 size={14} className="text-emerald-400" />
                          Аналитика
                        </button>
                        <span className="bg-[#1a1a1a] px-3 py-1 rounded text-white/70 text-sm">
                          {selectedTimeframe.toUpperCase()}
                        </span>
                        {pricesLoading && (
                          <div className="w-5 h-5 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                        )}
                      </div>
                    </div>
                    
                    <div className="rounded-lg overflow-hidden">
                      <PriceChartLW
                        symbol={selectedCoin}
                        height={460}
                        showVolume={chartType === 'candlestick'}
                        timeframe={selectedTimeframe}
                        chartType={chartType}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!selectedCoin && (
                <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-12 text-center">
                  <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-white/40 text-lg font-medium mb-2">Выберите монету</h3>
                  <p className="text-white/20 text-sm">Нажмите на монету в списке ниже, чтобы увидеть её график</p>
                </div>
              )}

              {/* Coin listing table in Russian layout */}
              <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-[#1a1a1a] flex items-center gap-3 flex-wrap justify-between">
                  {/* Left elements: Search + Filter tabs */}
                  <div className="flex items-center gap-3 flex-wrap flex-1">
                    <div className="flex items-center gap-2 bg-[#1a1a1a] rounded px-3 py-1.5 w-full max-w-xs">
                      <Search size={13} className="text-white/30" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск монеты..."
                        className="bg-transparent text-white/70 text-sm outline-none placeholder-white/25 w-full"
                      />
                    </div>
                    <div 
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                      className="flex items-center gap-1.5 overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden py-1"
                    >
                      {FILTERS.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setCryptoFilter(tab)}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            cryptoFilter === tab
                              ? "bg-[#222222] text-white font-bold"
                              : "text-white/40 hover:text-white hover:bg-[#1e1e1e]/40"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Table headers inside cryptocurrency tab */}
                <div className="hidden md:grid grid-cols-[2.5rem_1.3fr_1.3fr_1fr_1.3fr_1.3fr_100px] gap-4 px-4 py-3 border-b border-[#1a1a1a]">
                  {[
                    { label: '#', key: 'rank' },
                    { label: 'Имя', key: null },
                    { label: 'Цена', key: 'price' },
                    { label: 'Изменить', key: 'change' },
                    { label: 'Рыночная капитализация', key: null },
                    { label: 'Объём 24ч', key: 'volume' },
                    { label: 'Последние 24 часа', key: null },
                  ].map((h, index) => (
                    <button
                      key={index}
                      onClick={() => h.key && toggleSort(h.key as any)}
                      className={`flex items-center gap-1 text-white/30 text-xs hover:text-white/60 transition-colors ${
                        index === 4 || index === 5 ? 'justify-start' : ''
                      }`}
                    >
                      {h.label}
                      {h.key && <ArrowUpDown size={10} className={sortBy === h.key ? "text-blue-400" : ""} />}
                    </button>
                  ))}
                </div>

                {/* Rows mapping exactly 10 coins */}
                <div className="divide-y divide-[#151515]">
                  {paginatedPrices.map((coin, i) => {
                    const priceInUSD = coin.current_price
                    const priceInRUB = coin.current_price * USD_TO_RUB
                    const isPositive = (coin.price_change_percentage_24h || 0) >= 0

                    return (
                      <div
                        key={coin.symbol}
                        onClick={() => handleSelectCoin(coin.symbol)}
                        className={`grid md:grid-cols-[2.5rem_1.3fr_1.3fr_1fr_1.3fr_1.3fr_100px] grid-cols-[1fr_1fr_1fr] gap-4 px-4 py-3.5 transition-colors cursor-pointer items-center border-b border-[#121212]/30 ${
                          selectedCoin === coin.symbol ? 'bg-blue-500/10' : 'hover:bg-[#151515]'
                        }`}
                      >
                        {/* # Row */}
                        <span className="text-white/30 text-xs font-mono hidden md:block">{coin.market_cap_rank || i + 1}</span>

                        {/* Name column */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center text-xs font-bold text-white/60 flex-shrink-0">
                            {coin.symbol.charAt(0)}
                          </div>
                          <div>
                            <div className="text-white text-sm font-semibold">{coin.symbol}</div>
                            <div className="text-white/40 text-[10px] hidden sm:block">{coin.name}</div>
                          </div>
                        </div>

                        {/* Price column - stacked showing both USD and RUB nicely */}
                        <div className="flex flex-col justify-center">
                          <span className="text-white font-semibold font-mono text-sm">
                            {activeCurrency === 'USD' 
                              ? formatDynamicPrice(priceInUSD, 'USD') 
                              : formatDynamicPrice(priceInUSD, 'RUB')
                            }
                          </span>
                          <span className="text-white/40 font-mono text-[10px]">
                            {activeCurrency === 'USD' 
                              ? formatDynamicPrice(priceInUSD, 'RUB') 
                              : formatDynamicPrice(priceInUSD, 'USD')
                            }
                          </span>
                        </div>

                        {/* Change column */}
                        <div
                          className={`font-mono text-sm flex items-center gap-1 font-medium ${
                            isPositive ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {isPositive ? '+' : ''}{(coin.price_change_percentage_24h || 0).toFixed(2)}%
                        </div>

                        {/* Cap column */}
                        <div className="text-white/70 text-sm font-mono hidden md:block">
                          {formatDynamicVolume(coin.market_cap, activeCurrency)}
                        </div>

                        {/* Volume column */}
                        <div className="text-white/70 text-sm font-mono hidden md:block">
                          {formatDynamicVolume(coin.total_volume, activeCurrency)}
                        </div>

                        {/* Mini Sparkline Chart */}
                        <div className="w-24 h-10 hidden md:block">
                          <MiniChart
                            symbol={coin.symbol}
                            height={40}
                            width={96}
                          />
                        </div>
                      </div>
                    )
                  })}

                  {paginatedPrices.length === 0 && (
                    <div className="text-center py-12 text-white/20 text-sm">
                      Монеты не найдены
                    </div>
                  )}
                </div>

                {/* Custom paginator styled matching the OKX screenshot: < 1 2 3 ... 17 > */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 py-4 border-t border-[#1a1a1a] bg-[#111111] select-none">
                    {/* Previous button */}
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 disabled:hover:bg-transparent font-medium text-base"
                    >
                      &lt;
                    </button>

                    {getPageNumbers().map((page, idx) => {
                      if (page === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-1.5 text-white/30 font-mono text-sm">
                            ...
                          </span>
                        )
                      }

                      const isActive = page === currentPage
                      return (
                        <button
                          key={`page-${page}`}
                          onClick={() => setCurrentPage(page as number)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200 ${
                            isActive
                              ? 'bg-white text-black font-bold shadow-md scale-105'
                              : 'text-white/60 hover:text-white hover:bg-white/5 font-mono'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}

                    {/* Next button */}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 disabled:hover:bg-transparent font-medium text-base"
                    >
                      &gt;
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dex-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* DEX Warning Banner */}
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3.5 flex items-start gap-3">
                <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-400/80 text-xs leading-relaxed">
                  DEX монеты крайне рискованны. Всегда проверяй аудит смарт-контракта, распределение холдеров и ликвидность.
                  Honeypot = невозможность продать токен. Не инвестируй больше, чем готов потерять.
                </p>
              </div>

              {/* DEX statistics widgets */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Новых в выдаче", value: String(dexTokens.length), icon: <Zap size={13} className="text-yellow-400" /> },
                  { label: "Безопасных", value: String(dexTokens.filter((t) => t.scamScore < 25).length), icon: <Shield size={13} className="text-emerald-400" /> },
                  { label: "Honeypot", value: String(dexTokens.filter((t) => t.honeypot).length), icon: <AlertTriangle size={13} className="text-red-400" /> },
                  { label: "Резерв ликвидности", value: formatDynamicVolume(dexTokens.reduce((s, t) => s + t.liquidity, 0), activeCurrency), icon: <Eye size={13} className="text-blue-400" /> },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-3.5"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {s.icon}
                      <span className="text-white/40 text-xs">{s.label}</span>
                    </div>
                    <div className="text-white font-mono font-bold text-lg">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* DEX Core Controller and Tables */}
              <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-[#1a1a1a] flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-[#1a1a1a] rounded px-3 py-1.5 flex-1 min-w-[200px] max-w-xs">
                    <Search size={13} className="text-white/30" />
                    <input
                      value={dexSearch}
                      onChange={(e) => setDexSearch(e.target.value)}
                      placeholder="Поиск токена..."
                      className="bg-transparent text-white/70 text-sm outline-none placeholder-white/20 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {dexFilters.map((f) => (
                      <button
                        key={f}
                        onClick={() => setDexFilter(f)}
                        className={`px-3 py-1.5 rounded text-xs transition-colors ${
                          dexFilter === f
                            ? "bg-blue-600 text-white font-semibold"
                            : "text-white/40 hover:text-white hover:bg-[#1a1a1a]"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop layout headers */}
                <div className="hidden lg:grid lg:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 border-b border-[#1a1a1a]">
                  {["Имя", "Цена", "Изменить", "Рыночная капитализация", "Ликвидность", "Scam Score", "Риск rug", "Прогноз AI", "Источник"].map((h) => (
                    <span key={h} className="text-white/30 text-xs flex items-center gap-1">
                      {h}
                      {h === "Прогноз AI" && <Brain size={10} className="text-blue-400" />}
                    </span>
                  ))}
                </div>

                {/* DEX items mapping */}
                <div className="divide-y divide-[#151515]">
                  {filteredDexTokens.map((coin, i) => {
                    const forecast = generateForecast(coin)
                    return (
                      <div
                        key={coin.symbol}
                        className="grid lg:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_1fr_1fr_1fr_1fr] grid-cols-1 gap-3 px-4 py-4 hover:bg-[#151515] transition-colors items-center"
                      >
                        {/* Token name */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-[#2a2a2a] flex items-center justify-center text-xs font-bold text-white/70 flex-shrink-0">
                            {coin.symbol.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-white text-sm font-semibold">{coin.symbol}</span>
                              {coin.honeypot && (
                                <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1 rounded font-bold">HP</span>
                              )}
                            </div>
                            <div className="text-white/30 text-[10px]">{coin.age}</div>
                          </div>
                        </div>

                        {/* Price formatted with USD/RUB toggle */}
                        <div className="flex flex-col">
                          <span className="text-white font-semibold font-mono text-xs">
                            {formatDynamicPrice(coin.price, activeCurrency)}
                          </span>
                          <span className="text-white/30 font-mono text-[9px] mt-0.5">
                            {activeCurrency === 'USD' 
                              ? formatDynamicPrice(coin.price, 'RUB') 
                              : formatDynamicPrice(coin.price, 'USD')
                            }
                          </span>
                        </div>

                        {/* 24h change */}
                        <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${coin.positive ? "text-emerald-400" : "text-red-400"}`}>
                          {coin.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {coin.change24h >= 0 ? "+" : ""}{coin.change24h.toFixed(2)}%
                        </div>

                        {/* Cap */}
                        <div className="text-white/70 text-xs font-mono">
                          {formatDynamicVolume(coin.marketCap, activeCurrency)}
                        </div>

                        {/* Liquidity */}
                        <div className="text-white/70 text-xs font-mono">
                          {formatDynamicVolume(coin.liquidity, activeCurrency)}
                        </div>

                        {/* Scam index */}
                        <div>
                          <ScamScore score={coin.scamScore} />
                        </div>

                        {/* Rug indicators */}
                        <div>
                          <RugRisk risk={coin.rugRisk} />
                          <div className="text-[10px] text-white/35 mt-0.5">Heuristic</div>
                        </div>

                        {/* Forecast badge */}
                        <div className="flex flex-col gap-1">
                          <ForecastBadge forecast={forecast} />
                          <div className="text-[10px] text-white/45 font-mono">
                            Цель: {formatDynamicPrice(forecast.target, activeCurrency)}
                          </div>
                        </div>

                        {/* Source page link */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/30 text-xs font-medium">{coin.source}</span>
                          {coin.url && (
                            <a href={coin.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded hover:bg-white/5">
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {filteredDexTokens.length === 0 && (
                    <div className="px-4 py-11 text-white/30 text-sm text-center bg-[#111111]/40">
                      {dexLoading ? "Загрузка DEX-потока..." : "Нет токенов по выбранному фильтру"}
                    </div>
                  )}
                </div>
              </div>

              {/* Footnotes and update logic */}
              <div className="flex items-center justify-between flex-wrap gap-3 mt-3">
                <button onClick={refreshDex} className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1.5 bg-[#161616] border border-[#222222] px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                  <RefreshCw size={11} className={dexLoading ? 'animate-spin' : ''} />
                  Обновить DEX
                </button>
                {dexError && <span className="text-red-400 text-xs">Ошибка соединения: {dexError}</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Dynamic contextual AI helper chatbot */}
      <AIChat />
    </>
  )
}
