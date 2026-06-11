'use client'

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import {
  Wallet, ArrowUpRight, ArrowDownRight, Plus, X, Trash2,
  TrendingUp, TrendingDown, Search, PieChart, ChevronDown, ChevronUp,
  Activity, DollarSign, Layers
} from 'lucide-react'
import { useMarketPrices, formatPrice } from '../hooks/useMarketPrices'

interface PortfolioCoin {
  id: string
  symbol: string
  name: string
  amount: number
  avgBuyPrice: number
  addedAt: number
}

export default function Exchanges() {
  const [portfolio, setPortfolio] = useState<PortfolioCoin[]>([
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', amount: 0.25, avgBuyPrice: 42000, addedAt: Date.now() },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', amount: 2.5, avgBuyPrice: 2800, addedAt: Date.now() },
    { id: 'solana', symbol: 'SOL', name: 'Solana', amount: 45, avgBuyPrice: 95, addedAt: Date.now() },
  ])
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'profit' | 'loss'>('all')
  const [expandedCoin, setExpandedCoin] = useState<string | null>(null)
  const { prices } = useMarketPrices()

  // Формы добавления
  const [selectedCoin, setSelectedCoin] = useState('')
  const [amount, setAmount] = useState('')
  const [buyPrice, setBuyPrice] = useState('')

  // Рассчитываем стоимость портфеля
  const portfolioWithPrices = useMemo(() => {
    return portfolio.map(coin => {
      const priceData = prices.find(p => p.id === coin.id)
      const currentPrice = priceData?.current_price || coin.avgBuyPrice
      const value = coin.amount * currentPrice
      const invested = coin.amount * coin.avgBuyPrice
      const pnl = value - invested
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0
      
      return {
        ...coin,
        currentPrice,
        value,
        pnl,
        pnlPercent,
        priceChange24h: priceData?.price_change_percentage_24h || 0
      }
    })
  }, [portfolio, prices])

  const totalValue = portfolioWithPrices.reduce((sum, c) => sum + c.value, 0)
  const totalInvested = portfolioWithPrices.reduce((sum, c) => sum + (c.amount * c.avgBuyPrice), 0)
  const totalPnl = totalValue - totalInvested
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

  const filteredCoins = portfolioWithPrices.filter(c => {
    if (searchQuery && !c.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (activeFilter === 'profit' && c.pnlPercent <= 0) return false
    if (activeFilter === 'loss' && c.pnlPercent >= 0) return false
    return true
  })

  const handleAddCoin = () => {
    if (!selectedCoin || !amount || !buyPrice) return
    const coin = prices.find(c => c.id === selectedCoin)
    if (!coin) return

    setPortfolio(prev => [...prev, {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      amount: parseFloat(amount),
      avgBuyPrice: parseFloat(buyPrice),
      addedAt: Date.now()
    }])
    setShowAddModal(false)
    setSelectedCoin('')
    setAmount('')
    setBuyPrice('')
  }

  const handleDeleteCoin = (id: string) => {
    setPortfolio(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 md:mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center border border-emerald-500/20">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Мой портфель</h1>
            <p className="text-white/50 text-sm md:text-base">Отслеживайте ваши криптоактивы и P&L</p>
          </div>
        </div>
      </motion.div>

      {/* Общая статистика */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6"
      >
        {/* Общая стоимость */}
        <div className="glass card-hover rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <DollarSign size={16} className="text-blue-400" />
            </div>
            <span className="text-white/50 text-xs font-medium">Общая стоимость</span>
          </div>
          <div className="text-2xl font-bold text-white">${formatPrice(totalValue)}</div>
          <div className={`text-sm mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-full inline-flex ${totalPnlPercent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {totalPnlPercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
          </div>
        </div>

        {/* Всего инвестировано */}
        <div className="glass card-hover rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Layers size={16} className="text-purple-400" />
            </div>
            <span className="text-white/50 text-xs font-medium">Всего инвестировано</span>
          </div>
          <div className="text-2xl font-bold text-white">${formatPrice(totalInvested)}</div>
          <div className="text-sm text-white/40 mt-1">Базовая стоимость</div>
        </div>

        {/* P&L */}
        <div className="glass card-hover rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${totalPnl >= 0 ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-400/10' : 'bg-gradient-to-br from-red-500/20 to-red-400/10'}`}>
              {totalPnl >= 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-red-400" />}
            </div>
            <span className="text-white/50 text-xs font-medium">Прибыль/Убыток</span>
          </div>
          <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}${formatPrice(Math.abs(totalPnl))}
          </div>
          <div className={`text-sm mt-1 ${totalPnl >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
            {totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
          </div>
        </div>

        {/* Активов */}
        <div className="glass card-hover rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center">
              <PieChart size={16} className="text-orange-400" />
            </div>
            <span className="text-white/50 text-xs font-medium">Активов</span>
          </div>
          <div className="text-2xl font-bold text-white">{portfolio.length}</div>
          <div className="text-sm text-white/40 mt-1">монет в портфеле</div>
        </div>
      </motion.div>

      {/* График портфеля */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6"
      >
        <div className="lg:col-span-2 glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <Activity size={16} className="text-blue-400" />
            </div>
            <h3 className="text-white font-medium">Динамика портфеля</h3>
          </div>
          <div className="h-48 flex items-center justify-center glass-light rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                <Activity size={24} className="text-white/20" />
              </div>
              <div className="text-white/40 text-sm">График портфеля скоро будет доступен</div>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <PieChart size={16} className="text-purple-400" />
            </div>
            <h3 className="text-white font-medium">Распределение</h3>
          </div>
          <div className="space-y-3">
            {portfolioWithPrices.slice(0, 5).map((coin, index) => (
              <motion.div 
                key={coin.id} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-400"></div>
                  <span className="text-white text-sm font-medium">{coin.symbol}</span>
                </div>
                <div className="text-white/60 text-sm">
                  {((coin.value / totalValue) * 100).toFixed(1)}%
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Список активов */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-xl p-4 md:p-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 flex items-center justify-center">
              <Layers size={16} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Активы</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center glass-light rounded-lg px-3 py-1.5">
              <Search size={14} className="text-white/40 mr-2" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск монет..."
                className="bg-transparent text-white text-sm outline-none placeholder-white/30 w-full sm:w-40"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'profit', 'loss'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 btn-press ${
                    activeFilter === f
                      ? f === 'profit' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25' :
                        f === 'loss' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/25' :
                        'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'glass-light text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {f === 'all' ? 'Все' : f === 'profit' ? 'В плюсе' : 'В минусе'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg px-4 py-1.5 text-sm flex items-center gap-1.5 transition-all duration-300 btn-press shadow-lg shadow-blue-500/20"
            >
              <Plus size={16} />
              Добавить
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10">
                <th className="text-left py-3 px-2 font-medium">Актив</th>
                <th className="text-right py-3 px-2 font-medium">Количество</th>
                <th className="text-right py-3 px-2 hidden sm:table-cell font-medium">Цена покупки</th>
                <th className="text-right py-3 px-2 font-medium">Текущая цена</th>
                <th className="text-right py-3 px-2 font-medium">Стоимость</th>
                <th className="text-right py-3 px-2 font-medium">P&L</th>
                <th className="text-right py-3 px-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoins.map((coin, index) => (
                <>
                  <motion.tr 
                    key={coin.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.03 }}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => setExpandedCoin(expandedCoin === coin.id ? null : coin.id)}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600/20 to-blue-400/10 flex items-center justify-center text-xs font-bold text-blue-400 border border-blue-500/20">
                          {coin.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-white font-medium">{coin.symbol}</div>
                          <div className="text-white/40 text-xs">{coin.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 text-white/80">{coin.amount}</td>
                    <td className="text-right py-3 px-2 text-white/50 hidden sm:table-cell">${formatPrice(coin.avgBuyPrice)}</td>
                    <td className="text-right py-3 px-2">
                      <div className="text-white/80">${formatPrice(coin.currentPrice)}</div>
                      <div className={`text-xs inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full mt-1 ${coin.priceChange24h >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {coin.priceChange24h >= 0 ? '+' : ''}{coin.priceChange24h.toFixed(2)}%
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 text-white font-medium">${formatPrice(coin.value)}</td>
                    <td className="text-right py-3 px-2">
                      <div className={`${coin.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {coin.pnlPercent >= 0 ? '+' : ''}{coin.pnlPercent.toFixed(1)}%
                      </div>
                      <div className={`text-xs ${coin.pnlPercent >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                        {coin.pnl >= 0 ? '+' : ''}${formatPrice(Math.abs(coin.pnl))}
                      </div>
                    </td>
                    <td className="text-right py-3 px-2">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-white/30 hover:text-white transition-colors">
                          {expandedCoin === coin.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCoin(coin.id) }}
                          className="text-white/30 hover:text-red-400 transition-colors p-1 hover:bg-red-500/10 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                  {expandedCoin === coin.id && (
                    <tr className="bg-white/5">
                      <td colSpan={7} className="py-4 px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="glass-light rounded-lg p-3">
                            <div className="text-white/40 text-xs mb-1">Вложено</div>
                            <div className="text-white font-medium">${formatPrice(coin.amount * coin.avgBuyPrice)}</div>
                          </div>
                          <div className="glass-light rounded-lg p-3">
                            <div className="text-white/40 text-xs mb-1">Текущая стоимость</div>
                            <div className="text-white font-medium">${formatPrice(coin.value)}</div>
                          </div>
                          <div className="glass-light rounded-lg p-3">
                            <div className="text-white/40 text-xs mb-1">Доля в портфеле</div>
                            <div className="text-white font-medium">{((coin.value / totalValue) * 100).toFixed(1)}%</div>
                          </div>
                          <div className="glass-light rounded-lg p-3">
                            <div className="text-white/40 text-xs mb-1">Добавлено</div>
                            <div className="text-white font-medium">{new Date(coin.addedAt).toLocaleDateString('ru-RU')}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Модал добавления */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-400/10 flex items-center justify-center">
                  <Plus size={20} className="text-blue-400" />
                </div>
                <h3 className="text-white font-semibold text-lg">Добавить монету</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-white/40 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-5 mb-6">
              <div>
                <label className="text-white/60 text-sm block mb-2 font-medium">Монета</label>
                <select
                  value={selectedCoin}
                  onChange={(e) => setSelectedCoin(e.target.value)}
                  className="w-full glass-light rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 cursor-pointer transition-smooth"
                >
                  <option value="" className="bg-[#1a1a1a]">Выберите монету</option>
                  {prices.sort((a, b) => b.market_cap - a.market_cap).map(coin => (
                    <option key={coin.id} value={coin.id} className="bg-[#1a1a1a]">
                      {coin.symbol} - {coin.name} (${formatPrice(coin.current_price)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-white/60 text-sm block mb-2 font-medium">Количество</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="any"
                  className="w-full glass-light rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 placeholder-white/20 transition-smooth"
                />
              </div>
              
              <div>
                <label className="text-white/60 text-sm block mb-2 font-medium">Цена покупки ($)</label>
                <input
                  type="number"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="0.00"
                  step="any"
                  className="w-full glass-light rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 placeholder-white/20 transition-smooth"
                />
                {selectedCoin && prices.find(c => c.id === selectedCoin) && (
                  <button
                    onClick={() => setBuyPrice(prices.find(c => c.id === selectedCoin)?.current_price.toString() || '')}
                    className="text-blue-400 text-xs mt-2 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Activity size={12} />
                    Использовать текущую цену
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-white/5 text-white/70 rounded-xl text-sm font-medium hover:bg-white/10 transition-all duration-300 btn-press"
              >
                Отмена
              </button>
              <button
                onClick={handleAddCoin}
                disabled={!selectedCoin || !amount || !buyPrice}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all duration-300 btn-press shadow-lg shadow-blue-500/25"
              >
                Добавить
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
