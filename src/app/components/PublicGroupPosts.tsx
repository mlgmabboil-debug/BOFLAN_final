'use client'

import { useState, useEffect } from 'react'
import { Eye, Users, TrendingUp, Clock, Star, MessageCircle, ArrowRight, Filter, Search } from 'lucide-react'
import GroupVisibility, { GroupPost } from '../crypto/groupVisibility'

interface PublicGroupPostsProps {
  className?: string
  onJoinGroup?: (groupId: string) => void
}

export function PublicGroupPosts({ className = '', onJoinGroup }: PublicGroupPostsProps) {
  const [posts, setPosts] = useState<GroupPost[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'trending' | 'profitable'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  
  const visibility = GroupVisibility.getInstance()

  useEffect(() => {
    loadPublicPosts()
    loadNotifications()
  }, [])

  const loadPublicPosts = async () => {
    setLoading(true)
    try {
      const publicPosts = await visibility.getPublicDiscoveryPosts(50)
      
      // Apply filter
      let filteredPosts = publicPosts
      switch (filter) {
        case 'trending':
          filteredPosts = publicPosts.sort((a, b) => b.viewCount - a.viewCount)
          break
        case 'profitable':
          filteredPosts = publicPosts.sort((a, b) => b.performance.profit - a.performance.profit)
          break
      }
      
      // Apply search
      if (searchQuery) {
        filteredPosts = filteredPosts.filter(post => 
          post.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      setPosts(filteredPosts)
    } catch (error) {
      console.error('Failed to load public posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNotifications = () => {
    const notifs = visibility.getPublicNotifications()
    setNotifications(notifs)
  }

  const handleJoinGroup = (groupId: string) => {
    if (onJoinGroup) {
      onJoinGroup(groupId)
    }
  }

  const handleViewPost = async (postId: string) => {
    await visibility.trackPostView(postId)
    // Update posts to reflect new view count
    loadPublicPosts()
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

  const formatPerformance = (performance: any): string => {
    return `${performance.winRate.toFixed(1)}% WR • ${performance.profit > 0 ? '+' : ''}${performance.profit.toFixed(2)}%`
  }

  const getPerformanceColor = (winRate: number): string => {
    if (winRate >= 70) return 'text-green-400'
    if (winRate >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getProfitColor = (profit: number): string => {
    if (profit > 0) return 'text-green-400'
    if (profit === 0) return 'text-white/60'
    return 'text-red-400'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Eye className="w-6 h-6 text-blue-400" />
            <span>Public Group Signals</span>
          </h2>
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 bg-blue-400/20 text-blue-400 rounded-full text-sm">
              {posts.length} Posts
            </div>
            {notifications.filter(n => !n.read).length > 0 && (
              <div className="px-3 py-1 bg-red-400/20 text-red-400 rounded-full text-sm">
                {notifications.filter(n => !n.read).length} New
              </div>
            )}
          </div>
        </div>
        
        <p className="text-white/60 text-sm mb-4">
          Discover trading signals from private groups. Posts become public after 7 days to help you evaluate performance before joining.
        </p>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search signals..."
              className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#00D084]"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' 
                  ? 'bg-[#00D084] text-white' 
                  : 'bg-[#2a2a2a] text-white/60 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('trending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'trending' 
                  ? 'bg-[#00D084] text-white' 
                  : 'bg-[#2a2a2a] text-white/60 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFilter('profitable')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'profitable' 
                  ? 'bg-[#00D084] text-white' 
                  : 'bg-[#2a2a2a] text-white/60 hover:text-white'
              }`}
            >
              <Star className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.filter(n => !n.read).length > 0 && (
        <div className="bg-blue-400/20 border border-blue-400/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">New Public Posts</h3>
            <button
              onClick={() => {
                notifications.forEach(n => visibility.markNotificationRead(n.id))
                loadNotifications()
              }}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Mark all read
            </button>
          </div>
          <div className="space-y-2">
            {notifications.filter(n => !n.read).slice(0, 3).map((notification) => (
              <div key={notification.id} className="bg-[#111111] rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">New public post available</span>
                  <span className="text-white/60 text-xs">
                    {formatTimeAgo(notification.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#00D084] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00D084]/50 transition-colors">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#00D084] to-[#00b876] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {post.authorId.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">
                      Signal #{post.id.substring(0, 8)}
                    </div>
                    <div className="text-white/60 text-xs">
                      {formatTimeAgo(post.timestamp)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 text-xs">{post.viewCount}</span>
                </div>
              </div>
              
              {/* Content */}
              <div className="mb-3">
                <p className="text-white text-sm leading-relaxed">
                  {post.content}
                </p>
                {post.isPreview && (
                  <div className="mt-2 text-blue-400 text-xs">
                    Preview - Join group to see full content
                  </div>
                )}
              </div>
              
              {/* Performance */}
              <div className="bg-[#111111] rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Performance</span>
                  <span className={`text-sm font-medium ${getPerformanceColor(post.performance.winRate)}`}>
                    {formatPerformance(post.performance)}
                  </span>
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <div className="text-white text-sm font-medium">{post.viewCount}</div>
                  <div className="text-white/60 text-xs">Views</div>
                </div>
                <div className="text-center">
                  <div className="text-white text-sm font-medium">{post.joinCount}</div>
                  <div className="text-white/60 text-xs">Joins</div>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-medium ${getProfitColor(post.performance.profit)}`}>
                    {post.performance.profit > 0 ? '+' : ''}{post.performance.profit.toFixed(1)}%
                  </div>
                  <div className="text-white/60 text-xs">Profit</div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewPost(post.id)}
                  className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-3 py-2 rounded text-sm transition-colors flex items-center justify-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>View Details</span>
                </button>
                
                <button
                  onClick={() => handleJoinGroup(post.groupId)}
                  className="flex-1 bg-[#00D084] hover:bg-[#00b876] text-white px-3 py-2 rounded text-sm transition-colors flex items-center justify-center space-x-1"
                >
                  <Users className="w-3 h-3" />
                  <span>Join Group</span>
                </button>
              </div>
              
              {/* Public Badge */}
              {post.isPublic && (
                <div className="mt-3 flex items-center justify-center">
                  <div className="px-2 py-1 bg-green-400/20 text-green-400 rounded text-xs">
                    <Eye className="w-3 h-3 inline mr-1" />
                    Public - Available to everyone
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <div className="text-center py-12">
          <Eye className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">No Public Posts Yet</h3>
          <p className="text-white/60 text-sm">
            Posts from private groups will appear here after 7 days
          </p>
        </div>
      )}
      
      {/* Info Box */}
      <div className="bg-blue-400/20 border border-blue-400/30 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Eye className="w-4 h-4 text-blue-400 mt-0.5" />
          <div className="text-blue-400 text-sm">
            <p className="font-medium mb-1">How Public Posts Work:</p>
            <ul className="space-y-1 text-xs">
              <li>• Posts in private groups become public after 7 days</li>
              <li>• Non-members can view public posts to evaluate signal quality</li>
              <li>• Performance metrics show actual trading results</li>
              <li>• Join groups that consistently perform well</li>
              <li>• All posts are encrypted and secure</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
