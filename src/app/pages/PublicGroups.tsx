'use client'

import { useState } from 'react'
import { Eye, TrendingUp, Star, Search, Filter, Bell, Users, BarChart3, Clock, ArrowRight } from 'lucide-react'
import { PublicGroupPosts } from '../components/PublicGroupPosts'
import { usePublicGroups } from '../hooks/usePublicGroups'

const FILTER_OPTIONS = [
  { id: 'all', label: 'Все посты', icon: Eye },
  { id: 'trending', label: 'Популярное', icon: TrendingUp },
  { id: 'profitable', label: 'Прибыльное', icon: Star },
  { id: 'recent', label: 'Недавнее', icon: Clock },
] as const

export default function PublicGroups() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'trending' | 'profitable' | 'recent'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  
  const {
    publicPosts,
    groupStats,
    notifications,
    loading,
    error,
    unreadCount,
    createPost,
    trackPostView,
    trackJoinAfterPost,
    markAllNotificationsRead,
    refresh
  } = usePublicGroups()

  const handleJoinGroup = async (groupId: string) => {
    try {
      // In a real app, this would handle the join process
      console.log(`Joining group: ${groupId}`)
      
      // Track that user joined after seeing a post
      // This would be triggered after successful join
      const posts = publicPosts.filter(post => post.groupId === groupId)
      if (posts.length > 0) {
        await trackJoinAfterPost(posts[0].id, 'current_user_id')
      }
    } catch (error) {
      console.error('Failed to join group:', error)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    // Search functionality would be handled here
  }

  const getFilteredPosts = () => {
    let filtered = publicPosts
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(post => 
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Apply performance filter
    switch (activeFilter) {
      case 'trending':
        return [...filtered].sort((a, b) => b.viewCount - a.viewCount)
      case 'profitable':
        return [...filtered].sort((a, b) => b.performance.profit - a.performance.profit)
      case 'recent':
        return [...filtered].sort((a, b) => b.timestamp - a.timestamp)
      default:
        return filtered
    }
  }

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  const getTopGroups = () => {
    return groupStats
      .sort((a, b) => b.totalJoins - a.totalJoins)
      .slice(0, 5)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2 flex items-center space-x-2">
                <Eye className="w-6 h-6 text-blue-400" />
                <span>Публичные сигналы групп</span>
              </h1>
              <p className="text-white/60 text-sm md:text-base">
                Находите высокоэффективные торговые сигналы из приватных групп
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-white/60 hover:text-white transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-[#111111] border border-[#2a2a2a] rounded-lg shadow-xl z-50">
                    <div className="p-4 border-b border-[#1a1a1a]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium">Уведомления</h3>
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Отметить все прочитанным
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-white/60">
                          Нет уведомлений
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div key={notification.id} className="p-3 border-b border-[#1a1a1a] last:border-b-0">
                            <div className="flex items-center justify-between">
                              <span className="text-white text-sm">
                                Доступен новый публичный пост
                              </span>
                              <span className="text-white/60 text-xs">
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Refresh */}
              <button
                onClick={refresh}
                disabled={loading}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                <ArrowRight className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Поиск торговых сигналов..."
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#00D084]"
              />
            </div>
            
            {/* Filters */}
            <div className="flex space-x-2">
              {FILTER_OPTIONS.map((filter) => {
                const Icon = filter.icon
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id as any)}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                      activeFilter === filter.id
                        ? 'bg-[#00D084] text-white'
                        : 'bg-[#2a2a2a] text-white/60 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{filter.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="text-white/60 text-sm">Всего постов</span>
            </div>
            <div className="text-2xl font-bold text-white">{publicPosts.length}</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-white/60 text-sm">Всего групп</span>
            </div>
            <div className="text-2xl font-bold text-white">{groupStats.length}</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span className="text-white/60 text-sm">Всего просмотров</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {publicPosts.reduce((sum, post) => sum + post.viewCount, 0)}
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-white/60 text-sm">Ср. винрейт</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {publicPosts.length > 0 
                ? (publicPosts.reduce((sum, post) => sum + post.performance.winRate, 0) / publicPosts.length).toFixed(1)
                : '0'
              }%
            </div>
          </div>
        </div>

        {/* Top Groups */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-6">
          <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            <span>Топ групп</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getTopGroups().map((group, index) => (
              <div key={group.groupId} className="bg-[#111111] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">{group.groupName}</h4>
                  <div className="text-green-400 text-sm font-medium">
                    {group.avgWinRate.toFixed(1)}% WR
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/60 text-sm">Посты</span>
                    <span className="text-white text-sm">{group.publicPosts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60 text-sm">Присоединений</span>
                    <span className="text-white text-sm">{group.totalJoins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60 text-sm">Профит</span>
                    <span className={`text-sm font-medium ${
                      group.totalProfit > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {group.totalProfit > 0 ? '+' : ''}{group.totalProfit.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleJoinGroup(group.groupId)}
                  className="w-full mt-3 bg-[#00D084] hover:bg-[#00b876] text-white px-3 py-2 rounded text-sm transition-colors"
                >
                  Присоединиться
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-400/20 border border-red-400/30 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-red-400">⚠️ {error}</span>
            </div>
          </div>
        )}

        {/* Public Posts */}
        <PublicGroupPosts 
          onJoinGroup={handleJoinGroup}
          className="mb-6"
        />

        {/* Info Section */}
        <div className="bg-blue-400/20 border border-blue-400/30 rounded-lg p-6">
          <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
            <Eye className="w-5 h-5 text-blue-400" />
            <span>Как работают публичные сигналы</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-medium mb-3">Для трейдеров</h4>
              <ul className="space-y-2 text-white/80 text-sm">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Оценивайте качество сигналов перед присоединением</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Смотрите реальные показатели эффективности</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Отслеживайте винрейт и профит</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Присоединяйтесь только к успешным группам</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-3">Для владельцев групп</h4>
              <ul className="space-y-2 text-white/80 text-sm">
                <li className="flex items-start space-x-2">
                  <span className="text-green-400">•</span>
                  <span>Посты становятся публичными через 7 дней</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-400">•</span>
                  <span>Привлекайте новых качественных участников</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-400">•</span>
                  <span>Стройте репутацию и доверие</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-400">•</span>
                  <span>Управляйте настройками видимости</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
