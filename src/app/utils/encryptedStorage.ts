'use client'

// Universal encrypted localStorage for the entire site
// Uses Web Crypto API AES-256-GCM with automatic key management

class EncryptedStorage {
  private static instance: EncryptedStorage
  private masterKey: CryptoKey | null = null
  private readonly algorithm = 'AES-GCM'
  private readonly keyLength = 256
  private initialized = false

  static getInstance(): EncryptedStorage {
    if (!EncryptedStorage.instance) {
      EncryptedStorage.instance = new EncryptedStorage()
    }
    return EncryptedStorage.instance
  }

  // Initialize with device-specific key (derived from browser fingerprint + random salt)
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const deviceSalt = this.getDeviceSalt()
      const fingerprint = await this.getBrowserFingerprint()

      const encoder = new TextEncoder()
      const combined = encoder.encode(fingerprint + deviceSalt)
      const hash = await crypto.subtle.digest('SHA-256', combined)

      this.masterKey = await crypto.subtle.importKey(
        'raw',
        hash,
        { name: this.algorithm },
        false,
        ['encrypt', 'decrypt']
      )

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize encrypted storage:', error)
      throw new Error('Storage encryption initialization failed')
    }
  }

  // Get or create device-specific salt
  private getDeviceSalt(): string {
    let salt = localStorage.getItem('__es_salt')
    if (!salt) {
      salt = this.generateRandomString(32)
      // Store salt in plain localStorage (needed to derive key)
      localStorage.setItem('__es_salt', salt)
    }
    return salt
  }

  // Generate browser fingerprint
  private async getBrowserFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      navigator.hardwareConcurrency?.toString() || '',
      new Date().getTimezoneOffset().toString()
    ]
    const encoder = new TextEncoder()
    const data = encoder.encode(components.join('|'))
    const hash = await crypto.subtle.digest('SHA-256', data)
    return this.arrayBufferToHex(hash)
  }

  // Set encrypted item
  async setItem(key: string, value: any): Promise<void> {
    await this.initialize()
    if (!this.masterKey) throw new Error('Storage not initialized')

    try {
      const serialized = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        key
      })

      const encoder = new TextEncoder()
      const data = encoder.encode(serialized)
      const iv = crypto.getRandomValues(new Uint8Array(12))

      const encrypted = await crypto.subtle.encrypt(
        { name: this.algorithm, iv },
        this.masterKey,
        data
      )

      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      localStorage.setItem(`__es_${key}`, this.arrayBufferToBase64(combined.buffer))
    } catch (error) {
      console.error(`Failed to encrypt storage key ${key}:`, error)
      throw error
    }
  }

  // Get decrypted item
  async getItem<T = any>(key: string): Promise<T | null> {
    await this.initialize()
    if (!this.masterKey) throw new Error('Storage not initialized')

    const encrypted = localStorage.getItem(`__es_${key}`)
    if (!encrypted) return null

    try {
      const combined = this.base64ToArrayBuffer(encrypted)
      const iv = combined.slice(0, 12)
      const data = combined.slice(12)

      const decrypted = await crypto.subtle.decrypt(
        { name: this.algorithm, iv },
        this.masterKey,
        data
      )

      const decoder = new TextDecoder()
      const parsed = JSON.parse(decoder.decode(decrypted))

      // Verify key integrity
      if (parsed.key !== key) {
        console.warn(`Storage key mismatch for ${key}`)
        return null
      }

      return parsed.data as T
    } catch (error) {
      console.error(`Failed to decrypt storage key ${key}:`, error)
      return null
    }
  }

  // Remove encrypted item
  removeItem(key: string): void {
    localStorage.removeItem(`__es_${key}`)
  }

  // Check if encrypted key exists
  hasItem(key: string): boolean {
    return localStorage.getItem(`__es_${key}`) !== null
  }

  // Get all encrypted keys
  getAllKeys(): string[] {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('__es_') && key !== '__es_salt') {
        keys.push(key.replace('__es_', ''))
      }
    }
    return keys
  }

  // Clear all encrypted storage
  clear(): void {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('__es_') && key !== '__es_salt') {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  // Migrate plain localStorage to encrypted
  async migrateKey(key: string): Promise<void> {
    const plain = localStorage.getItem(key)
    if (plain) {
      try {
        const value = JSON.parse(plain)
        await this.setItem(key, value)
        localStorage.removeItem(key)
      } catch {
        // If not JSON, store as string
        await this.setItem(key, plain)
        localStorage.removeItem(key)
      }
    }
  }

  // Secure session storage wrapper
  setSessionItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        key
      })
      sessionStorage.setItem(`__sess_${key}`, serialized)
    } catch (error) {
      console.error('Session storage error:', error)
    }
  }

  getSessionItem<T = any>(key: string): T | null {
    const item = sessionStorage.getItem(`__sess_${key}`)
    if (!item) return null
    try {
      const parsed = JSON.parse(item)
      return parsed.data as T
    } catch {
      return null
    }
  }

  removeSessionItem(key: string): void {
    sessionStorage.removeItem(`__sess_${key}`)
  }

  // Utility functions
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
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

  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const values = crypto.getRandomValues(new Uint8Array(length))
    for (let i = 0; i < length; i++) {
      result += chars[values[i] % chars.length]
    }
    return result
  }
}

// Export singleton instance
export const encryptedStorage = EncryptedStorage.getInstance()

// Synchronous wrappers for convenience (with auto-init)
export const secureStorage = {
  async set(key: string, value: any): Promise<void> {
    return encryptedStorage.setItem(key, value)
  },

  async get<T = any>(key: string): Promise<T | null> {
    return encryptedStorage.getItem<T>(key)
  },

  remove(key: string): void {
    encryptedStorage.removeItem(key)
  },

  has(key: string): boolean {
    return encryptedStorage.hasItem(key)
  },

  clear(): void {
    encryptedStorage.clear()
  }
}

// Hook for React components
export function useSecureStorage() {
  return {
    set: secureStorage.set,
    get: secureStorage.get,
    remove: secureStorage.remove,
    has: secureStorage.has,
    clear: secureStorage.clear
  }
}

export default encryptedStorage
