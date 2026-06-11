'use client'

import { useState, useEffect } from 'react'
import { Users, Lock, Unlock, Settings, Plus, Copy, Check, MessageSquare, Bot, Shield } from 'lucide-react'
import { useBotManagement, Community, SignalBot } from '../hooks/useBotManagement'

interface CommunityManagerProps {
  className?: string
}

export function CommunityManager({ className = '' }: CommunityManagerProps) {
  const {
    communities,
    signalBots,
    loading,
    createCommunity,
    addBotToCommunity
  } = useBotManagement()
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)

  const sampleCommunities: Community[] = [
    {
      id: 'comm_1',
      name: 'Alpha Traders',
      type: 'telegram',
      isPrivate: true,
      members: 1247,
      maxMembers: 5000,
      inviteCode: 'ALPHA2024',
      settings: {
        allowSignals: true,
        allowBots: true,
        moderation: true,
        requireApproval: true,
        signalDelay: 300
      }
    },
    {
      id: 'comm_2',
      name: 'DeFi Whales',
      type: 'discord',
      isPrivate: false,
      members: 3421,
      maxMembers: 10000,
      settings: {
        allowSignals: true,
        allowBots: false,
        moderation: false,
        requireApproval: false,
        signalDelay: 0
      }
    },
    {
      id: 'comm_3',
      name: 'Premium Signals',
      type: 'telegram',
      isPrivate: true,
      members: 567,
      maxMembers: 1000,
      inviteCode: 'PREMIUM123',
      settings: {
        allowSignals: true,
        allowBots: true,
        moderation: true,
        requireApproval: true,
        signalDelay: 600
      }
    }
  ]

  useEffect(() => {
    // Initialize with sample data
    if (communities.length === 0) {
      // This would normally come from the API
    }
  }, [communities])

  const handleCreateCommunity = async (communityData: any) => {
    try {
      await createCommunity(communityData)
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating community:', error)
    }
  }

  const handleAddBot = async (botId: string, communityId: string) => {
    try {
      await addBotToCommunity(botId, communityId)
    } catch (error) {
      console.error('Error adding bot to community:', error)
    }
  }

  const copyInviteCode = (code: string) => {
    setInviteCode(code)
    setCopiedCode(true)
    navigator.clipboard.writeText(code)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const getCommunityTypeIcon = (type: string) => {
    switch (type) {
      case 'telegram':
        return '💬'
      case 'discord':
        return '🎮'
      default:
        return '👥'
    }
  }

  const getMemberProgress = (members: number, maxMembers: number) => {
    return (members / maxMembers) * 100
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-400'
    if (percentage >= 60) return 'bg-yellow-400'
    return 'bg-green-400'
  }

  return (
    <div className={`bg-[#111111] border border-[#1e1e1e] rounded-lg p-4 md:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
          <Users className="w-6 h-6 text-[#00D084]" />
          <h2 className="text-xl md:text-2xl font-bold text-white">Community Manager</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#00D084] hover:bg-[#00b876] text-white rounded-lg px-4 py-2 flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Community</span>
        </button>
      </div>

      {/* Communities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sampleCommunities.map((community) => (
          <div key={community.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-[#00D084] rounded-lg flex items-center justify-center text-lg">
                  {getCommunityTypeIcon(community.type)}
                </div>
                <div>
                  <h3 className="text-white font-medium">{community.name}</h3>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-white/60 capitalize">{community.type}</span>
                    {community.isPrivate ? (
                      <Lock className="w-3 h-3 text-yellow-400" />
                    ) : (
                      <Unlock className="w-3 h-3 text-green-400" />
                    )}
                  </div>
                </div>
              </div>
              <button className="text-white/40 hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Members Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                <span>Members</span>
                <span>{community.members.toLocaleString()} / {community.maxMembers.toLocaleString()}</span>
              </div>
              <div className="w-full bg-[#2a2a2a] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(getMemberProgress(community.members, community.maxMembers))}`}
                  style={{ width: `${Math.min(getMemberProgress(community.members, community.maxMembers), 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Signals</span>
                <div className={`w-2 h-2 rounded-full ${community.settings.allowSignals ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Bots</span>
                <div className={`w-2 h-2 rounded-full ${community.settings.allowBots ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Moderation</span>
                <div className={`w-2 h-2 rounded-full ${community.settings.moderation ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Approval</span>
                <div className={`w-2 h-2 rounded-full ${community.settings.requireApproval ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              </div>
            </div>

            {/* Invite Code */}
            {community.isPrivate && community.inviteCode && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                  <span>Invite Code</span>
                  <button
                    onClick={() => copyInviteCode(community.inviteCode!)}
                    className="flex items-center space-x-1 text-[#00D084] hover:text-[#00b876] transition-colors"
                  >
                    {copiedCode && inviteCode === community.inviteCode ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{community.inviteCode}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Active Bots */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                <span>Active Bots</span>
                <span className="text-white">2 bots</span>
              </div>
              <div className="flex space-x-2">
                <div className="bg-[#111111] rounded-lg p-2 flex-1 text-center">
                  <Bot className="w-4 h-4 text-[#00D084] mx-auto mb-1" />
                  <span className="text-xs text-white">Alpha Trader</span>
                </div>
                <div className="bg-[#111111] rounded-lg p-2 flex-1 text-center">
                  <MessageSquare className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <span className="text-xs text-white">Signal Bot</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 bg-[#00D084] hover:bg-[#00b876] text-white rounded-md py-2 text-sm font-medium transition-colors">
                Manage
              </button>
              <button className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md py-2 text-sm transition-colors">
                <MessageSquare className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Create Community</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-2">Community Name</label>
                <input
                  type="text"
                  placeholder="Enter community name..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Platform</label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#00D084] transition-colors">
                    <span className="text-lg">💬</span>
                    <span className="block text-sm text-white">Telegram</span>
                  </button>
                  <button className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#00D084] transition-colors">
                    <span className="text-lg">🎮</span>
                    <span className="block text-sm text-white">Discord</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Privacy</label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#00D084] transition-colors">
                    <Lock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                    <span className="text-sm text-white">Private</span>
                  </button>
                  <button className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#00D084] transition-colors">
                    <Unlock className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <span className="text-sm text-white">Public</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Max Members</label>
                <input
                  type="number"
                  placeholder="1000"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Settings</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm text-white">Allow Signals</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm text-white">Allow Bots</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-white">Require Approval</span>
                  </label>
                </div>
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
                onClick={() => handleCreateCommunity({})}
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
