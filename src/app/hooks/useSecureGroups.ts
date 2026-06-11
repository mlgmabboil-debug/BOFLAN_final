'use client'

import { useState, useEffect, useCallback } from 'react'
import SecureGroupEncryption from '../crypto/secureEncryption'
import { securityUtils } from '../crypto/secureEncryption'

interface SecureGroup {
  id: string
  name: string
  description: string
  isPrivate: boolean
  members: string[]
  encryptedContent: string[]
  createdAt: number
  lastActivity: number
  keyExpiresAt: number
}

interface SecureMessage {
  id: string
  groupId: string
  senderId: string
  content: string
  encryptedData: string
  timestamp: number
  isEncrypted: boolean
}

interface GroupMember {
  id: string
  username: string
  role: 'admin' | 'moderator' | 'member'
  joinedAt: number
  hasAccess: boolean
}

export function useSecureGroups() {
  const [groups, setGroups] = useState<SecureGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [encryption] = useState(() => SecureGroupEncryption.getInstance())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Initialize encryption
  useEffect(() => {
    const initializeEncryption = async () => {
      try {
        const storedUserId = localStorage.getItem('user_id')
        if (storedUserId) {
          setCurrentUserId(storedUserId)
        }

        // Try to initialize with stored master key
        const storedMasterKey = localStorage.getItem('encrypted_master_key')
        if (storedMasterKey) {
          // In production, you'd prompt for password here
          await encryption.initialize('default_password')
        }

        // Clean up expired keys
        encryption.cleanupExpiredKeys()
      } catch (error) {
        console.error('Failed to initialize encryption:', error)
        setError('Failed to initialize encryption')
      }
    }

    initializeEncryption()
  }, [encryption])

  // Create secure group
  const createSecureGroup = useCallback(async (
    name: string,
    description: string,
    members: string[],
    isPrivate: boolean = true
  ): Promise<SecureGroup> => {
    setLoading(true)
    setError(null)

    try {
      // Validate inputs
      if (!securityUtils.validateInput(name, 'username')) {
        throw new Error('Invalid group name')
      }
      if (!securityUtils.validateInput(description, 'text')) {
        throw new Error('Invalid group description')
      }

      // Generate group ID
      const groupId = encryption.generateSecureToken()
      
      // Add current user to members if not already included
      const allMembers = currentUserId ? [...new Set([currentUserId, ...members])] : members
      
      // Generate group encryption key
      await encryption.generateGroupKey(groupId, allMembers)
      
      const newGroup: SecureGroup = {
        id: groupId,
        name: securityUtils.sanitizeHTML(name),
        description: securityUtils.sanitizeHTML(description),
        isPrivate,
        members: allMembers,
        encryptedContent: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        keyExpiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
      }

      // Store group (in production, this would be API call)
      const encryptedGroup = await encryption.encryptGroupContent(newGroup, groupId)
      localStorage.setItem(`group_${groupId}`, encryptedGroup)
      
      setGroups(prev => [...prev, newGroup])
      return newGroup
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create group'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [encryption, currentUserId])

  // Join secure group
  const joinSecureGroup = useCallback(async (groupId: string, inviteCode?: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      // Check rate limiting
      if (!securityUtils.checkRateLimit(`join_group_${currentUserId}`, 5, 60000)) {
        throw new Error('Too many join attempts. Please try again later.')
      }

      // Verify access
      const hasAccess = await encryption.hasGroupAccess(groupId, currentUserId || '')
      if (!hasAccess) {
        throw new Error('Access denied. You are not a member of this group.')
      }

      // Load group
      const encryptedGroup = localStorage.getItem(`group_${groupId}`)
      if (!encryptedGroup) {
        throw new Error('Group not found')
      }

      const groupData = await encryption.decryptGroupContent(encryptedGroup, groupId)
      
      // Add user to members if not already present
      if (currentUserId && !groupData.members.includes(currentUserId)) {
        groupData.members.push(currentUserId)
        
        // Re-encrypt and store updated group
        const updatedEncryptedGroup = await encryption.encryptGroupContent(groupData, groupId)
        localStorage.setItem(`group_${groupId}`, updatedEncryptedGroup)
      }

      setGroups(prev => {
        const existing = prev.find(g => g.id === groupId)
        if (existing) {
          return prev.map(g => g.id === groupId ? groupData : g)
        }
        return [...prev, groupData]
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join group'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [encryption, currentUserId])

  // Send secure message
  const sendSecureMessage = useCallback(async (
    groupId: string,
    content: string
  ): Promise<SecureMessage> => {
    setLoading(true)
    setError(null)

    try {
      // Validate input
      if (!securityUtils.validateInput(content, 'text')) {
        throw new Error('Invalid message content')
      }

      // Check rate limiting
      if (!securityUtils.checkRateLimit(`message_${currentUserId}`, 10, 60000)) {
        throw new Error('Too many messages. Please wait before sending another.')
      }

      // Verify access
      const hasAccess = await encryption.hasGroupAccess(groupId, currentUserId || '')
      if (!hasAccess) {
        throw new Error('Access denied')
      }

      // Encrypt message
      const messageData = {
        content: securityUtils.sanitizeHTML(content),
        senderId: currentUserId,
        timestamp: Date.now()
      }

      const encryptedData = await encryption.encryptGroupContent(messageData, groupId)
      
      const message: SecureMessage = {
        id: encryption.generateSecureToken(),
        groupId,
        senderId: currentUserId || '',
        content: securityUtils.sanitizeHTML(content),
        encryptedData,
        timestamp: Date.now(),
        isEncrypted: true
      }

      // Store message (in production, this would be API call)
      const existingMessages = JSON.parse(localStorage.getItem(`messages_${groupId}`) || '[]')
      existingMessages.push(message)
      localStorage.setItem(`messages_${groupId}`, JSON.stringify(existingMessages))

      // Update group last activity
      const encryptedGroup = localStorage.getItem(`group_${groupId}`)
      if (encryptedGroup) {
        const groupData = await encryption.decryptGroupContent(encryptedGroup, groupId)
        groupData.lastActivity = Date.now()
        const updatedEncryptedGroup = await encryption.encryptGroupContent(groupData, groupId)
        localStorage.setItem(`group_${groupId}`, updatedEncryptedGroup)
      }

      return message
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [encryption, currentUserId])

  // Get group messages
  const getGroupMessages = useCallback(async (groupId: string): Promise<SecureMessage[]> => {
    try {
      // Verify access
      const hasAccess = await encryption.hasGroupAccess(groupId, currentUserId || '')
      if (!hasAccess) {
        throw new Error('Access denied')
      }

      // Load messages
      const encryptedMessages = localStorage.getItem(`messages_${groupId}`)
      if (!encryptedMessages) {
        return []
      }

      const messages = JSON.parse(encryptedMessages)
      
      // Decrypt messages
      const decryptedMessages = await Promise.all(
        messages.map(async (message: SecureMessage) => {
          if (message.isEncrypted) {
            try {
              const decryptedData = await encryption.decryptGroupContent(message.encryptedData, groupId)
              return {
                ...message,
                content: decryptedData.content
              }
            } catch (error) {
              // Return original message if decryption fails
              return message
            }
          }
          return message
        })
      )

      return decryptedMessages
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load messages'
      setError(errorMessage)
      return []
    }
  }, [encryption, currentUserId])

  // Rotate group key
  const rotateGroupKey = useCallback(async (groupId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      // Get group members
      const encryptedGroup = localStorage.getItem(`group_${groupId}`)
      if (!encryptedGroup) {
        throw new Error('Group not found')
      }

      const groupData = await encryption.decryptGroupContent(encryptedGroup, groupId)
      
      // Generate new key
      await encryption.rotateGroupKey(groupId, groupData.members)
      
      // Re-encrypt all messages with new key
      const messages = JSON.parse(localStorage.getItem(`messages_${groupId}`) || '[]')
      const reencryptedMessages = await Promise.all(
        messages.map(async (message: SecureMessage) => {
          const messageData = {
            content: message.content,
            senderId: message.senderId,
            timestamp: message.timestamp
          }
          
          const encryptedData = await encryption.encryptGroupContent(messageData, groupId)
          return {
            ...message,
            encryptedData
          }
        })
      )
      
      localStorage.setItem(`messages_${groupId}`, JSON.stringify(reencryptedMessages))
      
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to rotate key'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [encryption])

  // Get group key status
  const getGroupKeyStatus = useCallback((groupId: string) => {
    return encryption.getGroupKeyStatus(groupId)
  }, [encryption])

  // Load user groups
  const loadUserGroups = useCallback(async () => {
    if (!currentUserId) return

    setLoading(true)
    setError(null)

    try {
      const userGroups: SecureGroup[] = []
      
      // Load all groups and filter user's groups
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('group_')) {
          try {
            const encryptedGroup = localStorage.getItem(key)
            if (encryptedGroup) {
              const groupData = await encryption.decryptGroupContent(encryptedGroup, key.replace('group_', ''))
              
              // Check if user is member
              if (groupData.members.includes(currentUserId)) {
                userGroups.push(groupData)
              }
            }
          } catch (error) {
            // Skip invalid groups
            console.warn('Failed to decrypt group:', key, error)
          }
        }
      }
      
      setGroups(userGroups)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load groups'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [encryption, currentUserId])

  // Add member to group
  const addMemberToGroup = useCallback(async (groupId: string, memberId: string): Promise<boolean> => {
    try {
      // Verify access
      const hasAccess = await encryption.hasGroupAccess(groupId, currentUserId || '')
      if (!hasAccess) {
        throw new Error('Access denied')
      }

      // Load group
      const encryptedGroup = localStorage.getItem(`group_${groupId}`)
      if (!encryptedGroup) {
        throw new Error('Group not found')
      }

      const groupData = await encryption.decryptGroupContent(encryptedGroup, groupId)
      
      // Add member if not already present
      if (!groupData.members.includes(memberId)) {
        groupData.members.push(memberId)
        
        // Re-encrypt and store updated group
        const updatedEncryptedGroup = await encryption.encryptGroupContent(groupData, groupId)
        localStorage.setItem(`group_${groupId}`, updatedEncryptedGroup)
        
        // Update state
        setGroups(prev => prev.map(g => g.id === groupId ? groupData : g))
      }

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add member'
      setError(errorMessage)
      return false
    }
  }, [encryption, currentUserId])

  // Remove member from group
  const removeMemberFromGroup = useCallback(async (groupId: string, memberId: string): Promise<boolean> => {
    try {
      // Verify access
      const hasAccess = await encryption.hasGroupAccess(groupId, currentUserId || '')
      if (!hasAccess) {
        throw new Error('Access denied')
      }

      // Load group
      const encryptedGroup = localStorage.getItem(`group_${groupId}`)
      if (!encryptedGroup) {
        throw new Error('Group not found')
      }

      const groupData = await encryption.decryptGroupContent(encryptedGroup, groupId)
      
      // Remove member
      groupData.members = groupData.members.filter((id: string) => id !== memberId)
      
      // Re-encrypt and store updated group
      const updatedEncryptedGroup = await encryption.encryptGroupContent(groupData, groupId)
      localStorage.setItem(`group_${groupId}`, updatedEncryptedGroup)
      
      // Update state
      setGroups(prev => prev.map(g => g.id === groupId ? groupData : g))
      
      // If removing current user, remove group from state
      if (memberId === currentUserId) {
        setGroups(prev => prev.filter(g => g.id !== groupId))
      }

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove member'
      setError(errorMessage)
      return false
    }
  }, [encryption, currentUserId])

  // Load groups on mount
  useEffect(() => {
    loadUserGroups()
  }, [loadUserGroups])

  return {
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
    removeMemberFromGroup,
    loadUserGroups
  }
}
