'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Clock, Target, AlertTriangle, CheckCircle, XCircle, Play, Pause, Settings, Send } from 'lucide-react'
import { useBotManagement, Signal, SignalBot } from '../hooks/useBotManagement'

interface SignalManagerProps {
  className?: string
}

export function SignalManager({ className = '' }: SignalManagerProps) {
  const { signalBots, generateSignal } = useBotManagement()
  const [selectedBot, setSelectedBot] = useState<SignalBot | null>(null)
  const [activeSignals, setActiveSignals] = useState<Signal[]>([])
  const [showCreateSignal, setShowCreateSignal] = useState(false)
  const [newSignal, setNewSignal] = useState<Partial<Signal>>({})

  // Sample signals
  const sampleSignals: Signal[] = [
    {
      id: 'signal_1',
      type: 'buy',
      symbol: 'BTC',
      entryPrice: 45000,
      targets: [47000, 49000, 52000],
      stopLoss: 42000,
      confidence: 85,
      reasoning: 'Strong bullish momentum with RSI oversold and MACD crossover',
      timeframe: '4h',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      status: 'active',
      result: undefined
    },
    {
      id: 'signal_2',
      type: 'sell',
      symbol: 'ETH',
      entryPrice: 3200,
      targets: [3000, 2800, 2500],
      stopLoss: 3400,
      confidence: 72,
      reasoning: 'Bearish divergence on RSI with decreasing volume',
      timeframe: '1d',
      timestamp: Date.now() - 6 * 60 * 60 * 1000,
      status: 'closed',
      result: {
        exitPrice: 2950,
        profit: -250,
        profitPercent: -7.8
      }
    },
    {
      id: 'signal_3',
      type: 'buy',
      symbol: 'SOL',
      entryPrice: 105,
      targets: [115, 130, 145],
      stopLoss: 95,
      confidence: 68,
      reasoning: 'Breakout from consolidation with increasing volume',
      timeframe: '1h',
      timestamp: Date.now() - 30 * 60 * 1000,
      status: 'active',
      result: undefined
    }
  ]

  useEffect(() => {
    setActiveSignals(sampleSignals)
  }, [])

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'sell':
        return <TrendingDown className="w-4 h-4 text-red-400" />
      default:
        return <Minus className="w-4 h-4 text-yellow-400" />
    }
  }

  const getSignalColor = (type: string) => {
    switch (type) {
      case 'buy':
        return 'text-green-400 bg-green-400/20 border-green-400/30'
      case 'sell':
        return 'text-red-400 bg-red-400/20 border-red-400/30'
      default:
        return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="w-3 h-3 text-green-400" />
      case 'closed':
        return <CheckCircle className="w-3 h-3 text-blue-400" />
      case 'cancelled':
        return <XCircle className="w-3 h-3 text-red-400" />
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400'
    if (confidence >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`
    }
    return `${minutes}m ago`
  }

  const handleCreateSignal = async () => {
    try {
      if (selectedBot && newSignal.type && newSignal.symbol && newSignal.entryPrice) {
        await generateSignal(selectedBot.id, newSignal as Signal)
        setShowCreateSignal(false)
        setNewSignal({})
      }
    } catch (error) {
      console.error('Error creating signal:', error)
    }
  }

  const handlePostToCommunity = (signalId: string) => {
    console.log('Posting signal to community:', signalId)
    // Implementation for posting to community
  }

  return (
    <div className={`bg-[#111111] border border-[#1e1e1e] rounded-lg p-4 md:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
          <Target className="w-6 h-6 text-[#00D084]" />
          <h2 className="text-xl md:text-2xl font-bold text-white">Signal Manager</h2>
        </div>
        <button
          onClick={() => setShowCreateSignal(true)}
          className="bg-[#00D084] hover:bg-[#00b876] text-white rounded-lg px-4 py-2 flex items-center space-x-2 transition-colors"
        >
          <Send className="w-4 h-4" />
          <span>Create Signal</span>
        </button>
      </div>

      {/* Signal Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <div className="text-white/60 text-xs mb-1">Active Signals</div>
          <div className="text-xl font-bold text-white">12</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <div className="text-white/60 text-xs mb-1">Win Rate</div>
          <div className="text-xl font-bold text-green-400">78%</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <div className="text-white/60 text-xs mb-1">Avg Profit</div>
          <div className="text-xl font-bold text-emerald-400">+3.2%</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <div className="text-white/60 text-xs mb-1">Today's Signals</div>
          <div className="text-xl font-bold text-white">5</div>
        </div>
      </div>

      {/* Signals List */}
      <div className="space-y-4">
        {activeSignals.map((signal) => (
          <div key={signal.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg border ${getSignalColor(signal.type)}`}>
                  {getSignalIcon(signal.type)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-white font-medium">{signal.symbol}</h3>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(signal.status)}
                      <span className="text-xs text-white/60 capitalize">{signal.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-white/60">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(signal.timestamp)}</span>
                    <span>•</span>
                    <span>{signal.timeframe}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getConfidenceColor(signal.confidence)}`}>
                  {signal.confidence}% confidence
                </div>
                <div className="text-xs text-white/60">AI Score</div>
              </div>
            </div>

            {/* Signal Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div className="bg-[#111111] rounded-lg p-3">
                <div className="text-white/60 text-xs mb-1">Entry Price</div>
                <div className="text-white font-medium">${signal.entryPrice.toLocaleString()}</div>
              </div>
              <div className="bg-[#111111] rounded-lg p-3">
                <div className="text-white/60 text-xs mb-1">Stop Loss</div>
                <div className="text-red-400 font-medium">${signal.stopLoss.toLocaleString()}</div>
              </div>
              <div className="bg-[#111111] rounded-lg p-3">
                <div className="text-white/60 text-xs mb-1">Targets</div>
                <div className="text-green-400 font-medium">
                  {signal.targets.map((target, index) => (
                    <span key={index}>
                      ${target.toLocaleString()}
                      {index < signal.targets.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Reasoning */}
            <div className="mb-3">
              <div className="text-white/60 text-xs mb-1">AI Reasoning</div>
              <p className="text-white/80 text-sm">{signal.reasoning}</p>
            </div>

            {/* Result (if closed) */}
            {signal.result && (
              <div className="bg-[#111111] rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div className="text-white/60 text-xs">Result</div>
                  <div className={`font-medium ${
                    signal.result.profit >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {signal.result.profit >= 0 ? '+' : ''}{signal.result.profitPercent.toFixed(2)}%
                  </div>
                </div>
                <div className="text-white/80 text-sm mt-1">
                  Exit: ${signal.result.exitPrice.toLocaleString()}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {signal.status === 'active' && (
                <>
                  <button className="flex-1 bg-[#00D084] hover:bg-[#00b876] text-white rounded-md py-2 text-sm font-medium transition-colors">
                    Post to Community
                  </button>
                  <button className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md py-2 text-sm transition-colors">
                    <Pause className="w-4 h-4 mx-auto" />
                  </button>
                  <button className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md py-2 text-sm transition-colors">
                    <Settings className="w-4 h-4 mx-auto" />
                  </button>
                </>
              )}
              {signal.status === 'closed' && (
                <button className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md py-2 text-sm transition-colors">
                  View Analysis
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Signal Modal */}
      {showCreateSignal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Create Signal</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-2">Signal Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setNewSignal({ ...newSignal, type: 'buy' })}
                    className={`p-3 rounded-lg border transition-colors ${
                      newSignal.type === 'buy' 
                        ? 'bg-green-400/20 border-green-400 text-green-400' 
                        : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#00D084]'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-sm">Buy</span>
                  </button>
                  <button
                    onClick={() => setNewSignal({ ...newSignal, type: 'sell' })}
                    className={`p-3 rounded-lg border transition-colors ${
                      newSignal.type === 'sell' 
                        ? 'bg-red-400/20 border-red-400 text-red-400' 
                        : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#00D084]'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-sm">Sell</span>
                  </button>
                  <button
                    onClick={() => setNewSignal({ ...newSignal, type: 'hold' })}
                    className={`p-3 rounded-lg border transition-colors ${
                      newSignal.type === 'hold' 
                        ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' 
                        : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#00D084]'
                    }`}
                  >
                    <Minus className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-sm">Hold</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Symbol</label>
                <input
                  type="text"
                  placeholder="BTC, ETH, SOL..."
                  value={newSignal.symbol || ''}
                  onChange={(e) => setNewSignal({ ...newSignal, symbol: e.target.value.toUpperCase() })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Entry Price</label>
                <input
                  type="number"
                  placeholder="45000"
                  value={newSignal.entryPrice || ''}
                  onChange={(e) => setNewSignal({ ...newSignal, entryPrice: parseFloat(e.target.value) })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Stop Loss</label>
                <input
                  type="number"
                  placeholder="42000"
                  value={newSignal.stopLoss || ''}
                  onChange={(e) => setNewSignal({ ...newSignal, stopLoss: parseFloat(e.target.value) })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Targets (comma separated)</label>
                <input
                  type="text"
                  placeholder="47000, 49000, 52000"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Confidence (%)</label>
                <input
                  type="number"
                  placeholder="85"
                  min="0"
                  max="100"
                  value={newSignal.confidence || ''}
                  onChange={(e) => setNewSignal({ ...newSignal, confidence: parseInt(e.target.value) })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Reasoning</label>
                <textarea
                  placeholder="Explain why this signal is generated..."
                  rows={3}
                  value={newSignal.reasoning || ''}
                  onChange={(e) => setNewSignal({ ...newSignal, reasoning: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateSignal(false)}
                className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md py-2 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSignal}
                className="flex-1 bg-[#00D084] hover:bg-[#00b876] text-white rounded-md py-2 font-medium transition-colors"
              >
                Create Signal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
