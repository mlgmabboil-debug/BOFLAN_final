'use client'

import CryptoJS from 'crypto-js'

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-256-GCM',
  keyDerivation: 'PBKDF2',
  iterations: 100000,
  saltLength: 32,
  ivLength: 12,
  tagLength: 16
}

// Group encryption keys storage
interface GroupEncryptionKey {
  groupId: string
  encryptedKey: string
  salt: string
  iv: string
  createdAt: number
  expiresAt: number
}

class GroupEncryption {
  private static instance: GroupEncryption
  private keys: Map<string, CryptoJS.lib.WordArray> = new Map()
  private masterKey: string | null = null

  static getInstance(): GroupEncryption {
    if (!GroupEncryption.instance) {
      GroupEncryption.instance = new GroupEncryption()
    }
    return GroupEncryption.instance
  }

  // Initialize with user master key
  async initialize(masterPassword: string): Promise<void> {
    try {
      // Generate master key from password
      const salt = CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.saltLength / 8)
      this.masterKey = CryptoJS.PBKDF2(masterPassword, salt, {
        keySize: 256 / 32,
        iterations: ENCRYPTION_CONFIG.iterations
      }).toString()
      
      // Store encrypted master key
      const encryptedMasterKey = this.encryptData(JSON.stringify({
        key: this.masterKey,
        timestamp: Date.now()
      }), masterPassword)
      
      localStorage.setItem('encrypted_master_key', encryptedMasterKey)
      localStorage.setItem('master_key_salt', salt.toString())
      
    } catch (error) {
      throw new Error('Failed to initialize encryption: ' + error)
    }
  }

  // Generate group-specific encryption key
  async generateGroupKey(groupId: string, memberIds: string[]): Promise<string> {
    try {
      // Generate random group key
      const groupKey = CryptoJS.lib.WordArray.random(256 / 8)
      
      // Create member-specific encrypted keys
      const encryptedKeys = await Promise.all(
        memberIds.map(async memberId => {
          const memberKey = await this.deriveMemberKey(memberId)
          return {
            memberId,
            encryptedKey: this.encryptData(groupKey.toString(), memberKey)
          }
        })
      )
      
      // Store group key for current user
      this.keys.set(groupId, groupKey)
      
      // Cache encrypted keys for distribution
      const keyData: GroupEncryptionKey = {
        groupId,
        encryptedKey: groupKey.toString(),
        salt: CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.saltLength / 8).toString(),
        iv: CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.ivLength / 8).toString(),
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      }
      
      localStorage.setItem(`group_key_${groupId}`, JSON.stringify(keyData))
      
      return groupKey.toString()
    } catch (error) {
      throw new Error('Failed to generate group key: ' + error)
    }
  }

  // Derive member-specific key
  private async deriveMemberKey(memberId: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized')
    }
    
    return CryptoJS.PBKDF2(memberId + this.masterKey, 'member_key_salt', {
      keySize: 256 / 32,
      iterations: ENCRYPTION_CONFIG.iterations
    }).toString()
  }

  // Encrypt group content
  encryptGroupContent(content: any, groupId: string): string {
    try {
      const groupKey = this.keys.get(groupId)
      if (!groupKey) {
        throw new Error('Group key not found')
      }
      
      // Add metadata to content
      const contentWithMetadata = {
        data: content,
        groupId,
        timestamp: Date.now(),
        version: '1.0'
      }
      
      return this.encryptData(JSON.stringify(contentWithMetadata), groupKey.toString())
    } catch (error) {
      throw new Error('Failed to encrypt group content: ' + error)
    }
  }

  // Decrypt group content
  decryptGroupContent(encryptedContent: string, groupId: string): any {
    try {
      const groupKey = this.keys.get(groupId)
      if (!groupKey) {
        throw new Error('Group key not found')
      }
      
      const decrypted = this.decryptData(encryptedContent, groupKey.toString())
      const contentWithMetadata = JSON.parse(decrypted)
      
      // Verify metadata
      if (contentWithMetadata.groupId !== groupId) {
        throw new Error('Group ID mismatch')
      }
      
      // Check if content is older than 7 days
      const contentAge = Date.now() - contentWithMetadata.timestamp
      if (contentAge > 7 * 24 * 60 * 60 * 1000) {
        throw new Error('Content expired (older than 7 days)')
      }
      
      return contentWithMetadata.data
    } catch (error) {
      throw new Error('Failed to decrypt group content: ' + error)
    }
  }

  // Encrypt data with AES-256-GCM
  public encryptData(data: string, key: string): string {
    try {
      const keyWordArray = CryptoJS.enc.Utf8.parse(key)
      const iv = CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.ivLength / 8)
      
      const encrypted = CryptoJS.AES.encrypt(data, keyWordArray, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.Pkcs7
      })
      
      // Combine IV and encrypted data
      const combined = iv.concat(encrypted.ciphertext)
      
      // Add authentication tag
      const result = {
        data: combined.toString(CryptoJS.enc.Base64),
        tag: encrypted.tag?.toString(CryptoJS.enc.Base64) || '',
        iv: iv.toString(CryptoJS.enc.Base64)
      }
      
      return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(result)))
    } catch (error) {
      throw new Error('Encryption failed: ' + error)
    }
  }

  // Decrypt data with AES-256-GCM
  public decryptData(encryptedData: string, key: string): string {
    try {
      const keyWordArray = CryptoJS.enc.Utf8.parse(key)
      const encryptedObj = JSON.parse(CryptoJS.enc.Base64.parse(encryptedData).toString(CryptoJS.enc.Utf8))
      
      const iv = CryptoJS.enc.Base64.parse(encryptedObj.iv)
      const ciphertext = CryptoJS.enc.Base64.parse(encryptedObj.data)
      const tag = CryptoJS.enc.Base64.parse(encryptedObj.tag)
      
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext, iv, tag } as any,
        keyWordArray,
        {
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.Pkcs7
        }
      )
      
      return decrypted.toString(CryptoJS.enc.Utf8)
    } catch (error) {
      throw new Error('Decryption failed: ' + error)
    }
  }

  // Rotate group keys
  async rotateGroupKey(groupId: string, memberIds: string[]): Promise<string> {
    try {
      // Invalidate old key
      this.keys.delete(groupId)
      localStorage.removeItem(`group_key_${groupId}`)
      
      // Generate new key
      return await this.generateGroupKey(groupId, memberIds)
    } catch (error) {
      throw new Error('Failed to rotate group key: ' + error)
    }
  }

  // Check if user has access to group
  async hasGroupAccess(groupId: string, userId: string): Promise<boolean> {
    try {
      const groupKeyData = localStorage.getItem(`group_key_${groupId}`)
      if (!groupKeyData) {
        return false
      }
      
      const keyData: GroupEncryptionKey = JSON.parse(groupKeyData)
      
      // Check if key is expired
      if (Date.now() > keyData.expiresAt) {
        localStorage.removeItem(`group_key_${groupId}`)
        return false
      }
      
      // Try to decrypt with user key
      try {
        const memberKey = await this.deriveMemberKey(userId)
        this.decryptData(keyData.encryptedKey, memberKey)
        return true
      } catch {
        return false
      }
    } catch {
      return false
    }
  }

  // Get group key status
  getGroupKeyStatus(groupId: string): { valid: boolean; expiresAt: number; timeRemaining: number } {
    const groupKeyData = localStorage.getItem(`group_key_${groupId}`)
    if (!groupKeyData) {
      return { valid: false, expiresAt: 0, timeRemaining: 0 }
    }
    
    const keyData: GroupEncryptionKey = JSON.parse(groupKeyData)
    const now = Date.now()
    const timeRemaining = Math.max(0, keyData.expiresAt - now)
    
    return {
      valid: now < keyData.expiresAt,
      expiresAt: keyData.expiresAt,
      timeRemaining
    }
  }

  // Clean up expired keys
  cleanupExpiredKeys(): void {
    const now = Date.now()
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('group_key_')) {
        const keyData = localStorage.getItem(key)
        if (keyData) {
          const parsed: GroupEncryptionKey = JSON.parse(keyData)
          if (now > parsed.expiresAt) {
            keysToRemove.push(key)
          }
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  // Export encrypted group data
  exportGroupData(groupId: string): string {
    const groupKey = this.keys.get(groupId)
    if (!groupKey) {
      throw new Error('Group key not found')
    }
    
    return this.encryptData(JSON.stringify({
      groupId,
      exportTime: Date.now(),
      version: '1.0'
    }), groupKey.toString())
  }

  // Import encrypted group data
  async importGroupData(encryptedData: string, groupId: string): Promise<boolean> {
    try {
      const groupKey = this.keys.get(groupId)
      if (!groupKey) {
        return false
      }
      
      const decrypted = this.decryptData(encryptedData, groupKey.toString())
      const data = JSON.parse(decrypted)
      
      return data.groupId === groupId
    } catch {
      return false
    }
  }
}

export default GroupEncryption

// Utility functions for secure operations
export const secureUtils = {
  // Generate secure random string
  generateSecureRandom(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length / 8).toString()
  },

  // Hash password with salt
  hashPassword(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: ENCRYPTION_CONFIG.iterations
    }).toString()
  },

  // Verify password
  verifyPassword(password: string, salt: string, hash: string): boolean {
    const computedHash = this.hashPassword(password, salt)
    return computedHash === hash
  },

  // Generate secure token
  generateSecureToken(): string {
    const timestamp = Date.now().toString()
    const random = this.generateSecureRandom(16)
    return CryptoJS.SHA256(timestamp + random).toString()
  },

  // Encrypt file
  encryptFile(file: File, key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string
          const encrypted = GroupEncryption.getInstance().encryptData(data, key)
          resolve(encrypted)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  },

  // Decrypt file
  decryptFile(encryptedData: string, key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const decrypted = GroupEncryption.getInstance().decryptData(encryptedData, key)
        resolve(decrypted)
      } catch (error) {
        reject(error)
      }
    })
  }
}
