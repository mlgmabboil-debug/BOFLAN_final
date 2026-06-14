'use client'

import { useState, useEffect } from 'react'
import { Shield, Lock, Eye, EyeOff, Smartphone, Activity, AlertTriangle, CheckCircle, RefreshCw, Settings } from 'lucide-react'
import { SecurityDashboard } from '../components/SecurityDashboard'
import { SecureForm, PasswordStrengthIndicator, SecurityBadge } from '../components/SecureForm'
import { useSecurity } from '../hooks/useSecurity'
import { AIChat } from '../components/AIChat'

const SECURITY_TABS = [
  { id: 'dashboard', label: 'Обзор', icon: Shield },
  { id: 'authentication', label: 'Авторизация', icon: Lock },
  { id: 'privacy', label: 'Приватность', icon: Eye },
  { id: 'advanced', label: 'Дополнительно', icon: Settings },
] as const

export default function Security() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'authentication' | 'privacy' | 'advanced'>('dashboard')
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)

  // Supabase dynamic integration state
  const [supabaseUrl, setSupabaseUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("boflan_supabase_url") || "https://cqsquukhdztmpruspoqr.supabase.co";
    }
    return "https://cqsquukhdztmpruspoqr.supabase.co";
  })
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("boflan_supabase_anon_key") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxc3F1dWtoZHp0bXBydXNwb3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDIwMzcsImV4cCI6MjA4Nzk3ODAzN30._id-OteAqWSI7WZnr7CjP5w7b6b33rFKdA_edMvX9iM";
    }
    return "";
  })
  const [dbStatus, setDbStatus] = useState<'testing' | 'connected' | 'error'>('testing')
  const [dbErrorMessage, setDbErrorMessage] = useState('')
  const [saveStatus, setSaveStatus] = useState<'' | 'success' | 'reset'>('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { error } = await supabase.from('posts').select('id').limit(1);
        if (error) {
          setDbStatus('error');
          setDbErrorMessage(error.message || `Error ${error.code}`);
        } else {
          setDbStatus('connected');
        }
      } catch (err: any) {
        setDbStatus('error');
        setDbErrorMessage(err.message || 'Error executing test request');
      }
    };
    testConnection();
  }, []);

  const handleSaveSupabase = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("boflan_supabase_url", supabaseUrl.trim());
      localStorage.setItem("boflan_supabase_anon_key", supabaseAnonKey.trim());
      setSaveStatus('success');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    }
  }

  const handleResetSupabase = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("boflan_supabase_url");
      localStorage.removeItem("boflan_supabase_anon_key");
      setSaveStatus('reset');
      setSupabaseUrl("https://cqsquukhdztmpruspoqr.supabase.co");
      setSupabaseAnonKey("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxc3F1dWtoZHp0bXBydXNwb3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDIwMzcsImV4cCI6MjA4Nzk3ODAzN30._id-OteAqWSI7WZnr7CjP5w7b6b33rFKdA_edMvX9iM");
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    }
  }
  
  const { 
    isSecure, 
    threatLevel, 
    validatePassword, 
    enable2FA, 
    updateSecuritySettings 
  } = useSecurity()

  const handlePasswordChange = async (data: any) => {
    console.log('Password change submitted:', data)
    // Handle password change
  }

  const handle2FASetup = async (data: any) => {
    console.log('2FA setup submitted:', data)
    setTwoFactorEnabled(true)
    enable2FA()
  }

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

  const renderAuthentication = () => (
    <div className="space-y-6">
      {/* Password Change */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Изменить пароль</h3>
        
        <SecureForm onSubmit={handlePasswordChange}>
          <div className="space-y-4">
            <input
              name="current_password"
              type={showPassword ? "text" : "password"}
              placeholder="Текущий пароль"
              required
              className="w-full bg-[#111111] border border-[#1e1e1e] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500"
            />
            <input
              name="new_password"
              type={showPassword ? "text" : "password"}
              placeholder="Новый пароль"
              required
              className="w-full bg-[#111111] border border-[#1e1e1e] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500"
            />
            {newPassword && (
              <PasswordStrengthIndicator password={newPassword} />
            )}
            <input
              name="confirm_password"
              type={showPassword ? "text" : "password"}
              placeholder="Подтвердите новый пароль"
              required
              className="w-full bg-[#111111] border border-[#1e1e1e] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/40 hover:text-white text-sm"
              >
                {showPassword ? "Скрыть" : "Показать"} пароли
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-md py-2 font-medium transition-colors"
            >
              Изменить пароль
            </button>
          </div>
        </SecureForm>
      </div>

      {/* Two-Factor Authentication */}
      <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <span className="absolute top-2 right-2 text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30">DEMO</span>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Двухфакторная авторизация</h3>
          <SecurityBadge verified={twoFactorEnabled} />
        </div>
        
        <div className="space-y-4">
          <div className="text-white/60 text-sm">
            Добавьте дополнительный уровень защиты, включив 2FA.
          </div>
          
          {!twoFactorEnabled ? (
            <SecureForm onSubmit={handle2FASetup}>
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 mb-4">
                <div className="text-center">
                  <div className="w-20 h-20 bg-[#00D084] rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Smartphone className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-white font-medium mb-2">Настройка 2FA</div>
                  <div className="text-white/60 text-sm mb-4">
                    Отсканируйте QR-код в приложении аутентификации
                  </div>
                  <div className="w-32 h-32 bg-white rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <span className="text-black text-xs">QR-код</span>
                  </div>
                </div>
              </div>
              
              <input
                name="verification_code"
                type="text"
                placeholder="Введите 6-значный код"
                required
                className="w-full bg-[#111111] border border-[#1e1e1e] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500"
              />
              
              <button
                type="submit"
                className="w-full bg-[#00D084] hover:bg-[#00b876] text-white rounded-md py-2 font-medium transition-colors"
              >
                Включить 2FA
              </button>
            </SecureForm>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-green-400/20 border border-green-400/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-white font-medium">2FA включена</div>
                  <div className="text-white/60 text-sm">Ваш аккаунт защищен 2FA</div>
                </div>
              </div>
              
              <button
                onClick={() => setTwoFactorEnabled(false)}
                className="w-full bg-red-400/20 hover:bg-red-400/30 text-red-400 border border-red-400/30 rounded-md py-2 font-medium transition-colors"
              >
                Отключить 2FA
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Biometric Authentication */}
      <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <span className="absolute top-2 right-2 text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30">DEMO</span>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Биометрическая аутентификация</h3>
          <button
            onClick={() => setBiometricEnabled(!biometricEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              biometricEnabled ? 'bg-blue-600' : 'bg-[#2a2a2a]'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                biometricEnabled ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
        
        <div className="text-white/60 text-sm">
          Используйте отпечаток или распознавание лица для безопасного входа.
        </div>
      </div>
    </div>
  )

  const renderPrivacy = () => (
    <div className="space-y-6">
      {/* Privacy Settings */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Настройки приватности</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Видимость профиля</div>
              <div className="text-white/60 text-xs">Кто может видеть ваш профиль</div>
            </div>
            <select className="bg-[#111111] border border-[#2a2a2a] rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D084]">
              <option>Публичный</option>
              <option>Только друзья</option>
              <option>Приватный</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Показывать онлайн статус</div>
              <div className="text-white/60 text-xs">Другие видят когда вы онлайн</div>
            </div>
            <button className="w-12 h-6 rounded-full bg-[#00D084] transition-colors">
              <div className="w-5 h-5 bg-white rounded-full transition-transform translate-x-6"></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Статус прочтения</div>
              <div className="text-white/60 text-xs">Показывать когда вы прочитали сообщение</div>
            </div>
            <button className="w-12 h-6 rounded-full bg-[#2a2a2a] transition-colors">
              <div className="w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Управление данными</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Сбор данных</div>
              <div className="text-white/60 text-xs">Разрешить сбор данных об использовании</div>
            </div>
            <button className="w-12 h-6 rounded-full bg-[#2a2a2a] transition-colors">
              <div className="w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5"></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Персонализированная реклама</div>
              <div className="text-white/60 text-xs">Показывать персонализированную рекламу</div>
            </div>
            <button className="w-12 h-6 rounded-full bg-[#2a2a2a] transition-colors">
              <div className="w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5"></div>
            </button>
          </div>
          
          <div className="pt-4 border-t border-[#2a2a2a]">
            <button className="w-full bg-red-400/20 hover:bg-red-400/30 text-red-400 border border-red-400/30 rounded-md py-2 font-medium transition-colors">
              Удалить мои данные
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAdvanced = () => (
    <div className="space-y-6">
      {/* Supabase Connection Setup */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex md:items-center justify-between flex-col md:flex-row gap-3 mb-4">
          <div>
            <h3 className="text-white font-medium">Интеграция с базой данных (Supabase)</h3>
            <p className="text-white/60 text-xs mt-1">
              Настройте подключение к своей базе данных для синхронизации постов и профилей участников.
            </p>
          </div>
          <div className="flex items-center">
            {dbStatus === 'testing' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/15 border border-yellow-400/20 text-yellow-400 text-xs font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Проверка связи...
              </span>
            )}
            {dbStatus === 'connected' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-400/15 border border-green-400/20 text-green-400 text-xs font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                Подключено
              </span>
            )}
            {dbStatus === 'error' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-400/15 border border-red-400/20 text-red-400 text-xs font-medium" title={dbErrorMessage}>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                Нет связи (401)
              </span>
            )}
          </div>
        </div>

        {dbStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-400/10 border border-red-400/15 text-red-400 text-xs rounded-md">
            <strong>Ошибка соединения:</strong> {dbErrorMessage}. Пожалуйста, вставьте действительные учетные данные Supabase. Убедитесь, что таблицы и политики RLS в базе данных созданы.
          </div>
        )}

        {saveStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-400/10 border border-green-400/15 text-green-400 text-xs rounded-md">
            Получено! Страница сейчас перезагрузится, чтобы применить новые ключи и запустить полную синхронизацию постов.
          </div>
        )}

        {saveStatus === 'reset' && (
          <div className="mb-4 p-3 bg-yellow-400/10 border border-yellow-400/15 text-yellow-400 text-xs rounded-md">
            Ключи сброшены в положение по умолчанию. Выполняется перезагрузка...
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Supabase URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="Пример: https://cqsquukhdztmpruspoqr.supabase.co"
                className="w-full bg-[#111111] border border-[#1e1e1e] rounded-md px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            
            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Supabase Anon / Public Key
              </label>
              <textarea
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                rows={2}
                placeholder="Вставьте ваш длинный anon key, начинающийся с eyJhbGc..."
                className="w-full bg-[#111111] border border-[#1e1e1e] rounded-md px-3 py-2 text-white placeholder-white/30 text-xs focus:outline-none focus:border-blue-500 font-mono resize-none leading-relaxed"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={handleSaveSupabase}
              disabled={saveStatus !== ''}
              className="flex-1 bg-[#00D084] hover:bg-[#00b876] disabled:opacity-50 text-white font-medium text-sm rounded-md py-2.5 transition-colors"
            >
              Сохранить и Синхронизировать
            </button>
            <button
              onClick={handleResetSupabase}
              disabled={saveStatus !== ''}
              className="px-4 bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#252525] text-white/70 hover:text-white font-medium text-sm rounded-md py-2.5 transition-colors"
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {/* API Security */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">API безопасность</h3>
        
        <div className="space-y-4">
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-white font-medium">API ключ</div>
                <div className="text-white/60 text-sm">Текущий ключ для программного доступа</div>
              </div>
              <button className="text-[#00D084] hover:text-[#00b876] text-sm">
                Сгенерировать новый
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <code className="bg-[#2a2a2a] px-2 py-1 rounded text-white text-sm">
                boflan_••••••••••••••••••••••••••
              </code>
              <button className="text-white/40 hover:text-white text-sm">
                Копировать
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Ограничение API</div>
              <div className="text-white/60 text-xs">Лимит запросов в час</div>
            </div>
            <select className="bg-[#111111] border border-[#2a2a2a] rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D084]">
              <option>100 запросов/час</option>
              <option>500 запросов/час</option>
              <option>1000 запросов/час</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Headers */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Заголовки безопасности</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Content Security Policy</div>
              <div className="text-white/60 text-xs">CSP заголовок для защиты от XSS</div>
            </div>
            <div className="px-3 py-1 rounded-full bg-green-400/20 text-green-400 text-xs">
              Активно
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">HSTS заголовок</div>
              <div className="text-white/60 text-xs">HTTP Strict Transport Security</div>
            </div>
            <div className="px-3 py-1 rounded-full bg-green-400/20 text-green-400 text-xs">
              Активно
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">X-Frame-Options</div>
              <div className="text-white/60 text-xs">Защита от clickjacking</div>
            </div>
            <div className="px-3 py-1 rounded-full bg-green-400/20 text-green-400 text-xs">
              Активно
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Журнал аудита безопасности</h3>
          <button className="text-[#00D084] hover:text-[#00b876] text-sm">
            Экспорт журнала
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#111111] rounded-lg">
            <div>
              <div className="text-white text-sm">Пароль изменен</div>
              <div className="text-white/60 text-xs">2 часа назад • 192.168.1.100</div>
            </div>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#111111] rounded-lg">
            <div>
              <div className="text-white text-sm">2FA включена</div>
              <div className="text-white/60 text-xs">1 день назад • 192.168.1.100</div>
            </div>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#111111] rounded-lg">
            <div>
              <div className="text-white text-sm">Неудачная попытка входа</div>
              <div className="text-white/60 text-xs">3 дня назад • 185.123.456.789</div>
            </div>
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SecurityDashboard />
      case 'authentication':
        return renderAuthentication()
      case 'privacy':
        return renderPrivacy()
      case 'advanced':
        return renderAdvanced()
      default:
        return <SecurityDashboard />
    }
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Настройки</h1>
              <p className="text-white/60 text-sm md:text-base">Управление настройками профиля и безопасности</p>
            </div>
            <div className={`px-3 py-1 rounded-full border ${getThreatLevelColor(threatLevel)}`}>
              <span className="text-sm font-medium capitalize">{threatLevel}</span>
            </div>
          </div>
        </div>

        {/* Security Status */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isSecure ? (
                <Shield className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              )}
              <div>
                <div className="text-white font-medium">
                  {isSecure ? 'Ваш аккаунт в безопасности' : 'Обнаружены проблемы с безопасностью'}
                </div>
                <div className="text-white/60 text-sm">
                  {isSecure 
                    ? 'Все функции безопасности настроены правильно'
                    : 'Проверьте и устраните проблемы безопасности'
                  }
                </div>
              </div>
            </div>
            <button className="p-2 text-white/60 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
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
      
      {/* AI Chat */}
      <AIChat />
    </>
  )
}
