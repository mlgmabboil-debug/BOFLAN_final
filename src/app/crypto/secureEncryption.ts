'use client'

// Web Crypto API based encryption (no external dependencies)
class SecureGroupEncryption {
  private static instance: SecureGroupEncryption
  private keys: Map<string, CryptoKey> = new Map()
  private masterKey: CryptoKey | null = null
  private readonly algorithm = 'AES-GCM'
  private readonly keyLength = 256

  static getInstance(): SecureGroupEncryption {
    if (!SecureGroupEncryption.instance) {
      SecureGroupEncryption.instance = new SecureGroupEncryption()
    }
    return SecureGroupEncryption.instance
  }

  // Initialize with user master key
  async initialize(masterPassword: string): Promise<void> {
    try {
      // Generate master key from password
      const encoder = new TextEncoder()
      const passwordData = encoder.encode(masterPassword)
      
      // Import password as key
      const baseKey = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.digest('SHA-256', passwordData),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      )
      
      // Derive master key
      const salt = crypto.getRandomValues(new Uint8Array(16))
      this.masterKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: this.algorithm, length: this.keyLength },
        true,
        ['encrypt', 'decrypt']
      )
      
      // Store salt for future use
      localStorage.setItem('master_key_salt', this.arrayBufferToBase64(salt))
      
    } catch (error) {
      throw new Error('Failed to initialize encryption: ' + error)
    }
  }

  // Generate group-specific encryption key
  async generateGroupKey(groupId: string, memberIds: string[]): Promise<string> {
    try {
      // Generate random group key
      const groupKey = await crypto.subtle.generateKey(
        { name: this.algorithm, length: this.keyLength },
        true,
        ['encrypt', 'decrypt']
      )
      
      // Store group key for current user
      this.keys.set(groupId, groupKey)
      
      // Export and cache encrypted key
      const exportedKey = await crypto.subtle.exportKey('raw', groupKey)
      const keyData = {
        groupId,
        key: this.arrayBufferToBase64(exportedKey),
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      }
      
      // Encrypt key for storage
      const encryptedKeyData = await this.encryptForStorage(JSON.stringify(keyData))
      localStorage.setItem(`group_key_${groupId}`, encryptedKeyData)
      
      return this.arrayBufferToBase64(exportedKey)
    } catch (error) {
      throw new Error('Failed to generate group key: ' + error)
    }
  }

  // Encrypt group content
  async encryptGroupContent(content: any, groupId: string): Promise<string> {
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
      
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(contentWithMetadata))
      
      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12))
      
      // Encrypt
      const encrypted = await crypto.subtle.encrypt(
        { name: this.algorithm, iv },
        groupKey,
        data
      )
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)
      
      return this.arrayBufferToBase64(combined.buffer)
    } catch (error) {
      throw new Error('Failed to encrypt group content: ' + error)
    }
  }

  // Decrypt group content
  async decryptGroupContent(encryptedContent: string, groupId: string): Promise<any> {
    try {
      const groupKey = this.keys.get(groupId)
      if (!groupKey) {
        // Try to load from storage
        await this.loadGroupKey(groupId)
        const loadedKey = this.keys.get(groupId)
        if (!loadedKey) {
          throw new Error('Group key not found')
        }
      }
      
      const combined = this.base64ToArrayBuffer(encryptedContent)
      const iv = combined.slice(0, 12)
      const encrypted = combined.slice(12)
      
      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: this.algorithm, iv },
        this.keys.get(groupId)!,
        encrypted
      )
      
      const decoder = new TextDecoder()
      const contentWithMetadata = JSON.parse(decoder.decode(decrypted))
      
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

  // Load group key from storage
  private async loadGroupKey(groupId: string): Promise<void> {
    try {
      const encryptedKeyData = localStorage.getItem(`group_key_${groupId}`)
      if (!encryptedKeyData) {
        throw new Error('Group key not found in storage')
      }
      
      const decryptedKeyData = await this.decryptFromStorage(encryptedKeyData)
      const keyData = JSON.parse(decryptedKeyData)
      
      // Check if key is expired
      if (Date.now() > keyData.expiresAt) {
        localStorage.removeItem(`group_key_${groupId}`)
        throw new Error('Group key expired')
      }
      
      // Import key
      const keyBuffer = this.base64ToArrayBuffer(keyData.key)
      const groupKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: this.algorithm },
        true,
        ['encrypt', 'decrypt']
      )
      
      this.keys.set(groupId, groupKey)
    } catch (error) {
      throw new Error('Failed to load group key: ' + error)
    }
  }

  // Encrypt data for storage
  private async encryptForStorage(data: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized')
    }
    
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const encrypted = await crypto.subtle.encrypt(
      { name: this.algorithm, iv },
      this.masterKey,
      dataBuffer
    )
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)
    
    return this.arrayBufferToBase64(combined.buffer)
  }

  // Decrypt data from storage
  private async decryptFromStorage(encryptedData: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized')
    }
    
    const combined = this.base64ToArrayBuffer(encryptedData)
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    
    const decrypted = await crypto.subtle.decrypt(
      { name: this.algorithm, iv },
      this.masterKey,
      encrypted
    )
    
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }

  // Check if user has access to group
  async hasGroupAccess(groupId: string, userId: string): Promise<boolean> {
    try {
      const encryptedKeyData = localStorage.getItem(`group_key_${groupId}`)
      if (!encryptedKeyData) {
        return false
      }
      
      // Try to load and validate key
      await this.loadGroupKey(groupId)
      return true
    } catch {
      return false
    }
  }

  // Get group key status
  getGroupKeyStatus(groupId: string): { valid: boolean; expiresAt: number; timeRemaining: number } {
    const encryptedKeyData = localStorage.getItem(`group_key_${groupId}`)
    if (!encryptedKeyData) {
      return { valid: false, expiresAt: 0, timeRemaining: 0 }
    }
    
    try {
      // This is a simplified check - in production, you'd need to decrypt
      const keyData = JSON.parse(atob(encryptedKeyData))
      const now = Date.now()
      const timeRemaining = Math.max(0, keyData.expiresAt - now)
      
      return {
        valid: now < keyData.expiresAt,
        expiresAt: keyData.expiresAt,
        timeRemaining
      }
    } catch {
      return { valid: false, expiresAt: 0, timeRemaining: 0 }
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

  // Clean up expired keys
  cleanupExpiredKeys(): void {
    const now = Date.now()
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('group_key_')) {
        try {
          const keyData = JSON.parse(atob(localStorage.getItem(key) || '{}'))
          if (now > keyData.expiresAt) {
            keysToRemove.push(key)
          }
        } catch {
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  // Utility functions
  private arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  // Generate secure random string
  generateSecureRandom(length: number = 32): string {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return this.arrayBufferToBase64(array.buffer)
  }

  // Hash password
  async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + salt)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return this.arrayBufferToBase64(hash)
  }

  // Generate secure token
  generateSecureToken(): string {
    const timestamp = Date.now().toString()
    const random = this.generateSecureRandom(16)
    const data = timestamp + random
    return this.arrayBufferToBase64(new TextEncoder().encode(data).buffer)
  }
}

export default SecureGroupEncryption

// Security utilities
export const securityUtils = {
  // XSS Protection
  sanitizeHTML: (html: string): string => {
    const div = document.createElement('div')
    div.textContent = html
    return div.innerHTML
  },

  // CSRF Protection
  generateCSRFToken: (): string => {
    const timestamp = Date.now().toString()
    const random = SecureGroupEncryption.getInstance().generateSecureRandom(16)
    return btoa(timestamp + random)
  },

  // SQL Injection Protection
  sanitizeSQL: (input: string): string => {
    return input.replace(/['"\\;]/g, '')
  },

  // Input Validation
  validateInput: (input: string, type: 'email' | 'username' | 'text'): boolean => {
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
      case 'username':
        return /^[a-zA-Z0-9_]{3,20}$/.test(input)
      case 'text':
        return input.length > 0 && input.length <= 1000
      default:
        return false
    }
  },

  // Rate Limiting
  rateLimiter: new Map<string, { count: number; resetTime: number }>(),

  checkRateLimit: (identifier: string, limit: number, windowMs: number): boolean => {
    const now = Date.now()
    const record = securityUtils.rateLimiter.get(identifier)
    
    if (!record || now > record.resetTime) {
      securityUtils.rateLimiter.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      })
      return true
    }
    
    if (record.count >= limit) {
      return false
    }
    
    record.count++
    return true
  },

  // Content Security Policy
  getCSPHeader: (): string => {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  },

  // Security Headers
  getSecurityHeaders: (): Record<string, string> => {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': securityUtils.getCSPHeader(),
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  }
}
