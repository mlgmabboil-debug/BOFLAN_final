'use client'

import { useState, useEffect } from 'react'
import { Wallet, Shield, Settings, Plus, Play, Pause, AlertTriangle, CheckCircle, Clock, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'
import { useBotManagement, WalletBot, WalletAutomation, WalletPermission } from '../hooks/useBotManagement'

interface WalletBotManagerProps {
  className?: string
}

export function WalletBotManager({ className = '' }: WalletBotManagerProps) {
  const { walletBots, createWalletAutomation } = useBotManagement()
  const [selectedBot, setSelectedBot] = useState<WalletBot | null>(null)
  const [showCreateAutomation, setShowCreateAutomation] = useState(false)
  const [newAutomation, setNewAutomation] = useState<Partial<WalletAutomation>>({})

  // Sample wallet bot
  const sampleWalletBot: WalletBot = {
    id: 'wallet_bot_1',
    name: 'Portfolio Manager',
    description: 'Automated portfolio management with rebalancing',
    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45',
    permissions: [
      {
        action: 'read',
        contracts: ['*'],
        limits: {
          daily: 100000,
          weekly: 500000,
          monthly: 2000000
        }
      },
      {
        action: 'trade',
        contracts: ['0xA0b86a33E6441b8e89C3d6C4b5b8b5b8b5b8b5b8'],
        limits: {
          daily: 50000,
          weekly: 200000,
          monthly: 500000
        }
      }
    ],
    automations: [
      {
        id: 'auto_1',
        name: 'Rebalance Portfolio',
        trigger: {
          type: 'time',
          conditions: [
            { operator: 'eq', value: 1 }
          ]
        },
        actions: [
          { type: 'notify', parameters: { message: 'Portfolio rebalancing triggered' } }
        ],
        isActive: true
      },
      {
        id: 'auto_2',
        name: 'Stop Loss Protection',
        trigger: {
          type: 'price',
          conditions: [
            { operator: 'lt', value: 0.9, symbol: 'BTC' }
          ]
        },
        actions: [
          { type: 'sell', parameters: { symbol: 'BTC', percentage: 0.5 } }
        ],
        isActive: true
      }
    ],
    security: {
      twoFactorAuth: true,
      whitelistAddresses: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45'],
      maxWithdrawal: 10000,
      requireConfirmation: true,
      notifications: true
    }
  }

  useEffect(() => {
    setSelectedBot(sampleWalletBot)
  }, [])

  const getPermissionIcon = (action: string) => {
    switch (action) {
      case 'read':
        return <Wallet className="w-4 h-4 text-blue-400" />
      case 'write':
        return <Settings className="w-4 h-4 text-yellow-400" />
      case 'trade':
        return <ArrowUpRight className="w-4 h-4 text-green-400" />
      default:
        return <Shield className="w-4 h-4 text-gray-400" />
    }
  }

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'price':
        return <ArrowDownRight className="w-4 h-4 text-green-400" />
      case 'time':
        return <Clock className="w-4 h-4 text-blue-400" />
      case 'volume':
        return <RefreshCw className="w-4 h-4 text-purple-400" />
      case 'rsi':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      default:
        return <Settings className="w-4 h-4 text-gray-400" />
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleCreateAutomation = async () => {
    try {
      if (selectedBot && newAutomation.name && newAutomation.trigger) {
        await createWalletAutomation(selectedBot.id, newAutomation as WalletAutomation)
        setShowCreateAutomation(false)
        setNewAutomation({})
      }
    } catch (error) {
      console.error('Error creating automation:', error)
    }
  }

  const toggleAutomation = (automationId: string) => {
    if (selectedBot) {
      const updatedAutomations = selectedBot.automations.map(auto =>
        auto.id === automationId ? { ...auto, isActive: !auto.isActive } : auto
      )
      setSelectedBot({ ...selectedBot, automations: updatedAutomations })
    }
  }

  if (!selectedBot) {
    return (
      <div className={`bg-[#111111] border border-[#1e1e1e] rounded-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <Wallet className="w-12 h-12 text-[#00D084] mx-auto mb-3" />
          <h3 className="text-white font-medium mb-2">No Wallet Bot Found</h3>
          <p className="text-white/60 text-sm mb-4">Create your first wallet management bot</p>
          <button className="bg-[#00D084] hover:bg-[#00b876] text-white rounded-lg px-4 py-2 transition-colors">
            Create Wallet Bot
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-[#111111] border border-[#1e1e1e] rounded-lg p-4 md:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
          <Wallet className="w-6 h-6 text-[#00D084]" />
          <h2 className="text-xl md:text-2xl font-bold text-white">{selectedBot.name}</h2>
        </div>
        <button
          onClick={() => setShowCreateAutomation(true)}
          className="bg-[#00D084] hover:bg-[#00b876] text-white rounded-lg px-4 py-2 flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Automation</span>
        </button>
      </div>

      {/* Wallet Info */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">Wallet Address</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm">Connected</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <code className="text-white/80 text-sm font-mono bg-[#111111] px-3 py-1 rounded">
            {formatAddress(selectedBot.address)}
          </code>
          <button className="text-[#00D084] hover:text-[#00b876] text-sm transition-colors">
            Copy
          </button>
        </div>
        <p className="text-white/60 text-sm mt-2">{selectedBot.description}</p>
      </div>

      {/* Permissions */}
      <div className="mb-6">
        <h3 className="text-white font-medium mb-3">Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {selectedBot.permissions.map((permission, index) => (
            <div key={permission.action} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getPermissionIcon(permission.action)}
                  <span className="text-white capitalize text-sm">{permission.action}</span>
                </div>
                <Shield className="w-4 h-4 text-green-400" />
              </div>
              <div className="space-y-1 text-xs text-white/60">
                <div className="flex justify-between">
                  <span>Daily Limit:</span>
                  <span className="text-white">{formatCurrency(permission.limits.daily)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Weekly Limit:</span>
                  <span className="text-white">{formatCurrency(permission.limits.weekly)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Limit:</span>
                  <span className="text-white">{formatCurrency(permission.limits.monthly)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Automations */}
      <div className="mb-6">
        <h3 className="text-white font-medium mb-3">Active Automations</h3>
        <div className="space-y-3">
          {selectedBot.automations.map((automation) => (
            <div key={automation.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#111111] rounded-lg">
                    {getTriggerIcon(automation.trigger.type)}
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{automation.name}</h4>
                    <div className="flex items-center space-x-2 text-xs text-white/60">
                      <span className="capitalize">{automation.trigger.type} trigger</span>
                      <span>•</span>
                      <span>{automation.actions.length} actions</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleAutomation(automation.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    automation.isActive 
                      ? 'bg-green-400/20 text-green-400 hover:bg-green-400/30' 
                      : 'bg-gray-400/20 text-gray-400 hover:bg-gray-400/30'
                  }`}
                >
                  {automation.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>

              {/* Trigger Conditions */}
              <div className="mb-3">
                <div className="text-white/60 text-xs mb-1">Trigger Conditions:</div>
                <div className="flex flex-wrap gap-2">
                  {automation.trigger.conditions.map((condition, index) => (
                    <div key={`${index}-${condition.operator}-${condition.value}`} className="bg-[#111111] px-2 py-1 rounded text-xs text-white">
                      {condition.symbol && `${condition.symbol} `}
                      {condition.operator} {condition.value}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="text-white/60 text-xs mb-1">Actions:</div>
                <div className="flex flex-wrap gap-2">
                  {automation.actions.map((action, index) => (
                    <div key={`${index}-${action.type}`} className="bg-[#111111] px-2 py-1 rounded text-xs text-white capitalize">
                      {action.type}
                      {action.parameters.symbol && ` ${action.parameters.symbol}`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Settings */}
      <div className="mb-6">
        <h3 className="text-white font-medium mb-3">Security Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">2FA Authentication</span>
              <div className={`w-2 h-2 rounded-full ${selectedBot.security.twoFactorAuth ? 'bg-green-400' : 'bg-red-400'}`}></div>
            </div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Whitelist Addresses</span>
              <span className="text-white text-sm">{selectedBot.security.whitelistAddresses.length}</span>
            </div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Max Withdrawal</span>
              <span className="text-white text-sm">{formatCurrency(selectedBot.security.maxWithdrawal)}</span>
            </div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Require Confirmation</span>
              <div className={`w-2 h-2 rounded-full ${selectedBot.security.requireConfirmation ? 'bg-green-400' : 'bg-red-400'}`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Automation Modal */}
      {showCreateAutomation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Create Automation</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-2">Automation Name</label>
                <input
                  type="text"
                  placeholder="Enter automation name..."
                  value={newAutomation.name || ''}
                  onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Trigger Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#00D084] transition-colors">
                    <ArrowDownRight className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <span className="text-sm text-white">Price</span>
                  </button>
                  <button className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#00D084] transition-colors">
                    <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <span className="text-sm text-white">Time</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#00D084] transition-colors">
                    <ArrowUpRight className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <span className="text-sm text-white">Buy</span>
                  </button>
                  <button className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#00D084] transition-colors">
                    <ArrowDownRight className="w-4 h-4 text-red-400 mx-auto mb-1" />
                    <span className="text-sm text-white">Sell</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateAutomation(false)}
                className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md py-2 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAutomation}
                className="flex-1 bg-[#00D084] hover:bg-[#00b876] text-white rounded-md py-2 font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
