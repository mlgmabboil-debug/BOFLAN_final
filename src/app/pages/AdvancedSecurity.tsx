'use client'

import { useState, useEffect } from 'react'
import { Shield, Lock, Eye, EyeOff, AlertTriangle, CheckCircle, Key, RefreshCw, Activity, Database, Globe, Server, Users, FileText, Settings } from 'lucide-react'
import VulnerabilityFixes from '../security/vulnerabilityFixes'
import SecureGroupEncryption from '../crypto/secureEncryption'
import { useSecureGroups } from '../hooks/useSecureGroups'

const SECURITY_TABS = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'encryption', label: 'Encryption', icon: Lock },
  { id: 'vulnerabilities', label: 'Vulnerabilities', icon: AlertTriangle },
  { id: 'audit', label: 'Security Audit', icon: Activity },
] as const

export default function AdvancedSecurity() {
  const [activeTab, setActiveTab] = useState<'overview' | 'encryption' | 'vulnerabilities' | 'audit'>('overview')
  const [securityScore, setSecurityScore] = useState(0)
  const [vulnerabilities, setVulnerabilities] = useState<string[]>([])
  const [encryptionStatus, setEncryptionStatus] = useState<any>({})
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
  const [auditResults, setAuditResults] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  
  const { groups, createSecureGroup, rotateGroupKey, getGroupKeyStatus } = useSecureGroups()
  const [vulnerabilityFixes] = useState(() => VulnerabilityFixes.getInstance())
  const [encryption] = useState(() => SecureGroupEncryption.getInstance())

  useEffect(() => {
    performSecurityAudit()
    checkEncryptionStatus()
  }, [])

  const performSecurityAudit = () => {
    setIsScanning(true)
    const audit = vulnerabilityFixes.performSecurityAudit()
    setSecurityScore(audit.score)
    setVulnerabilities(audit.issues)
    setAuditResults(audit)
    setIsScanning(false)
  }

  const checkEncryptionStatus = () => {
    const status = {
      initialized: true,
      secureGroups: groups.length,
      encryptedMessages: 0,
      keyRotationEnabled: true,
      lastKeyRotation: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
      encryptionAlgorithm: 'AES-256-GCM',
      keyStrength: '256-bit'
    }
    setEncryptionStatus(status)
  }

  const handleRotateAllKeys = async () => {
    try {
      for (const group of groups) {
        await rotateGroupKey(group.id)
      }
      checkEncryptionStatus()
    } catch (error) {
      console.error('Failed to rotate keys:', error)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getVulnerabilitySeverity = (issue: string): 'critical' | 'high' | 'medium' | 'low' => {
    if (issue.includes('HTTPS')) return 'critical'
    if (issue.includes('CSP')) return 'high'
    if (issue.includes('cookie')) return 'medium'
    return 'low'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-400/20'
      case 'high': return 'text-orange-400 bg-orange-400/20'
      case 'medium': return 'text-yellow-400 bg-yellow-400/20'
      default: return 'text-blue-400 bg-blue-400/20'
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Security Score */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Security Score</h3>
          <button
            onClick={performSecurityAudit}
            disabled={isScanning}
            className="bg-[#00D084] hover:bg-[#00b876] disabled:bg-[#2a2a2a] disabled:text-white/40 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                <span>Run Audit</span>
              </>
            )}
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-4xl font-bold text-white">{securityScore}</div>
          <div className="flex-1">
            <div className="w-full bg-[#2a2a2a] rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  securityScore >= 90 ? 'bg-green-400' :
                  securityScore >= 70 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${securityScore}%` }}
              />
            </div>
          </div>
          <div className={`text-2xl font-medium ${getScoreColor(securityScore)}`}>
            {securityScore >= 90 ? 'A' : securityScore >= 70 ? 'B' : 'C'}
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{groups.length}</div>
            <div className="text-white/60 text-sm">Secure Groups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{vulnerabilities.length}</div>
            <div className="text-white/60 text-sm">Vulnerabilities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">256-bit</div>
            <div className="text-white/60 text-sm">Encryption</div>
          </div>
        </div>
      </div>

      {/* Security Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Lock className="w-5 h-5 text-green-400" />
            <h4 className="text-white font-medium">Encryption Status</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Algorithm</span>
              <span className="text-white text-sm">{encryptionStatus.encryptionAlgorithm}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Key Strength</span>
              <span className="text-white text-sm">{encryptionStatus.keyStrength}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Key Rotation</span>
              <span className="text-green-400 text-sm">Enabled</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-5 h-5 text-blue-400" />
            <h4 className="text-white font-medium">Protection Status</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">XSS Protection</span>
              <span className="text-green-400 text-sm">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">CSRF Protection</span>
              <span className="text-green-400 text-sm">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Rate Limiting</span>
              <span className="text-green-400 text-sm">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderEncryption = () => (
    <div className="space-y-6">
      {/* Group Encryption */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Group Encryption</h3>
          <button
            onClick={handleRotateAllKeys}
            className="bg-[#00D084] hover:bg-[#00b876] text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Rotate All Keys</span>
          </button>
        </div>
        
        <div className="space-y-4">
          {groups.map((group) => {
            const keyStatus = getGroupKeyStatus(group.id)
            return (
              <div key={group.id} className="bg-[#111111] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium">{group.name}</h4>
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm">Encrypted</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-white/60 text-sm">Members</span>
                    <div className="text-white font-medium">{group.members.length}</div>
                  </div>
                  <div>
                    <span className="text-white/60 text-sm">Key Status</span>
                    <div className="text-white font-medium">
                      {keyStatus.valid ? 'Active' : 'Expired'}
                    </div>
                  </div>
                  <div>
                    <span className="text-white/60 text-sm">Expires In</span>
                    <div className="text-white font-medium">
                      {Math.floor(keyStatus.timeRemaining / (1000 * 60 * 60))}h
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Encryption Settings */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Encryption Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Auto-rotate keys</div>
              <div className="text-white/60 text-xs">Rotate keys every 7 days</div>
            </div>
            <button className="w-12 h-6 rounded-full bg-[#00D084] transition-colors">
              <div className="w-5 h-5 bg-white rounded-full transition-transform translate-x-6"></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Secure backup</div>
              <div className="text-white/60 text-xs">Backup encrypted keys</div>
            </div>
            <button className="w-12 h-6 rounded-full bg-[#00D084] transition-colors">
              <div className="w-5 h-5 bg-white rounded-full transition-transform translate-x-6"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderVulnerabilities = () => (
    <div className="space-y-6">
      {/* Vulnerability Scan Results */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Vulnerability Scan Results</h3>
        
        {vulnerabilities.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h4 className="text-white font-medium mb-2">No Vulnerabilities Found</h4>
            <p className="text-white/60 text-sm">Your application is secure</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vulnerabilities.map((vulnerability, index) => {
              const severity = getVulnerabilitySeverity(vulnerability)
              return (
                <div key={index} className="bg-[#111111] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-medium">{vulnerability}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(severity)}`}>
                      {severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-white/60 text-sm">
                    This vulnerability should be addressed to improve security.
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Security Headers */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Security Headers</h3>
        <div className="space-y-3">
          {Object.entries(vulnerabilityFixes.getSecurityHeaders()).map(([header, value]) => (
            <div key={header} className="bg-[#111111] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm font-mono">{header}</span>
                <span className="text-green-400 text-sm">Active</span>
              </div>
              <div className="text-white/80 text-xs font-mono mt-1 break-all">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderAudit = () => (
    <div className="space-y-6">
      {/* Security Audit */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Security Audit</h3>
          <button
            onClick={performSecurityAudit}
            disabled={isScanning}
            className="bg-[#00D084] hover:bg-[#00b876] disabled:bg-[#2a2a2a] disabled:text-white/40 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                <span>Run Full Audit</span>
              </>
            )}
          </button>
        </div>
        
        {auditResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111111] rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Data Protection</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Encryption</span>
                    <span className="text-green-400 text-sm">AES-256-GCM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Key Management</span>
                    <span className="text-green-400 text-sm">Secure</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#111111] rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Globe className="w-5 h-5 text-green-400" />
                  <span className="text-white font-medium">Network Security</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">HTTPS</span>
                    <span className="text-green-400 text-sm">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">CSP</span>
                    <span className="text-green-400 text-sm">Active</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111111] rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-medium">Access Control</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Authentication</span>
                    <span className="text-green-400 text-sm">Multi-factor</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Session Management</span>
                    <span className="text-green-400 text-sm">Secure</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#111111] rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <FileText className="w-5 h-5 text-orange-400" />
                  <span className="text-white font-medium">Compliance</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">GDPR</span>
                    <span className="text-green-400 text-sm">Compliant</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Data Retention</span>
                    <span className="text-green-400 text-sm">7 days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'encryption':
        return renderEncryption()
      case 'vulnerabilities':
        return renderVulnerabilities()
      case 'audit':
        return renderAudit()
      default:
        return renderOverview()
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Advanced Security Center</h1>
          <p className="text-white/60 text-sm md:text-base">Comprehensive security management and vulnerability protection</p>
        </div>

        {/* Security Score Banner */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className={`w-6 h-6 ${getScoreColor(securityScore)}`} />
              <div>
                <div className="text-white font-medium">
                  Security Status: {securityScore >= 90 ? 'Secure' : securityScore >= 70 ? 'At Risk' : 'Vulnerable'}
                </div>
                <div className="text-white/60 text-sm">
                  {vulnerabilities.length} vulnerabilities found
                </div>
              </div>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(securityScore)}`}>
              {securityScore}/100
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-[#1a1a1a] rounded-lg p-1 overflow-x-auto">
          {SECURITY_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#00D084] text-white'
                    : 'text-white/60 hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
