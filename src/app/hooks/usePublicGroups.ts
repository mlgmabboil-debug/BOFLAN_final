'use client'

import { useState, useEffect, useCallback } from 'react'
import GroupVisibility, { GroupPost, GroupVisibilitySettings } from '../crypto/groupVisibility'

interface PublicGroupStats {
  groupId: string
  groupName: string
  memberCount: number
  publicPosts: number
  avgWinRate: number
  totalProfit: number
  totalViews: number
  totalJoins: number
  isPublic: boolean
}

export function usePublicGroups() {
  const [publicPosts, setPublicPosts] = useState<GroupPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [groupStats, setGroupStats] = useState<PublicGroupStats[]>([])
  
  const [visibility] = useState(() => GroupVisibility.getInstance())

  // Load public posts
  const loadPublicPosts = useCallback(async (limit: number = 50) => {
    setLoading(true)
    setError(null)
    
    try {
      const posts = await visibility.getPublicDiscoveryPosts(limit)
      setPublicPosts(posts)
    } catch (error) {
      setError('Failed to load public posts')
      console.error('Failed to load public posts:', error)
    } finally {
      setLoading(false)
    }
  }, [visibility])

  // Load notifications
  const loadNotifications = useCallback(() => {
    const notifs = visibility.getPublicNotifications()
    setNotifications(notifs)
  }, [visibility])

  // Create post in group
  const createPost = useCallback(async (
    groupId: string,
    content: string,
    authorId: string
  ): Promise<GroupPost> => {
    try {
      const post = await visibility.createPost(groupId, authorId, content, true)
      
      // Reload posts if this post becomes public immediately
      if (post.isPublic) {
        await loadPublicPosts()
      }
      
      return post
    } catch (error) {
      setError('Failed to create post')
      throw error
    }
  }, [visibility, loadPublicPosts])

  // Update post performance
  const updatePostPerformance = useCallback(async (
    postId: string,
    performance: { winRate: number; profit: number; accuracy: number }
  ): Promise<void> => {
    try {
      await visibility.updatePostPerformance(postId, performance)
      await loadPublicPosts()
    } catch (error) {
      setError('Failed to update post performance')
      throw error
    }
  }, [visibility, loadPublicPosts])

  // Track post view
  const trackPostView = useCallback(async (postId: string, userId?: string): Promise<void> => {
    try {
      await visibility.trackPostView(postId, userId)
      await loadPublicPosts()
    } catch (error) {
      console.error('Failed to track post view:', error)
    }
  }, [visibility, loadPublicPosts])

  // Track join after seeing post
  const trackJoinAfterPost = useCallback(async (postId: string, userId: string): Promise<void> => {
    try {
      await visibility.trackJoinAfterPost(postId, userId)
      await loadPublicPosts()
    } catch (error) {
      console.error('Failed to track join after post:', error)
    }
  }, [visibility, loadPublicPosts])

  // Set group visibility settings
  const setGroupVisibility = useCallback((settings: GroupVisibilitySettings) => {
    visibility.setVisibilitySettings(settings)
  }, [visibility])

  // Get group visibility settings
  const getGroupVisibility = useCallback((groupId: string): GroupVisibilitySettings => {
    return visibility.getVisibilitySettings(groupId)
  }, [visibility])

  // Get posts for specific group
  const getGroupPosts = useCallback(async (
    groupId: string,
    userId?: string,
    isMember: boolean = false
  ): Promise<GroupPost[]> => {
    try {
      return await visibility.getPosts(groupId, userId, isMember)
    } catch (error) {
      setError('Failed to get group posts')
      throw error
    }
  }, [visibility])

  // Get group statistics
  const getGroupStatistics = useCallback((groupId: string): PublicGroupStats => {
    const stats = visibility.getGroupStats(groupId)
    
    return {
      groupId,
      groupName: `Group ${groupId.substring(0, 8)}`,
      memberCount: 0, // Would come from group data
      publicPosts: stats.publicPosts,
      avgWinRate: stats.avgWinRate,
      totalProfit: stats.totalProfit,
      totalViews: stats.totalViews,
      totalJoins: stats.totalJoins,
      isPublic: true
    }
  }, [visibility])

  // Load all public group stats
  const loadAllGroupStats = useCallback(async () => {
    try {
      const allStats: PublicGroupStats[] = []
      
      // Get stats for all groups with public posts
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('public_posts_')) {
          const groupId = key.replace('public_posts_', '')
          const stats = getGroupStatistics(groupId)
          allStats.push(stats)
        }
      }
      
      setGroupStats(allStats)
    } catch (error) {
      console.error('Failed to load group stats:', error)
    }
  }, [getGroupStatistics])

  // Search public posts
  const searchPublicPosts = useCallback(async (query: string): Promise<GroupPost[]> => {
    try {
      const allPosts = await visibility.getPublicDiscoveryPosts(100)
      
      if (!query.trim()) {
        return allPosts
      }
      
      return allPosts.filter(post => 
        post.content.toLowerCase().includes(query.toLowerCase())
      )
    } catch (error) {
      setError('Failed to search posts')
      throw error
    }
  }, [visibility])

  // Filter posts by performance
  const filterPostsByPerformance = useCallback((
    posts: GroupPost[],
    filter: 'all' | 'trending' | 'profitable' | 'recent'
  ): GroupPost[] => {
    switch (filter) {
      case 'trending':
        return [...posts].sort((a, b) => b.viewCount - a.viewCount)
      case 'profitable':
        return [...posts].sort((a, b) => b.performance.profit - a.performance.profit)
      case 'recent':
        return [...posts].sort((a, b) => b.timestamp - a.timestamp)
      default:
        return posts
    }
  }, [])

  // Mark notification as read
  const markNotificationRead = useCallback((notificationId: string) => {
    visibility.markNotificationRead(notificationId)
    loadNotifications()
  }, [visibility, loadNotifications])

  // Mark all notifications as read
  const markAllNotificationsRead = useCallback(() => {
    notifications.forEach(notification => {
      visibility.markNotificationRead(notification.id)
    })
    loadNotifications()
  }, [notifications, visibility, loadNotifications])

  // Get unread count
  const getUnreadCount = useCallback((): number => {
    return notifications.filter(n => !n.read).length
  }, [notifications])

  // Refresh data
  const refresh = useCallback(async () => {
    await loadPublicPosts()
    loadNotifications()
    await loadAllGroupStats()
  }, [loadPublicPosts, loadNotifications, loadAllGroupStats])

  // Initialize on mount
  useEffect(() => {
    loadPublicPosts()
    loadNotifications()
    loadAllGroupStats()
  }, [loadPublicPosts, loadNotifications, loadAllGroupStats])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refresh()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [refresh])

  return {
    // Data
    publicPosts,
    groupStats,
    notifications,
    loading,
    error,
    unreadCount: getUnreadCount(),
    
    // Actions
    loadPublicPosts,
    createPost,
    updatePostPerformance,
    trackPostView,
    trackJoinAfterPost,
    setGroupVisibility,
    getGroupVisibility,
    getGroupPosts,
    getGroupStatistics,
    searchPublicPosts,
    filterPostsByPerformance,
    markNotificationRead,
    markAllNotificationsRead,
    refresh
  }
}
