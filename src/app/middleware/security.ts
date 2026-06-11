'use client'

// Security middleware for client-side protection
export class SecurityMiddleware {
  private static instance: SecurityMiddleware
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map()
  private blockedIPs: Set<string> = new Set()
  private suspiciousPatterns: Map<string, number> = new Map()

  static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware()
    }
    return SecurityMiddleware.instance
  }

  // Rate limiting
  checkRateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const key = `rate_limit_${identifier}`
    const current = this.rateLimits.get(key)

    if (!current || now > current.resetTime) {
      this.rateLimits.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (current.count >= limit) {
      return false
    }

    current.count++
    return true
  }

  // IP blocking
  blockIP(ip: string, duration: number = 24 * 60 * 60 * 1000): void {
    this.blockedIPs.add(ip)
    setTimeout(() => {
      this.blockedIPs.delete(ip)
    }, duration)
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip)
  }

  // Suspicious activity detection
  trackSuspiciousActivity(pattern: string, severity: number = 1): void {
    const current = this.suspiciousPatterns.get(pattern) || 0
    this.suspiciousPatterns.set(pattern, current + severity)

    // Auto-block if threshold exceeded
    if (current + severity >= 10) {
      this.handleSuspiciousActivity(pattern)
    }
  }

  private handleSuspiciousActivity(pattern: string): void {
    console.warn(`Suspicious activity detected: ${pattern}`)
    // In production, this would trigger alerts, logging, and potential blocking
  }

  // Input validation and sanitization
  sanitizeInput(input: string): string {
    if (!input) return ''

    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove JavaScript protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
  }

  // XSS protection
  preventXSS(html: string): string {
    const div = document.createElement('div')
    div.textContent = html
    return div.innerHTML
  }

  // CSRF protection
  generateCSRFToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  validateCSRFToken(token: string, storedToken: string): boolean {
    return token === storedToken
  }

  // Content Security Policy
  getCSPHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.coingecko.com",
        "font-src 'self'",
        "object-src 'none'",
        "media-src 'self'",
        "frame-src 'none'",
        "child-src 'none'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "upgrade-insecure-requests"
      ].join('; ')
    }
  }

  // Security headers
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      ...this.getCSPHeaders()
    }
  }

  // Input validation
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  validatePassword(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
  }

  // SQL injection prevention
  preventSQLInjection(input: string): string {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;|'|"|`)/gi,
      /\b(OR|AND)\s+\d+\s*=\s*\d+/gi,
      /\b(OR|AND)\s+\w+\s*=\s*\w+/gi
    ]

    let sanitized = input
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })

    return sanitized.trim()
  }

  // File upload security
  validateFileUpload(file: File): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not allowed')
    }

    if (file.size > maxSize) {
      errors.push('File size exceeds 5MB limit')
    }

    // Check file name for suspicious patterns
    const suspiciousPatterns = [/\.(exe|bat|cmd|scr|pif|com)$/i, /\./]
    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('File name contains suspicious patterns')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Session security
  validateSession(session: any): boolean {
    if (!session || !session.userId || !session.token) {
      return false
    }

    // Check session expiration
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return false
    }

    // Check session integrity
    const expectedHash = this.generateSessionHash(session.userId, session.createdAt)
    return session.hash === expectedHash
  }

  private generateSessionHash(userId: string, createdAt: number): string {
    const data = `${userId}-${createdAt}`
    return btoa(data).replace(/[+/=]/g, '')
  }

  // API security
  validateAPIKey(apiKey: string): boolean {
    // Basic validation - in production, check against database
    return /^boflan_[a-zA-Z0-9]{32}$/.test(apiKey)
  }

  generateAPIKey(): string {
    const prefix = 'boflan_'
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    return prefix + randomBytes
  }

  // Rate limiting for API calls
  checkAPIRateLimit(apiKey: string, endpoint: string): boolean {
    const identifier = `api_${apiKey}_${endpoint}`
    return this.checkRateLimit(identifier, 100, 60000) // 100 calls per minute
  }

  // Data encryption
  encryptData(data: string): string {
    // Simple encryption for demo - use proper encryption in production
    return btoa(data)
  }

  decryptData(encryptedData: string): string {
    try {
      return atob(encryptedData)
    } catch {
      return ''
    }
  }

  // Audit logging
  logSecurityEvent(event: {
    type: string
    userId?: string
    ip?: string
    userAgent?: string
    details: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }): void {
    const logEntry = {
      ...event,
      timestamp: new Date().toISOString(),
      sessionId: this.getCurrentSessionId()
    }

    // In production, send to secure logging service
    console.log('Security Event:', logEntry)

    // Store in localStorage for demo
    const logs = JSON.parse(localStorage.getItem('security_logs') || '[]')
    logs.push(logEntry)
    localStorage.setItem('security_logs', JSON.stringify(logs.slice(-100))) // Keep last 100 logs
  }

  private getCurrentSessionId(): string {
    return sessionStorage.getItem('session_id') || 'unknown'
  }

  // Initialize security monitoring
  initializeMonitoring(): void {
    // Monitor for suspicious activity
    let failedAttempts = 0
    let lastFailedAttempt = 0

    // Reset failed attempts after 15 minutes
    setInterval(() => {
      if (Date.now() - lastFailedAttempt > 15 * 60 * 1000) {
        failedAttempts = 0
      }
    }, 60000)

    // Monitor console access
    const originalConsole = console.log
    console.log = (...args: any[]) => {
      // Log console access for debugging
      originalConsole.apply(console, args)
      
      // Check for suspicious console usage
      if (args.some(arg => typeof arg === 'string' && arg.includes('password'))) {
        this.trackSuspiciousActivity('console_password_access', 5)
      }
    }

    // Monitor for devtools
    let devtools = { open: false, orientation: null }
    const threshold = 160
    
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true
          this.trackSuspiciousActivity('devtools_opened', 3)
        }
      } else {
        devtools.open = false
      }
    }, 500)

    // Monitor for copy events
    document.addEventListener('copy', (e) => {
      const selection = document.getSelection()
      if (selection && selection.toString().includes('password')) {
        this.trackSuspiciousActivity('password_copy_attempt', 5)
      }
    })

    // Monitor for paste events
    document.addEventListener('paste', (e) => {
      const clipboardData = e.clipboardData?.getData('text')
      if (clipboardData && clipboardData.includes('password')) {
        this.trackSuspiciousActivity('password_paste_attempt', 3)
      }
    })
  }
}

// Export singleton instance
export const securityMiddleware = SecurityMiddleware.getInstance()
