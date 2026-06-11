'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { PriceChartLW } from '../components/PriceChartLW'
import { AIChat } from '../components/AIChat'
import { useMarketPrices, formatPrice, formatVolume } from '../hooks/useMarketPrices'
import { useSearchParams } from 'react-router'
import { TrendingUp, TrendingDown, BarChart3, CandlestickChart, Activity, Search, ArrowUpDown } from 'lucide-react'

const TIMEFRAMES = [
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
] as const

export default function Charts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedCoin, setSelectedCoin] = useState<string | null>(searchParams.get('coin')?.toUpperCase() || null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '4h' | '1d' | '1w' | '1m'>('1d')
  const [chartType, setChartType] = useState<'candlestick' | 'area'>('candlestick')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'rank' | 'price' | 'change' | 'volume'>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers'>('all')
  const chartRef = useRef<HTMLDivElement | null>(null)
  
  const { prices, loading: pricesLoading } = useMarketPrices()
  
  const selectedCoinData = selectedCoin ? prices.find(p => p.symbol === selectedCoin) : null

  const filteredPrices = useMemo(() => {
    let list = prices.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.symbol.toLowerCase().includes(search.toLowerCase())
    )
    if (filter === 'gainers') list = list.filter((p) => (p.price_change_percentage_24h || 0) >= 0)
    if (filter === 'losers') list = list.filter((p) => (p.price_change_percentage_24h || 0) < 0)
    return list.sort((a, b) => {
      let va = 0, vb = 0
      if (sortBy === 'rank') { va = a.market_cap_rank; vb = b.market_cap_rank }
      else if (sortBy === 'price') { va = a.current_price; vb = b.current_price }
      else if (sortBy === 'change') { va = a.price_change_percentage_24h || 0; vb = b.price_change_percentage_24h || 0 }
      else if (sortBy === 'volume') { va = a.total_volume; vb = b.total_volume }
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }, [prices, search, sortBy, sortDir, filter])

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
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-white text-xl font-semibold mb-1">Рынок</h1>
            <p className="text-white/40 text-sm">Выберите монету для просмотра графика</p>
          </div>
        </div>

        {/* Chart Section */}
        {selectedCoin && selectedCoinData && (
          <motion.div
            ref={chartRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mb-6"
          >
            {/* Chart Controls */}
            <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                {/* Current Price Display */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white/40 text-xs">Текущая цена</div>
                    <div className="text-2xl font-bold text-white">
                      ${formatPrice(selectedCoinData.current_price)}
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
          </motion.div>
        )}

        {!selectedCoin && (
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-12 text-center">
            <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-white/40 text-lg font-medium mb-2">Выберите монету</h3>
            <p className="text-white/20 text-sm">Нажмите на монету в списке выше, чтобы увидеть её график</p>
          </div>
        )}

        {/* Coin List */}
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg overflow-hidden mb-6">
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
            <div className="flex items-center gap-2">
              <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded text-xs ${filter === 'all' ? 'bg-blue-600/20 text-blue-400' : 'text-white/50 hover:text-white'}`}>Все</button>
              <button onClick={() => setFilter('gainers')} className={`px-3 py-1.5 rounded text-xs ${filter === 'gainers' ? 'bg-emerald-600/20 text-emerald-400' : 'text-white/50 hover:text-white'}`}>Gainers</button>
              <button onClick={() => setFilter('losers')} className={`px-3 py-1.5 rounded text-xs ${filter === 'losers' ? 'bg-red-600/20 text-red-400' : 'text-white/50 hover:text-white'}`}>Losers</button>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_100px] gap-4 px-4 py-2.5 border-b border-[#1a1a1a]">
            {[
              { label: '#', key: 'rank' },
              { label: 'Монета', key: null },
              { label: 'Цена', key: 'price' },
              { label: '24ч', key: 'change' },
              { label: 'Кап.', key: null },
              { label: 'Объём 24ч', key: 'volume' },
              { label: '', key: null },
            ].map((h) => (
              <button
                key={h.label}
                onClick={() => h.key && toggleSort(h.key as any)}
                className="flex items-center gap-1 text-white/30 text-xs hover:text-white/60 transition-colors"
              >
                {h.label}
                {h.key && <ArrowUpDown size={10} className={sortBy === h.key ? 'text-blue-400' : ''} />}
              </button>
            ))}
          </div>

          <div>
            {filteredPrices.map((coin, i) => (
              <motion.div
                key={coin.symbol}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.01 }}
                className={`grid md:grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_100px] grid-cols-[1fr_1fr_1fr] gap-4 px-4 py-3.5 border-b border-[#0f0f0f] transition-colors cursor-pointer items-center ${
                  selectedCoin === coin.symbol ? 'bg-blue-500/10' : 'hover:bg-[#151515]'
                }`}
                onClick={() => handleSelectCoin(coin.symbol)}
              >
                <span className="text-white/30 text-xs font-mono hidden md:block">{coin.market_cap_rank}</span>
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
                  <span className="text-white font-mono text-sm">{formatPrice(coin.current_price)}</span>
                </div>
                <div className={`font-mono text-sm flex items-center gap-1 ${(coin.price_change_percentage_24h || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(coin.price_change_percentage_24h || 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {(coin.price_change_percentage_24h || 0) >= 0 ? '+' : ''}{(coin.price_change_percentage_24h || 0).toFixed(2)}%
                </div>
                <div className="text-white/60 text-sm font-mono hidden md:block">{formatVolume(coin.market_cap)}</div>
                <div className="text-white/60 text-sm font-mono hidden md:block">{formatVolume(coin.total_volume)}</div>
                <div className="flex items-center justify-center">
                  {selectedCoin === coin.symbol && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* AI Chat */}
      <AIChat />
    </>
  )
}
