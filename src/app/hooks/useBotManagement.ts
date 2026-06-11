'use client'

import { useState, useCallback } from 'react'

export interface TradingBot {
  id: string
  name: string
  description: string
  type: 'signal' | 'wallet' | 'arbitrage' | 'copy'
  status: 'active' | 'inactive' | 'paused'
  performance: {
    totalReturn: number
    winRate: number
    tradesCount: number
    avgProfit: number
    maxDrawdown: number
  }
  settings: {
    riskLevel: 'low' | 'medium' | 'high'
    maxDrawdown: number
    takeProfit: number
    stopLoss: number
    tradingPairs: string[]
    timeframe: string
  }
  subscription: {
    type: 'free' | 'premium' | 'enterprise'
    price: number
    subscribers: number
    maxSubscribers: number
  }
  createdBy: string
  createdAt: number
  lastUpdated: number
}

export interface SignalBot {
  id: string
  name: string
  description: string
  signals: Signal[]
  community: Community
  settings: SignalSettings
  performance: SignalPerformance
}

export interface Signal {
  id: string
  type: 'buy' | 'sell' | 'hold'
  symbol: string
  entryPrice: number
  targets: number[]
  stopLoss: number
  confidence: number
  reasoning: string
  timeframe: string
  timestamp: number
  status: 'active' | 'closed' | 'cancelled'
  result?: {
    exitPrice: number
    profit: number
    profitPercent: number
  }
}

export interface WalletBot {
  id: string
  name: string
  description: string
  address: string
  permissions: WalletPermission[]
  automations: WalletAutomation[]
  security: WalletSecurity
}

export interface Community {
  id: string
  name: string
  type: 'telegram' | 'discord' | 'private'
  isPrivate: boolean
  members: number
  maxMembers: number
  inviteCode?: string
  settings: CommunitySettings
}

export interface SignalSettings {
  autoPost: boolean
  postFrequency: 'instant' | 'hourly' | 'daily'
  riskFilter: boolean
  minConfidence: number
  maxSignalsPerDay: number
  includeReasoning: boolean
  includeChart: boolean
}

export interface SignalPerformance {
  totalSignals: number
  successful: number
  winRate: number
  avgProfit: number
  totalProfit: number
  monthlyProfit: number[]
}

export interface WalletPermission {
  action: 'read' | 'write' | 'trade'
  contracts: string[]
  limits: {
    daily: number
    weekly: number
    monthly: number
  }
}

export interface WalletAutomation {
  id: string
  name: string
  trigger: AutomationTrigger
  actions: AutomationAction[]
  isActive: boolean
}

export interface AutomationTrigger {
  type: 'price' | 'time' | 'volume' | 'rsi' | 'macd'
  conditions: TriggerCondition[]
}

export interface AutomationAction {
  type: 'buy' | 'sell' | 'transfer' | 'notify'
  parameters: Record<string, any>
}

export interface TriggerCondition {
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  value: number
  symbol?: string
}

export interface WalletSecurity {
  twoFactorAuth: boolean
  whitelistAddresses: string[]
  maxWithdrawal: number
  requireConfirmation: boolean
  notifications: boolean
}

export interface CommunitySettings {
  allowSignals: boolean
  allowBots: boolean
  moderation: boolean
  requireApproval: boolean
  signalDelay: number
}

export function useBotManagement() {
  const [bots, setBots] = useState<TradingBot[]>([])
  const [signalBots, setSignalBots] = useState<SignalBot[]>([])
  const [walletBots, setWalletBots] = useState<WalletBot[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(false)

  // Create new signal bot
  const createSignalBot = useCallback(async (botData: Omit<SignalBot, 'id' | 'signals' | 'performance'>) => {
    setLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newBot: SignalBot = {
        ...botData,
        id: `bot_${Date.now()}`,
        signals: [],
        performance: {
          totalSignals: 0,
          successful: 0,
          winRate: 0,
          avgProfit: 0,
          totalProfit: 0,
          monthlyProfit: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
      }
      
      setSignalBots(prev => [...prev, newBot])
      return newBot
    } catch (error) {
      console.error('Error creating signal bot:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Create wallet bot
  const createWalletBot = useCallback(async (botData: Omit<WalletBot, 'id'>) => {
    setLoading(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newBot: WalletBot = {
        ...botData,
        id: `wallet_bot_${Date.now()}`
      }
      
      setWalletBots(prev => [...prev, newBot])
      return newBot
    } catch (error) {
      console.error('Error creating wallet bot:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Create community
  const createCommunity = useCallback(async (communityData: Omit<Community, 'id'>) => {
    setLoading(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newCommunity: Community = {
        ...communityData,
        id: `community_${Date.now()}`
      }
      
      setCommunities(prev => [...prev, newCommunity])
      return newCommunity
    } catch (error) {
      console.error('Error creating community:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Add bot to community
  const addBotToCommunity = useCallback(async (botId: string, communityId: string) => {
    setLoading(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Update community with bot
      setCommunities(prev => prev.map(community => 
        community.id === communityId 
          ? { ...community, members: community.members + 1 }
          : community
      ))
      
      return true
    } catch (error) {
      console.error('Error adding bot to community:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Generate signal
  const generateSignal = useCallback(async (botId: string, signalData: Omit<Signal, 'id' | 'timestamp' | 'status'>) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newSignal: Signal = {
        ...signalData,
        id: `signal_${Date.now()}`,
        timestamp: Date.now(),
        status: 'active'
      }
      
      setSignalBots(prev => prev.map(bot => 
        bot.id === botId 
          ? { ...bot, signals: [...bot.signals, newSignal] }
          : bot
      ))
      
      return newSignal
    } catch (error) {
      console.error('Error generating signal:', error)
      throw error
    }
  }, [])

  // Create wallet automation
  const createWalletAutomation = useCallback(async (botId: string, automation: Omit<WalletAutomation, 'id'>) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newAutomation: WalletAutomation = {
        ...automation,
        id: `automation_${Date.now()}`
      }
      
      setWalletBots(prev => prev.map(bot => 
        bot.id === botId 
          ? { ...bot, automations: [...bot.automations, newAutomation] }
          : bot
      ))
      
      return newAutomation
    } catch (error) {
      console.error('Error creating automation:', error)
      throw error
    }
  }, [])

  // Get sample bots
  const getSampleBots = useCallback(() => {
    return [
      {
        id: 'sample_1',
        name: 'Alpha Trader',
        description: 'AI-powered day trading bot with 85% win rate',
        type: 'signal' as const,
        status: 'active' as const,
        performance: {
          totalReturn: 45.2,
          winRate: 85,
          tradesCount: 234,
          avgProfit: 2.3,
          maxDrawdown: 8.5
        },
        settings: {
          riskLevel: 'medium' as const,
          maxDrawdown: 10,
          takeProfit: 5,
          stopLoss: 2,
          tradingPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
          timeframe: '1h'
        },
        subscription: {
          type: 'premium' as const,
          price: 99,
          subscribers: 1247,
          maxSubscribers: 5000
        },
        createdBy: 'user_1',
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        lastUpdated: Date.now()
      },
      {
        id: 'sample_2',
        name: 'DeFi Yield Farmer',
        description: 'Automated yield farming across multiple protocols',
        type: 'wallet' as const,
        status: 'active' as const,
        performance: {
          totalReturn: 28.7,
          winRate: 92,
          tradesCount: 89,
          avgProfit: 1.8,
          maxDrawdown: 5.2
        },
        settings: {
          riskLevel: 'low' as const,
          maxDrawdown: 8,
          takeProfit: 3,
          stopLoss: 1.5,
          tradingPairs: ['ETH/USDT', 'MATIC/USDT'],
          timeframe: '4h'
        },
        subscription: {
          type: 'free' as const,
          price: 0,
          subscribers: 3421,
          maxSubscribers: 10000
        },
        createdBy: 'user_2',
        createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
        lastUpdated: Date.now()
      }
    ]
  }, [])

  return {
    bots,
    signalBots,
    walletBots,
    communities,
    loading,
    createSignalBot,
    createWalletBot,
    createCommunity,
    addBotToCommunity,
    generateSignal,
    createWalletAutomation,
    getSampleBots
  }
}
