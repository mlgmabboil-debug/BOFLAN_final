'use client'

import { useState, useEffect } from 'react'
import { Menu, X, Search, Bell, User, Home, BarChart2, Zap, Users, MessageCircle, Bot, Shield, Settings } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router'

interface MobileNavigationProps {
  user?: any
  onLogout?: () => void
  notifications?: number
}

export function MobileNavigation({ user, onLogout, notifications = 0 }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', label: 'Главная', icon: Home },
    { path: '/charts', label: 'Рынок', icon: BarChart2 },
    { path: '/dex', label: 'DEX', icon: Zap },
    { path: '/groups', label: 'Группы', icon: Users },
    { path: '/community', label: 'Сообщества', icon: MessageCircle },
    { path: '/profile', label: 'Профиль', icon: User },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/market?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setIsOpen(false)
    }
  }

  const handleNavigate = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  // Close on route change
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const isActive = (path: string) => {
    if (path === '/profile') return location.pathname.startsWith('/profile')
    if (path === '/community') return location.pathname.startsWith('/community')
    return location.pathname === path
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#080808] border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#00D084] to-[#00b876] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-white font-medium">BOFLAN</span>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 text-white/60 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      {isOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/60"
            onClick={() => setIsOpen(false)}
          />
          <nav className="md:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[80vw] bg-[#080808] z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#00D084] to-[#00b876] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">B</span>
                </div>
                <span className="text-white font-medium">BOFLAN</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-[#1a1a1a]">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084]"
                />
              </form>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigate(item.path)}
                      className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm transition-colors mb-1 ${
                        isActive(item.path)
                          ? 'bg-[#00D084] text-white'
                          : 'text-white/60 hover:text-white hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* User Section */}
            <div className="p-4 border-t border-[#1a1a1a]">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00D084] to-[#00b876] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {user?.username ? user.username[0].toUpperCase() : 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {user?.username || 'Пользователь'}
                  </div>
                  <div className="text-white/60 text-sm truncate">
                    {user?.email || 'user@example.com'}
                  </div>
                </div>
              </div>
              
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">Выйти</span>
              </button>
            </div>
          </nav>
        </>
      )}

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080808] border-t border-[#1a1a1a]">
        <div className="grid grid-cols-5 gap-1">
          {[
            { path: '/dashboard', icon: Home, label: 'Главная' },
            { path: '/market', icon: BarChart2, label: 'Рынок' },
            { path: '/charts', icon: BarChart2, label: 'Графики' },
            { path: '/bots', icon: Bot, label: 'Боты' },
            { path: '/profile', icon: User, label: 'Профиль' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                  isActive(item.path)
                    ? 'text-[#00D084]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
