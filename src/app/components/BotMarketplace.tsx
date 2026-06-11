'use client'

import { useState, useEffect } from 'react'
import { Bot, Users, TrendingUp, Shield, Zap, Star, Plus, Search, Filter } from 'lucide-react'
import { useBotManagement, TradingBot, SignalBot, WalletBot } from '../hooks/useBotManagement'

interface BotMarketplaceProps {
  className?: string
}

export function BotMarketplace({ className = '' }: BotMarketplaceProps) {
  const {
    signalBots,
    walletBots,
    loading,
    createSignalBot,
    createWalletBot,
    getSampleBots
  } = useBotManagement()
  
  const [bots, setBots] = useState<TradingBot[]>([])
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'signal' | 'wallet' | 'arbitrage'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'performance' | 'subscribers' | 'newest'>('performance')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBotType, setNewBotType] = useState<'signal' | 'wallet'>('signal')

  useEffect(() => {
    const sampleBots = getSampleBots()
    setBots(sampleBots)
  }, [getSampleBots])

  const filteredBots = bots.filter(bot => {
    const matchesCategory = selectedCategory === 'all' || bot.type === selectedCategory
    const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bot.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const sortedBots = [...filteredBots].sort((a, b) => {
    switch (sortBy) {
      case 'performance':
        return b.performance.totalReturn - a.performance.totalReturn
      case 'subscribers':
        return b.subscription.subscribers - a.subscription.subscribers
      case 'newest':
        return b.createdAt - a.createdAt
      default:
        return 0
    }
  })

  const getPerformanceColor = (value: number) => {
    if (value >= 30) return 'text-green-400'
    if (value >= 10) return 'text-emerald-400'
    if (value >= 0) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getWinRateColor = (value: number) => {
    if (value >= 80) return 'text-green-400'
    if (value >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getSubscriptionBadge = (type: string) => {
    switch (type) {
      case 'free':
        return 'bg-green-500'
      case 'premium':
        return 'bg-blue-500'
      case 'enterprise':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  const handleCreateBot = async (botData: any) => {
    try {
      if (newBotType === 'signal') {
        await createSignalBot(botData)
      } else {
        await createWalletBot(botData)
      }
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating bot:', error)
    }
  }

  return (
    <div className={`bg-[#111111] border border-[#1e1e1e] rounded-lg p-4 md:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
          <Bot className="w-6 h-6 text-[#00D084]" />
          <h2 className="text-xl md:text-2xl font-bold text-white">Bot Marketplace</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#00D084] hover:bg-[#00b876] text-white rounded-lg px-4 py-2 flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Bot</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bots..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md pl-10 pr-4 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D084]"
          >
            <option value="all">All Bots</option>
            <option value="signal">Signal Bots</option>
            <option value="wallet">Wallet Bots</option>
            <option value="arbitrage">Arbitrage Bots</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D084]"
          >
            <option value="performance">Best Performance</option>
            <option value="subscribers">Most Popular</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {/* Bot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedBots.map((bot) => (
          <div key={bot.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00D084]/50 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-[#00D084] rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium">{bot.name}</h3>
                  <div className="flex items-center space-x-1">
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${getSubscriptionBadge(bot.subscription.type)}`}>
                      {bot.subscription.type.toUpperCase()}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      bot.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                    }`}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-white/60 text-sm mb-4 line-clamp-2">
              {bot.description}
            </p>

            {/* Performance */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#111111] rounded-lg p-2 text-center">
                <div className="text-white/60 text-xs mb-1">Return</div>
                <div className={`text-sm font-bold ${getPerformanceColor(bot.performance.totalReturn)}`}>
                  {bot.performance.totalReturn > 0 ? '+' : ''}{bot.performance.totalReturn}%
                </div>
              </div>
              <div className="bg-[#111111] rounded-lg p-2 text-center">
                <div className="text-white/60 text-xs mb-1">Win Rate</div>
                <div className={`text-sm font-bold ${getWinRateColor(bot.performance.winRate)}`}>
                  {bot.performance.winRate}%
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-white/60 mb-4">
              <div className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{bot.subscription.subscribers.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>{bot.performance.tradesCount} trades</span>
              </div>
            </div>

            {/* Risk Level */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/60 text-xs">Risk Level</span>
              <span className={`text-xs font-medium ${
                bot.settings.riskLevel === 'low' ? 'text-green-400' :
                bot.settings.riskLevel === 'high' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {bot.settings.riskLevel.toUpperCase()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button className="flex-1 bg-[#00D084] hover:bg-[#00b876] text-white rounded-md py-2 text-sm font-medium transition-colors">
                {bot.subscription.type === 'free' ? 'Add to Community' : 'Subscribe'}
              </button>
              <button className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md p-2 transition-colors">
                <Star className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00D084] border-t-transparent"></div>
        </div>
      )}

      {/* Create Bot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Create New Bot</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-2">Bot Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewBotType('signal')}
                    className={`p-3 rounded-lg border transition-colors ${
                      newBotType === 'signal' 
                        ? 'bg-[#00D084] border-[#00D084]' 
                        : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#00D084]'
                    }`}
                  >
                    <Zap className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm">Signal Bot</span>
                  </button>
                  <button
                    onClick={() => setNewBotType('wallet')}
                    className={`p-3 rounded-lg border transition-colors ${
                      newBotType === 'wallet' 
                        ? 'bg-[#00D084] border-[#00D084]' 
                        : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#00D084]'
                    }`}
                  >
                    <Shield className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm">Wallet Bot</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Bot Name</label>
                <input
                  type="text"
                  placeholder="Enter bot name..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Description</label>
                <textarea
                  placeholder="Describe your bot..."
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md py-2 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateBot({})}
                className="flex-1 bg-[#00D084] hover:bg-[#00b876] text-white rounded-md py-2 font-medium transition-colors"
              >
                Create Bot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
