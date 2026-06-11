'use client'

import { useState, useEffect } from 'react'
import { Clock, Trash2, Calendar, AlertTriangle, RefreshCw, Info } from 'lucide-react'
import GroupCleanup from '../crypto/groupCleanup'

interface GroupCleanupInfoProps {
  groupId?: string
  className?: string
}

export function GroupCleanupInfo({ groupId, className = '' }: GroupCleanupInfoProps) {
  const [cleanupStats, setCleanupStats] = useState<any>(null)
  const [timeRemaining, setTimeRemaining] = useState<any>(null)
  const [isExtending, setIsExtending] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  
  const cleanup = GroupCleanup.getInstance()

  useEffect(() => {
    loadCleanupInfo()
    
    // Update every minute
    const interval = setInterval(() => {
      if (groupId) {
        const remaining = cleanup.getTimeRemaining(groupId)
        setTimeRemaining(remaining)
      }
      loadCleanupInfo()
    }, 60000)

    return () => clearInterval(interval)
  }, [groupId])

  const loadCleanupInfo = () => {
    const stats = cleanup.getCleanupStats()
    setCleanupStats(stats)
    
    if (groupId) {
      const remaining = cleanup.getTimeRemaining(groupId)
      setTimeRemaining(remaining)
    }
  }

  const handleExtendExpiration = async () => {
    if (!groupId) return
    
    setIsExtending(true)
    try {
      const success = await cleanup.extendGroupExpiration(groupId, 7)
      if (success) {
        loadCleanupInfo()
      }
    } catch (error) {
      console.error('Failed to extend expiration:', error)
    } finally {
      setIsExtending(false)
    }
  }

  const handleForceCleanup = async () => {
    if (!groupId) return
    
    if (!confirm('Are you sure you want to permanently delete this group and all its messages? This action cannot be undone.')) {
      return
    }
    
    setIsCleaning(true)
    try {
      const success = await cleanup.forceCleanupGroup(groupId)
      if (success) {
        loadCleanupInfo()
        // In a real app, you'd navigate away or refresh the group list
      }
    } catch (error) {
      console.error('Failed to cleanup group:', error)
    } finally {
      setIsCleaning(false)
    }
  }

  const getTimeRemainingColor = (remaining: any) => {
    if (remaining.expired) return 'text-red-400'
    if (remaining.days < 1) return 'text-orange-400'
    if (remaining.days < 3) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getTimeRemainingText = (remaining: any) => {
    if (remaining.expired) return 'Expired'
    
    const parts = []
    if (remaining.days > 0) parts.push(`${remaining.days}d`)
    if (remaining.hours > 0) parts.push(`${remaining.hours}h`)
    if (remaining.minutes > 0) parts.push(`${remaining.minutes}m`)
    
    return parts.join(' ') || 'Less than 1m'
  }

  const getNextCleanupText = () => {
    if (!cleanupStats) return ''
    
    const nextCleanup = new Date(cleanupStats.nextCleanup)
    const now = new Date()
    const hoursUntil = Math.floor((nextCleanup.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (hoursUntil <= 1) return 'Less than 1 hour'
    if (hoursUntil <= 24) return `${hoursUntil} hours`
    return `${Math.floor(hoursUntil / 24)} days`
  }

  if (!cleanupStats) {
    return (
      <div className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 text-white/40 animate-spin" />
          <span className="text-white/60">Loading cleanup information...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Specific Group Info */}
      {groupId && timeRemaining && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Group Expiration</span>
            </h3>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              timeRemaining.expired 
                ? 'bg-red-400/20 text-red-400' 
                : 'bg-green-400/20 text-green-400'
            }`}>
              {timeRemaining.expired ? 'EXPIRED' : 'ACTIVE'}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Time Remaining</span>
              <span className={`font-medium ${getTimeRemainingColor(timeRemaining)}`}>
                {getTimeRemainingText(timeRemaining)}
              </span>
            </div>
            
            {!timeRemaining.expired && (
              <div className="flex space-x-2">
                <button
                  onClick={handleExtendExpiration}
                  disabled={isExtending}
                  className="flex-1 bg-[#00D084] hover:bg-[#00b876] disabled:bg-[#2a2a2a] disabled:text-white/40 text-white px-3 py-2 rounded text-sm transition-colors flex items-center justify-center space-x-1"
                >
                  {isExtending ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Extending...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3 h-3" />
                      <span>Extend 7 days</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleForceCleanup}
                  disabled={isCleaning}
                  className="flex-1 bg-red-400/20 hover:bg-red-400/30 disabled:bg-[#2a2a2a] disabled:text-white/40 text-red-400 px-3 py-2 rounded text-sm transition-colors flex items-center justify-center space-x-1"
                >
                  {isCleaning ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3" />
                      <span>Delete Now</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Cleanup Stats */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium flex items-center space-x-2">
            <Trash2 className="w-4 h-4 text-orange-400" />
            <span>Auto-Cleanup Status</span>
          </h3>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-xs">Active</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{cleanupStats.totalGroups}</div>
            <div className="text-white/60 text-xs">Total Groups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{cleanupStats.activeGroups}</div>
            <div className="text-white/60 text-xs">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{cleanupStats.expiredGroups}</div>
            <div className="text-white/60 text-xs">Expired</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{cleanupStats.totalMessages}</div>
            <div className="text-white/60 text-xs">Messages</div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Next Auto-Cleanup</span>
            <span className="text-white text-sm">{getNextCleanupText()}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Expired Messages</span>
            <span className="text-orange-400 text-sm">{cleanupStats.expiredMessages}</span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-400/20 border border-blue-400/30 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5" />
          <div className="text-blue-400 text-sm">
            <p className="font-medium mb-1">How Auto-Cleanup Works:</p>
            <ul className="space-y-1 text-xs">
              <li>• All group content automatically expires after 7 days</li>
              <li>• Expired content is permanently deleted</li>
              <li>• Cleanup runs every 24 hours</li>
              <li>• You can extend expiration by 7 days</li>
              <li>• Expired groups cannot be recovered</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
