'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, Lock, Eye, EyeOff, Smartphone, Monitor, Tablet, Settings, RefreshCw, Ban, ShieldCheck } from 'lucide-react'
import { useSecurity, SecurityEvent, SecurityAlert, DeviceInfo } from '../hooks/useSecurity'

interface SecurityDashboardProps {
  className?: string
}

export function SecurityDashboard({ className = '' }: SecurityDashboardProps) {
  const {
    securitySettings,
    securityEvents,
    securityAlerts,
    devices,
    isSecure,
    threatLevel,
    resolveAlert,
    dismissAlert,
    removeDevice,
    trustDevice,
    enable2FA,
    updateSecuritySettings
  } = useSecurity()

  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'events' | 'settings'>('overview')

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-400 bg-red-400/20 border-red-400/30'
      case 'high':
        return 'text-orange-400 bg-orange-400/20 border-orange-400/30'
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30'
      default:
        return 'text-green-400 bg-green-400/20 border-green-400/30'
    }
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />
      case 'tablet':
        return <Tablet className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed_login':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'suspicious_activity':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />
      default:
        return <Activity className="w-4 h-4 text-blue-400" />
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const handlePasswordChange = () => {
    if (newPassword === confirmPassword && newPassword.length >= 12) {
      // Handle password change
      console.log('Password changed successfully')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Security Status */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Security Status</h3>
          <div className={`px-3 py-1 rounded-full border ${getThreatLevelColor(threatLevel)}`}>
            <span className="text-sm font-medium capitalize">{threatLevel}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
              isSecure ? 'bg-green-400/20' : 'bg-red-400/20'
            }`}>
              {isSecure ? (
                <ShieldCheck className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div className="text-white font-medium">{isSecure ? 'Secure' : 'At Risk'}</div>
            <div className="text-white/60 text-xs">Overall Status</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center mx-auto mb-2">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-white font-medium">{securityEvents.length}</div>
            <div className="text-white/60 text-xs">Events Today</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-purple-400/20 flex items-center justify-center mx-auto mb-2">
              <Smartphone className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-white font-medium">{devices.length}</div>
            <div className="text-white/60 text-xs">Devices</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-white font-medium">{securityAlerts.filter(a => !a.actionTaken).length}</div>
            <div className="text-white/60 text-xs">Active Alerts</div>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <h3 className="text-white font-medium mb-4">Security Features</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-[#00D084]" />
              <div>
                <div className="text-white text-sm">Two-Factor Authentication</div>
                <div className="text-white/60 text-xs">Extra layer of security</div>
              </div>
            </div>
            <button
              onClick={securitySettings.twoFactorAuth ? () => {} : enable2FA}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                securitySettings.twoFactorAuth
                  ? 'bg-green-400/20 text-green-400'
                  : 'bg-[#00D084] hover:bg-[#00b876] text-white'
              }`}
            >
              {securitySettings.twoFactorAuth ? 'Enabled' : 'Enable'}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-white text-sm">End-to-End Encryption</div>
                <div className="text-white/60 text-xs">Data is encrypted</div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-md text-sm font-medium ${
              securitySettings.encryptionEnabled
                ? 'bg-green-400/20 text-green-400'
                : 'bg-red-400/20 text-red-400'
            }`}>
              {securitySettings.encryptionEnabled ? 'Active' : 'Inactive'}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-white text-sm">Suspicious Activity Detection</div>
                <div className="text-white/60 text-xs">AI-powered monitoring</div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-md text-sm font-medium ${
              securitySettings.suspiciousActivityDetection
                ? 'bg-green-400/20 text-green-400'
                : 'bg-red-400/20 text-red-400'
            }`}>
              {securitySettings.suspiciousActivityDetection ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      {securityAlerts.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <h3 className="text-white font-medium mb-4">Recent Security Alerts</h3>
          <div className="space-y-3">
            {securityAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                    alert.severity === 'critical' ? 'text-red-400' :
                    alert.severity === 'high' ? 'text-orange-400' :
                    alert.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                  }`} />
                  <div>
                    <div className="text-white text-sm">{alert.message}</div>
                    <div className="text-white/60 text-xs">{formatTimeAgo(alert.timestamp)}</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {alert.requiresAction && !alert.actionTaken && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="text-[#00D084] hover:text-[#00b876] text-xs"
                    >
                      Resolve
                    </button>
                  )}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-white/40 hover:text-white/60 text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderDevices = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Trusted Devices</h3>
        <div className="text-white/60 text-sm">{devices.length} devices</div>
      </div>
      
      {devices.map((device) => (
        <div key={device.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-[#111111] rounded-lg">
                {getDeviceIcon(device.type)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-white font-medium">{device.name}</h4>
                  {device.currentSession && (
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  )}
                  {device.trusted && (
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                  )}
                </div>
                <div className="text-white/60 text-sm">{device.os} • {device.browser}</div>
                <div className="text-white/60 text-sm">{device.ip} • {device.location}</div>
                <div className="text-white/60 text-xs mt-1">Last seen: {formatTimeAgo(device.lastSeen)}</div>
              </div>
            </div>
            <div className="flex space-x-2">
              {!device.trusted && (
                <button
                  onClick={() => trustDevice(device.id)}
                  className="text-[#00D084] hover:text-[#00b876] text-sm"
                >
                  Trust
                </button>
              )}
              {!device.currentSession && (
                <button
                  onClick={() => removeDevice(device.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderEvents = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Security Events</h3>
        <div className="text-white/60 text-sm">{securityEvents.length} events</div>
      </div>
      
      {securityEvents.map((event) => (
        <div key={event.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-start space-x-3">
            {getEventIcon(event.type)}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium capitalize">{event.type.replace('_', ' ')}</h4>
                <span className="text-white/60 text-xs">{formatTimeAgo(event.timestamp)}</span>
              </div>
              <p className="text-white/80 text-sm mt-1">{event.details}</p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-white/60">
                <span>IP: {event.ip}</span>
                <span>Location: {event.location || 'Unknown'}</span>
                <span className={`px-2 py-1 rounded ${
                  event.severity === 'critical' ? 'bg-red-400/20 text-red-400' :
                  event.severity === 'high' ? 'bg-orange-400/20 text-orange-400' :
                  event.severity === 'medium' ? 'bg-yellow-400/20 text-yellow-400' :
                  'bg-blue-400/20 text-blue-400'
                }`}>
                  {event.severity}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-6">
      {/* Password Change */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <h3 className="text-white font-medium mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-white/60 text-sm mb-2">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-[#111111] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
            />
          </div>
          
          <button
            onClick={handlePasswordChange}
            disabled={!newPassword || newPassword !== confirmPassword || newPassword.length < 12}
            className="w-full bg-[#00D084] hover:bg-[#00b876] disabled:bg-[#2a2a2a] disabled:text-white/40 text-white rounded-md py-2 font-medium transition-colors"
          >
            Change Password
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <h3 className="text-white font-medium mb-4">Security Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Session Timeout</div>
              <div className="text-white/60 text-xs">Auto-logout after inactivity</div>
            </div>
            <select
              value={securitySettings.sessionTimeout / 60000}
              onChange={(e) => updateSecuritySettings({ sessionTimeout: parseInt(e.target.value) * 60000 })}
              className="bg-[#111111] border border-[#2a2a2a] rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D084]"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Device Tracking</div>
              <div className="text-white/60 text-xs">Monitor all device logins</div>
            </div>
            <button
              onClick={() => updateSecuritySettings({ deviceTracking: !securitySettings.deviceTracking })}
              className={`w-12 h-6 rounded-full transition-colors ${
                securitySettings.deviceTracking ? 'bg-[#00D084]' : 'bg-[#2a2a2a]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                securitySettings.deviceTracking ? 'translate-x-6' : 'translate-x-0.5'
              }`}></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Audit Logging</div>
              <div className="text-white/60 text-xs">Log all security events</div>
            </div>
            <button
              onClick={() => updateSecuritySettings({ auditLogging: !securitySettings.auditLogging })}
              className={`w-12 h-6 rounded-full transition-colors ${
                securitySettings.auditLogging ? 'bg-[#00D084]' : 'bg-[#2a2a2a]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                securitySettings.auditLogging ? 'translate-x-6' : 'translate-x-0.5'
              }`}></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`bg-[#111111] border border-[#1e1e1e] rounded-lg p-4 md:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-[#00D084]" />
          <h2 className="text-xl md:text-2xl font-bold text-white">Security Dashboard</h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full border ${getThreatLevelColor(threatLevel)}`}>
            <span className="text-sm font-medium capitalize">{threatLevel}</span>
          </div>
          <button className="p-2 text-white/60 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-[#1a1a1a] rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'devices', label: 'Devices' },
          { id: 'events', label: 'Events' },
          { id: 'settings', label: 'Settings' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#00D084] text-white'
                : 'text-white/60 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'devices' && renderDevices()}
        {activeTab === 'events' && renderEvents()}
        {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  )
}
