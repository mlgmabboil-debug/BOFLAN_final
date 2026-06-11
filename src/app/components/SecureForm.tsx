'use client'

import { useState, useEffect, useRef } from 'react'
import { Shield, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react'
import { securityMiddleware } from '../middleware/security'

interface SecureFormProps {
  onSubmit: (data: any) => void
  children: React.ReactNode
  className?: string
  requireCSRF?: boolean
  validateInputs?: boolean
  logActivity?: boolean
}

interface FormField {
  name: string
  value: string
  error?: string
  touched: boolean
  required?: boolean
  type?: 'text' | 'email' | 'password' | 'phone' | 'number'
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: string) => string | null
  }
}

export function SecureForm({
  onSubmit,
  children,
  className = '',
  requireCSRF = true,
  validateInputs = true,
  logActivity = true
}: SecureFormProps) {
  const [csrfToken, setCsrfToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitAttempts, setSubmitAttempts] = useState(0)
  const [lastSubmitTime, setLastSubmitTime] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  // Generate CSRF token on mount
  useEffect(() => {
    if (requireCSRF) {
      const token = securityMiddleware.generateCSRFToken()
      setCsrfToken(token)
    }

    // Initialize security monitoring
    securityMiddleware.initializeMonitoring()
  }, [requireCSRF])

  // Rate limiting for form submission
  const checkSubmitRateLimit = (): boolean => {
    const now = Date.now()
    const timeSinceLastSubmit = now - lastSubmitTime
    
    // Allow maximum 5 submissions per minute
    if (timeSinceLastSubmit < 60000 / 5) {
      return false
    }
    
    setLastSubmitTime(now)
    return true
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Rate limiting check
    if (!checkSubmitRateLimit()) {
      alert('Please wait before submitting again')
      return
    }

    // Check for CSRF token
    if (requireCSRF && !csrfToken) {
      alert('Security token missing')
      return
    }

    setIsSubmitting(true)
    setSubmitAttempts(prev => prev + 1)

    try {
      // Log successful submission
      if (logActivity) {
        securityMiddleware.logSecurityEvent({
          type: 'form_submitted',
          details: 'Form submitted',
          severity: 'low'
        })
      }

      await onSubmit({})

    } catch (error) {
      // Log submission error
      if (logActivity) {
        securityMiddleware.logSecurityEvent({
          type: 'form_submission_error',
          details: `Form submission error: ${error}`,
          severity: 'medium'
        })
      }

      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={className}
      noValidate
    >
      {requireCSRF && (
        <input
          type="hidden"
          name="csrf_token"
          value={csrfToken}
        />
      )}

      {/* Hidden field for bot detection */}
      <input
        type="hidden"
        name="bot_trap"
        value=""
        autoComplete="off"
        tabIndex={-1}
      />

      <div className="space-y-4">
        {children}
      </div>

      {submitAttempts > 2 && (
        <div className="mt-4 p-3 bg-yellow-400/20 border border-yellow-400/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm">
              Multiple submission attempts detected. Please verify you are not a bot.
            </span>
          </div>
        </div>
      )}
    </form>
  )
}

// Password strength indicator component
export function PasswordStrengthIndicator({ password }: { password: string }) {
  const { validatePassword } = securityMiddleware
  const validation = validatePassword(password)
  
  if (!password) return null

  const strength = validation.errors.length === 0 ? 'strong' :
                   validation.errors.length <= 2 ? 'medium' : 'weak'

  const strengthColors = {
    weak: 'bg-red-400',
    medium: 'bg-yellow-400',
    strong: 'bg-green-400'
  }

  const strengthText = {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong'
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-white/60 text-xs">Password Strength</span>
        <span className={`text-xs font-medium ${
          strength === 'strong' ? 'text-green-400' :
          strength === 'medium' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {strengthText[strength]}
        </span>
      </div>
      
      <div className="w-full bg-[#2a2a2a] rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${strengthColors[strength]}`}
          style={{ width: strength === 'strong' ? '100%' : strength === 'medium' ? '60%' : '30%' }}
        />
      </div>
      
      {validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <div key={error} className="flex items-center space-x-2 text-red-400 text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Security badge component
export function SecurityBadge({ 
  verified = false, 
  className = '' 
}: { 
  verified?: boolean
  className?: string 
}) {
  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
      verified 
        ? 'bg-green-400/20 text-green-400 border border-green-400/30' 
        : 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
    } ${className}`}>
      <Shield className="w-3 h-3" />
      <span>{verified ? 'Secure' : 'Verification Required'}</span>
    </div>
  )
}
