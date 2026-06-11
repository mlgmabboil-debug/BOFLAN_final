'use client'

import { useState, useEffect } from 'react'
import { Shield, Lock, Users, Clock, AlertTriangle, Key, Eye, EyeOff, Send, Plus, Settings, RefreshCw } from 'lucide-react'
import { useSecureGroups } from '../hooks/useSecureGroups'
import { securityUtils } from '../crypto/secureEncryption'

interface SecureGroupsProps {
  className?: string
}

export function SecureGroups({ className = '' }: SecureGroupsProps) {
  const {
    groups,
    loading,
    error,
    createSecureGroup,
    joinSecureGroup,
    sendSecureMessage,
    getGroupMessages,
    rotateGroupKey,
    getGroupKeyStatus,
    addMemberToGroup,
    removeMemberFromGroup
  } = useSecureGroups()

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [newGroupMembers, setNewGroupMembers] = useState('')
  const [showDecrypted, setShowDecrypted] = useState<{ [key: string]: boolean }>({})

  // Load messages when group is selected
  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup)
    }
  }, [selectedGroup])

  const loadMessages = async (groupId: string) => {
    try {
      const groupMessages = await getGroupMessages(groupId)
      setMessages(groupMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleCreateGroup = async () => {
    try {
      if (!newGroupName.trim()) {
        return
      }

      const members = newGroupMembers
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0)

      await createSecureGroup(newGroupName, newGroupDescription, members, true)
      
      // Reset form
      setNewGroupName('')
      setNewGroupDescription('')
      setNewGroupMembers('')
      setShowCreateForm(false)
    } catch (error) {
      console.error('Failed to create group:', error)
    }
  }

  const handleJoinGroup = async () => {
    try {
      if (!joinCode.trim()) {
        return
      }

      await joinSecureGroup(joinCode.trim())
      
      // Reset form
      setJoinCode('')
      setShowJoinForm(false)
    } catch (error) {
      console.error('Failed to join group:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedGroup || !newMessage.trim()) {
      return
    }

    try {
      await sendSecureMessage(selectedGroup, newMessage)
      setNewMessage('')
      // Reload messages
      await loadMessages(selectedGroup)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleRotateKey = async (groupId: string) => {
    try {
      await rotateGroupKey(groupId)
      // Reload messages
      if (selectedGroup === groupId) {
        await loadMessages(groupId)
      }
    } catch (error) {
      console.error('Failed to rotate key:', error)
    }
  }

  const getKeyStatusColor = (status: any) => {
    if (!status.valid) return 'text-red-400'
    const hoursRemaining = status.timeRemaining / (1000 * 60 * 60)
    if (hoursRemaining < 24) return 'text-orange-400'
    if (hoursRemaining < 72) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getKeyStatusText = (status: any) => {
    if (!status.valid) return 'Expired'
    const hoursRemaining = status.timeRemaining / (1000 * 60 * 60)
    const daysRemaining = Math.floor(hoursRemaining / 24)
    if (daysRemaining > 0) return `${daysRemaining} days`
    return `${Math.floor(hoursRemaining)} hours`
  }

  const toggleDecryption = (groupId: string) => {
    setShowDecrypted(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Shield className="w-6 h-6 text-green-400" />
            <span>Secure Groups</span>
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-[#00D084] hover:bg-[#00b876] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create</span>
            </button>
            <button
              onClick={() => setShowJoinForm(!showJoinForm)}
              className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Join</span>
            </button>
          </div>
        </div>
        
        <p className="text-white/60 text-sm">
          End-to-end encrypted groups with 7-day content expiration. Only members can decrypt messages.
        </p>
      </div>

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Create Secure Group</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#00D084]"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Description</label>
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Enter group description"
                rows={3}
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#00D084]"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Initial Members (comma-separated)</label>
              <input
                type="text"
                value={newGroupMembers}
                onChange={(e) => setNewGroupMembers(e.target.value)}
                placeholder="user1, user2, user3"
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#00D084]"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCreateGroup}
                disabled={loading}
                className="bg-[#00D084] hover:bg-[#00b876] disabled:bg-[#2a2a2a] disabled:text-white/40 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Group Form */}
      {showJoinForm && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Join Secure Group</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">Group Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter group code or ID"
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#00D084]"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleJoinGroup}
                disabled={loading}
                className="bg-[#00D084] hover:bg-[#00b876] disabled:bg-[#2a2a2a] disabled:text-white/40 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? 'Joining...' : 'Join Group'}
              </button>
              <button
                onClick={() => setShowJoinForm(false)}
                className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-400/20 border border-red-400/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => {
          const keyStatus = getGroupKeyStatus(group.id)
          const isDecrypted = showDecrypted[group.id]
          
          return (
            <div
              key={group.id}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00D084]/50 transition-colors cursor-pointer"
              onClick={() => setSelectedGroup(group.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-green-400" />
                  <span>{group.name}</span>
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleDecryption(group.id)
                  }}
                  className="p-1 text-white/60 hover:text-white transition-colors"
                >
                  {isDecrypted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              <p className="text-white/60 text-sm mb-3">{group.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Members</span>
                  <span className="text-white text-xs">{group.members.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Key Status</span>
                  <span className={`text-xs ${getKeyStatusColor(keyStatus)}`}>
                    {getKeyStatusText(keyStatus)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">Last Activity</span>
                  <span className="text-white text-xs">
                    {new Date(group.lastActivity).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRotateKey(group.id)
                  }}
                  className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-2 py-1 rounded text-xs transition-colors flex items-center justify-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Rotate Key</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Settings functionality
                  }}
                  className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-2 py-1 rounded text-xs transition-colors flex items-center justify-center space-x-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Group Messages */}
      {selectedGroup && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">
              {groups.find(g => g.id === selectedGroup)?.name}
            </h3>
            <div className="flex items-center space-x-2">
              <Key className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm">Encrypted</span>
            </div>
          </div>
          
          {/* Messages */}
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className="bg-[#111111] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-sm">
                    {message.senderId === 'current_user' ? 'You' : message.senderId}
                  </span>
                  <span className="text-white/40 text-xs">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-white text-sm">{message.content}</p>
                {message.isEncrypted && (
                  <div className="mt-2 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 text-xs">Encrypted</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Message Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a secure message..."
              className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#00D084]"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !newMessage.trim()}
              className="bg-[#00D084] hover:bg-[#00b876] disabled:bg-[#2a2a2a] disabled:text-white/40 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-1"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
