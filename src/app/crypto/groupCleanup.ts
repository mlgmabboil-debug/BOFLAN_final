'use client'

import SecureGroupEncryption from './secureEncryption'

export class GroupCleanup {
  private static instance: GroupCleanup
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours
  private readonly CONTENT_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

  static getInstance(): GroupCleanup {
    if (!GroupCleanup.instance) {
      GroupCleanup.instance = new GroupCleanup()
    }
    return GroupCleanup.instance
  }

  constructor() {
    this.startCleanupScheduler()
  }

  // Start automatic cleanup scheduler
  private startCleanupScheduler(): void {
    // Run cleanup every 24 hours
    this.cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, this.CLEANUP_INTERVAL)

    // Also run cleanup on startup
    this.performCleanup()
  }

  // Perform cleanup of expired content
  performCleanup(): void {
    console.log('🧹 Starting group cleanup process...')
    
    const now = Date.now()
    let cleanedGroups = 0
    let cleanedMessages = 0

    try {
      // Clean up expired group keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        
        if (key && key.startsWith('group_key_')) {
          try {
            const keyData = JSON.parse(atob(localStorage.getItem(key) || '{}'))
            
            if (now > keyData.expiresAt) {
              // Remove expired group key
              localStorage.removeItem(key)
              
              // Also remove the group itself
              const groupKey = key.replace('group_key_', 'group_')
              localStorage.removeItem(groupKey)
              
              // Remove all messages for this group
              const messagesKey = `messages_${key.replace('group_key_', '')}`
              localStorage.removeItem(messagesKey)
              
              cleanedGroups++
              console.log(`🗑️ Cleaned up expired group: ${key.replace('group_key_', '')}`)
            }
          } catch (error) {
            console.warn(`Failed to process group key ${key}:`, error)
            // Remove corrupted data
            localStorage.removeItem(key)
          }
        }
      }

      // Clean up expired messages
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        
        if (key && key.startsWith('messages_')) {
          try {
            const messages = JSON.parse(localStorage.getItem(key) || '[]')
            const validMessages = messages.filter((message: any) => {
              const messageAge = now - message.timestamp
              return messageAge <= this.CONTENT_EXPIRY
            })
            
            if (validMessages.length !== messages.length) {
              localStorage.setItem(key, JSON.stringify(validMessages))
              cleanedMessages += (messages.length - validMessages.length)
              console.log(`🗑️ Cleaned up ${messages.length - validMessages.length} expired messages from ${key}`)
            }
          } catch (error) {
            console.warn(`Failed to process messages ${key}:`, error)
            localStorage.removeItem(key)
          }
        }
      }

      // Clean up orphaned data
      this.cleanupOrphanedData()

      console.log(`✅ Cleanup completed: ${cleanedGroups} groups, ${cleanedMessages} messages removed`)
      
      // Log cleanup event
      this.logCleanupEvent(cleanedGroups, cleanedMessages)
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error)
    }
  }

  // Clean up orphaned data (data without corresponding groups)
  private cleanupOrphanedData(): void {
    const activeGroups = new Set<string>()
    
    // Find all active groups
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('group_key_')) {
        try {
          const keyData = JSON.parse(atob(localStorage.getItem(key) || '{}'))
          if (Date.now() <= keyData.expiresAt) {
            activeGroups.add(key.replace('group_key_', ''))
          }
        } catch {
          // Skip corrupted data
        }
      }
    }

    // Remove orphaned messages
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('messages_')) {
        const groupId = key.replace('messages_', '')
        if (!activeGroups.has(groupId)) {
          localStorage.removeItem(key)
          console.log(`🗑️ Removed orphaned messages for group: ${groupId}`)
        }
      }
    }
  }

  // Get cleanup statistics
  getCleanupStats(): {
    totalGroups: number
    activeGroups: number
    expiredGroups: number
    totalMessages: number
    expiredMessages: number
    nextCleanup: number
  } {
    const now = Date.now()
    let totalGroups = 0
    let activeGroups = 0
    let expiredGroups = 0
    let totalMessages = 0
    let expiredMessages = 0

    // Analyze groups
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      
      if (key && key.startsWith('group_key_')) {
        totalGroups++
        try {
          const keyData = JSON.parse(atob(localStorage.getItem(key) || '{}'))
          if (now > keyData.expiresAt) {
            expiredGroups++
          } else {
            activeGroups++
          }
        } catch {
          expiredGroups++ // Count corrupted as expired
        }
      }
      
      if (key && key.startsWith('messages_')) {
        const messages = JSON.parse(localStorage.getItem(key) || '[]')
        totalMessages += messages.length
        
        const expiredCount = messages.filter((message: any) => {
          const messageAge = now - message.timestamp
          return messageAge > this.CONTENT_EXPIRY
        }).length
        
        expiredMessages += expiredCount
      }
    }

    return {
      totalGroups,
      activeGroups,
      expiredGroups,
      totalMessages,
      expiredMessages,
      nextCleanup: now + this.CLEANUP_INTERVAL
    }
  }

  // Force cleanup of specific group
  async forceCleanupGroup(groupId: string): Promise<boolean> {
    try {
      console.log(`🧹 Force cleaning group: ${groupId}`)
      
      // Remove group key
      localStorage.removeItem(`group_key_${groupId}`)
      
      // Remove group data
      localStorage.removeItem(`group_${groupId}`)
      
      // Remove all messages
      localStorage.removeItem(`messages_${groupId}`)
      
      console.log(`✅ Force cleaned group: ${groupId}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to force clean group ${groupId}:`, error)
      return false
    }
  }

  // Extend group expiration
  async extendGroupExpiration(groupId: string, days: number = 7): Promise<boolean> {
    try {
      const keyData = localStorage.getItem(`group_key_${groupId}`)
      if (!keyData) {
        return false
      }

      const parsed = JSON.parse(atob(keyData))
      const newExpiresAt = Date.now() + (days * 24 * 60 * 60 * 1000)
      
      parsed.expiresAt = newExpiresAt
      localStorage.setItem(`group_key_${groupId}`, btoa(JSON.stringify(parsed)))
      
      console.log(`⏰ Extended group ${groupId} expiration by ${days} days`)
      return true
    } catch (error) {
      console.error(`❌ Failed to extend group ${groupId} expiration:`, error)
      return false
    }
  }

  // Get time remaining for group
  getTimeRemaining(groupId: string): {
    days: number
    hours: number
    minutes: number
    expired: boolean
  } {
    const keyData = localStorage.getItem(`group_key_${groupId}`)
    if (!keyData) {
      return { days: 0, hours: 0, minutes: 0, expired: true }
    }

    try {
      const parsed = JSON.parse(atob(keyData))
      const now = Date.now()
      const timeRemaining = Math.max(0, parsed.expiresAt - now)
      
      const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000))
      const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
      const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000))
      
      return {
        days,
        hours,
        minutes,
        expired: timeRemaining === 0
      }
    } catch {
      return { days: 0, hours: 0, minutes: 0, expired: true }
    }
  }

  // Schedule cleanup for specific time
  scheduleCleanupFor(groupId: string, cleanupDate: Date): void {
    const timeUntilCleanup = cleanupDate.getTime() - Date.now()
    
    if (timeUntilCleanup > 0) {
      setTimeout(() => {
        this.forceCleanupGroup(groupId)
      }, timeUntilCleanup)
      
      console.log(`⏰ Scheduled cleanup for group ${groupId} at ${cleanupDate.toISOString()}`)
    }
  }

  // Log cleanup event
  private logCleanupEvent(cleanedGroups: number, cleanedMessages: number): void {
    const cleanupEvent = {
      type: 'GROUP_CLEANUP',
      timestamp: Date.now(),
      cleanedGroups,
      cleanedMessages,
      totalGroupsBefore: this.getCleanupStats().totalGroups,
      totalMessagesBefore: this.getCleanupStats().totalMessages
    }

    // Store cleanup log
    const logs = JSON.parse(localStorage.getItem('cleanup_logs') || '[]')
    logs.push(cleanupEvent)
    
    // Keep only last 50 cleanup logs
    if (logs.length > 50) {
      logs.splice(0, logs.length - 50)
    }
    
    localStorage.setItem('cleanup_logs', JSON.stringify(logs))
  }

  // Get cleanup history
  getCleanupHistory(): any[] {
    return JSON.parse(localStorage.getItem('cleanup_logs') || '[]')
  }

  // Stop cleanup scheduler
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('⏹️ Group cleanup scheduler stopped')
    }
  }

  // Restart cleanup scheduler
  restartCleanupScheduler(): void {
    this.stopCleanupScheduler()
    this.startCleanupScheduler()
    console.log('🔄 Group cleanup scheduler restarted')
  }
}

export default GroupCleanup
