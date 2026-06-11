'use client'

import { Suspense, lazy, memo, useMemo, useCallback, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router'
import { usePerformance } from '../hooks/usePerformance'
import { PerformancePanel } from './PerformancePanel'
import { useUser } from '../context/UserContext'

// Lazy load components
const Ticker = lazy(() => import('./Ticker').then(module => ({ default: module.Ticker })))
const BoflanMark = lazy(() => import('./BoflanMark').then(module => ({ default: module.BoflanMark })))

// Memoized navigation item
const NavItem = memo(function NavItem({ 
  item, 
  isActive, 
  onClick 
}: { 
  item: any
  isActive: boolean
  onClick: () => void 
}) {
  const Icon = item.icon
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-[#00D084] text-white shadow-lg shadow-[#00D084]/25'
          : 'text-white/60 hover:text-white hover:bg-[#2a2a2a]'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{item.label}</span>
    </button>
  )
})

// Memoized user profile
const UserProfile = memo(function UserProfile({ user, onLogout }: { 
  user: any
  onLogout: () => void 
}) {
  const handleLogout = useCallback(() => {
    onLogout()
  }, [onLogout])

  return (
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-gradient-to-br from-[#00D084] to-[#00b876] rounded-full flex items-center justify-center">
        <span className="text-white font-bold">
          {user.username ? user.username[0].toUpperCase() : 'U'}
        </span>
      </div>
      <div className="hidden sm:block">
        <div className="text-white font-medium">{user.username || 'User'}</div>
        <div className="text-white/60 text-sm">{user.email || 'user@example.com'}</div>
      </div>
      <button
        onClick={handleLogout}
        className="p-2 text-white/60 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  )
})

// Memoized notifications
const Notifications = memo(function Notifications({ notifications, onClear }: {
  notifications: any[]
  onClear: () => void
}) {
  const NOTIF_ICONS = useMemo(() => ({
    trade: '📈',
    follow: '👥',
    group: '💬',
    price: '💰',
    system: '🔔'
  }), [])

  return (
    <div className="relative">
      <button className="p-2 text-white/60 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 text-white text-xs rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>
    </div>
  )
})

function navItemActive(pathname: string, itemPath: string): boolean {
  if (itemPath === "/profile") return pathname.startsWith("/profile")
  if (itemPath === "/community") return pathname.startsWith("/community")
  return pathname === itemPath
}

const NAV_ITEMS = [
  { path: "/dashboard", label: "Лента", icon: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1H2M5 10a1 1 0 011-1h3a1 1 0 011 1v3M5 10v3a1 1 0 001 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1H2" />
    </svg>
  )},
  { path: "/charts", label: "Рынок", icon: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )},
  { path: "/dex", label: "DEX", icon: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )},
  { path: "/groups", label: "Группы", icon: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )},
  { path: "/community", label: "Сообщества", icon: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )},
  { path: "/profile", label: "Профиль", icon: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )},
]

export default function OptimizedLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useUser()
  const { prefetch, cache, getCached } = usePerformance()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  // Memoize navigation items with active state
  const navItems = useMemo(() => 
    NAV_ITEMS.map(item => ({
      ...item,
      isActive: navItemActive(location.pathname, item.path)
    })),
    [location.pathname]
  )

  // Prefetch routes on hover
  const handleNavHover = useCallback((path: string) => {
    prefetch(path)
  }, [prefetch])

  // Optimized navigation handler
  const handleNavigate = useCallback((path: string) => {
    navigate(path)
    setMobileMenuOpen(false)
  }, [navigate])

  // Optimized logout handler
  const handleLogout = useCallback(() => {
    logout()
    navigate('/')
  }, [logout, navigate])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#111111] border-r border-[#1e1e1e]">
        <div className="p-4 border-b border-[#1e1e1e]">
          <Suspense fallback={<div className="w-8 h-8 bg-[#2a2a2a] rounded-lg animate-pulse" />}>
            <BoflanMark />
          </Suspense>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <NavItem
              key={item.path}
              item={item}
              isActive={item.isActive}
              onClick={() => handleNavigate(item.path)}
            />
          ))}
        </nav>
        
        <div className="p-4 border-t border-[#1e1e1e]">
          <UserProfile user={user} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-[#111111] border-b border-[#1e1e1e] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white/60 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Suspense fallback={<div className="w-8 h-8 bg-[#2a2a2a] rounded-lg animate-pulse" />}>
              <BoflanMark />
            </Suspense>
          </div>
          
          <div className="flex items-center space-x-2">
            <Notifications notifications={notifications} onClear={() => setNotifications([])} />
            <UserProfile user={user} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-[#111111] w-64 h-full p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-medium">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-white/60 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <nav className="space-y-2">
              {navItems.map(item => (
                <NavItem
                  key={item.path}
                  item={item}
                  isActive={item.isActive}
                  onClick={() => handleNavigate(item.path)}
                />
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between bg-[#111111] border-b border-[#1e1e1e] px-6 py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">
              {navItems.find(item => item.isActive)?.label || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Notifications notifications={notifications} onClear={() => setNotifications([])} />
            <UserProfile user={user} onLogout={handleLogout} />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto relative z-0">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-[#00D084] border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </div>

        {/* Ticker */}
        <div className="bg-[#111111] border-t border-[#1e1e1e]">
          <Suspense fallback={<div className="h-16 bg-[#1a1a1a] animate-pulse" />}>
            <Ticker />
          </Suspense>
        </div>
      </main>

      {/* Performance Panel */}
      <PerformancePanel />
    </div>
  )
}
