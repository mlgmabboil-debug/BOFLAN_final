'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SecuritySettings {
  twoFactorAuth: boolean
  sessionTimeout: number
  ipWhitelist: string[]
  deviceTracking: boolean
  encryptionEnabled: boolean
  auditLogging: boolean
  rateLimiting: boolean
  suspiciousActivityDetection: boolean
}

export interface SecurityEvent {
  id: string
  type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'api_access' | 'suspicious_activity'
  timestamp: number
  userId: string
  ip: string
  userAgent: string
  location?: string
  details: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolved: boolean
}

export interface SecurityAlert {
  id: string
  type: 'unusual_login' | 'multiple_failed_attempts' | 'suspicious_activity' | 'data_breach' | 'malware_detected'
  timestamp: number
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  requiresAction: boolean
  actionTaken?: boolean
}

export interface DeviceInfo {
  id: string
  name: string
  type: 'desktop' | 'mobile' | 'tablet'
  os: string
  browser: string
  ip: string
  location: string
  lastSeen: number
  trusted: boolean
  currentSession: boolean
}

export function useSecurity() {
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorAuth: false,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    ipWhitelist: [],
    deviceTracking: true,
    encryptionEnabled: true,
    auditLogging: true,
    rateLimiting: true,
    suspiciousActivityDetection: true
  })

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([])
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [isSecure, setIsSecure] = useState(true)
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low')

  // Generate sample security events
  useEffect(() => {
    const sampleEvents: SecurityEvent[] = [
      {
        id: 'event_1',
        type: 'login',
        timestamp: Date.now() - 5 * 60 * 1000,
        userId: 'user_1',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: 'Moscow, Russia',
        details: 'Successful login from trusted device',
        severity: 'low',
        resolved: true
      },
      {
        id: 'event_2',
        type: 'failed_login',
        timestamp: Date.now() - 15 * 60 * 1000,
        userId: 'user_1',
        ip: '185.123.456.789',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: 'Unknown',
        details: 'Failed login attempt - invalid password',
        severity: 'medium',
        resolved: true
      },
      {
        id: 'event_3',
        type: 'api_access',
        timestamp: Date.now() - 2 * 60 * 1000,
        userId: 'user_1',
        ip: '192.168.1.100',
        userAgent: 'PostmanRuntime/7.32.3',
        location: 'Moscow, Russia',
        details: 'API access to trading endpoints',
        severity: 'low',
        resolved: true
      }
    ]

    const sampleAlerts: SecurityAlert[] = [
      {
        id: 'alert_1',
        type: 'unusual_login',
        timestamp: Date.now() - 15 * 60 * 1000,
        message: 'Login detected from new location/device',
        severity: 'medium',
        requiresAction: true,
        actionTaken: true
      },
      {
        id: 'alert_2',
        type: 'multiple_failed_attempts',
        timestamp: Date.now() - 30 * 60 * 1000,
        message: 'Multiple failed login attempts detected',
        severity: 'high',
        requiresAction: false,
        actionTaken: false
      }
    ]

    const sampleDevices: DeviceInfo[] = [
      {
        id: 'device_1',
        name: 'Windows Desktop',
        type: 'desktop',
        os: 'Windows 10',
        browser: 'Chrome 120.0',
        ip: '192.168.1.100',
        location: 'Moscow, Russia',
        lastSeen: Date.now() - 5 * 60 * 1000,
        trusted: true,
        currentSession: true
      },
      {
        id: 'device_2',
        name: 'iPhone 14',
        type: 'mobile',
        os: 'iOS 17.2',
        browser: 'Safari 17.2',
        ip: '192.168.1.101',
        location: 'Moscow, Russia',
        lastSeen: Date.now() - 2 * 60 * 60 * 1000,
        trusted: true,
        currentSession: false
      }
    ]

    setSecurityEvents(sampleEvents)
    setSecurityAlerts(sampleAlerts)
    setDevices(sampleDevices)
  }, [])

  // Calculate threat level based on alerts and events
  useEffect(() => {
    const criticalAlerts = securityAlerts.filter(alert => alert.severity === 'critical' && !alert.actionTaken)
    const highAlerts = securityAlerts.filter(alert => alert.severity === 'high' && !alert.actionTaken)
    const recentFailedLogins = securityEvents.filter(event => 
      event.type === 'failed_login' && 
      Date.now() - event.timestamp < 60 * 60 * 1000
    )

    if (criticalAlerts.length > 0) {
      setThreatLevel('critical')
      setIsSecure(false)
    } else if (highAlerts.length > 0 || recentFailedLogins.length > 5) {
      setThreatLevel('high')
      setIsSecure(false)
    } else if (securityAlerts.filter(alert => alert.severity === 'medium' && !alert.actionTaken).length > 0) {
      setThreatLevel('medium')
      setIsSecure(true)
    } else {
      setThreatLevel('low')
      setIsSecure(true)
    }
  }, [securityAlerts, securityEvents])

  // Security monitoring
  const monitorActivity = useCallback((activity: {
    type: SecurityEvent['type']
    ip: string
    userAgent: string
    details: string
  }) => {
    const event: SecurityEvent = {
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      userId: 'current_user',
      ...activity,
      severity: activity.type === 'failed_login' ? 'medium' : 'low',
      resolved: false
    }

    setSecurityEvents(prev => [event, ...prev])

    // Check for suspicious patterns
    if (activity.type === 'failed_login') {
      const recentFailures = securityEvents.filter(e => 
        e.type === 'failed_login' && 
        Date.now() - e.timestamp < 5 * 60 * 1000
      )

      if (recentFailures.length >= 3) {
        const alert: SecurityAlert = {
          id: `alert_${Date.now()}`,
          type: 'multiple_failed_attempts',
          timestamp: Date.now(),
          message: `Multiple failed login attempts detected from ${activity.ip}`,
          severity: 'high',
          requiresAction: true,
          actionTaken: false
        }
        setSecurityAlerts(prev => [alert, ...prev])
      }
    }
  }, [securityEvents])

  // Device management
  const addDevice = useCallback((device: Omit<DeviceInfo, 'id' | 'lastSeen' | 'currentSession'>) => {
    const newDevice: DeviceInfo = {
      ...device,
      id: `device_${Date.now()}`,
      lastSeen: Date.now(),
      currentSession: true
    }

    setDevices(prev => [newDevice, ...prev])
    return newDevice
  }, [])

  const removeDevice = useCallback((deviceId: string) => {
    setDevices(prev => prev.filter(device => device.id !== deviceId))
  }, [])

  const trustDevice = useCallback((deviceId: string) => {
    setDevices(prev => prev.map(device => 
      device.id === deviceId ? { ...device, trusted: true } : device
    ))
  }, [])

  // Security settings management
  const updateSecuritySettings = useCallback((settings: Partial<SecuritySettings>) => {
    setSecuritySettings(prev => ({ ...prev, ...settings }))
  }, [])

  const enable2FA = useCallback(() => {
    updateSecuritySettings({ twoFactorAuth: true })
  }, [updateSecuritySettings])

  const disable2FA = useCallback(() => {
    updateSecuritySettings({ twoFactorAuth: false })
  }, [updateSecuritySettings])

  // Alert management
  const resolveAlert = useCallback((alertId: string) => {
    setSecurityAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, actionTaken: true } : alert
    ))
  }, [])

  const dismissAlert = useCallback((alertId: string) => {
    setSecurityAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  // Security checks
  const isSecureConnection = useCallback(() => {
    return typeof window !== 'undefined' && window.location.protocol === 'https:'
  }, [])

  const validatePassword = useCallback((password: string) => {
    const minLength = 12
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    }
  }, [])

  const encryptData = useCallback((data: string): string => {
    // Simple encryption for demo - in production use proper encryption
    return btoa(data)
  }, [])

  const decryptData = useCallback((encryptedData: string): string => {
    // Simple decryption for demo - in production use proper decryption
    try {
      return atob(encryptedData)
    } catch {
      return ''
    }
  }, [])

  // Rate limiting
  const checkRateLimit = useCallback((action: string, limit: number = 10, windowMs: number = 60000) => {
    const key = `rate_limit_${action}`
    const now = Date.now()
    const attempts = JSON.parse(localStorage.getItem(key) || '[]')
    
    // Clean old attempts
    const validAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs)
    
    if (validAttempts.length >= limit) {
      return false
    }
    
    validAttempts.push(now)
    localStorage.setItem(key, JSON.stringify(validAttempts))
    return true
  }, [])

  return {
    securitySettings,
    securityEvents,
    securityAlerts,
    devices,
    isSecure,
    threatLevel,
    monitorActivity,
    addDevice,
    removeDevice,
    trustDevice,
    updateSecuritySettings,
    enable2FA,
    disable2FA,
    resolveAlert,
    dismissAlert,
    isSecureConnection,
    validatePassword,
    encryptData,
    decryptData,
    checkRateLimit
  }
}
