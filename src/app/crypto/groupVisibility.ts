'use client'

import SecureGroupEncryption from './secureEncryption'

export interface GroupVisibilitySettings {
  groupId: string
  privacyMode: 'private' | 'public-after-7days' | 'public'
  visibilityDelay: number // days before becoming public
  allowPreview: boolean // allow non-members to see preview
  requireApproval: boolean // require admin approval to join
}

export interface GroupPost {
  id: string
  groupId: string
  authorId: string
  content: string
  encryptedData: string
  timestamp: number
  isPublic: boolean
  isPreview?: boolean
  publicTimestamp: number // when it becomes public
  viewCount: number
  joinCount: number // how many joined after seeing this post
  performance: {
    winRate: number
    profit: number
    accuracy: number
  }
}

export class GroupVisibility {
  private static instance: GroupVisibility
  private visibilitySettings: Map<string, GroupVisibilitySettings> = new Map()
  private encryption: SecureGroupEncryption

  static getInstance(): GroupVisibility {
    if (!GroupVisibility.instance) {
      GroupVisibility.instance = new GroupVisibility()
    }
    return GroupVisibility.instance
  }

  constructor() {
    this.encryption = SecureGroupEncryption.getInstance()
  }

  // Set group visibility settings
  setVisibilitySettings(settings: GroupVisibilitySettings): void {
    this.visibilitySettings.set(settings.groupId, settings)
    
    // Store settings
    localStorage.setItem(
      `group_visibility_${settings.groupId}`,
      JSON.stringify(settings)
    )
  }

  // Get group visibility settings
  getVisibilitySettings(groupId: string): GroupVisibilitySettings {
    let settings = this.visibilitySettings.get(groupId)
    
    if (!settings) {
      // Load from storage
      const stored = localStorage.getItem(`group_visibility_${groupId}`)
      if (stored) {
        settings = JSON.parse(stored) as GroupVisibilitySettings
        this.visibilitySettings.set(groupId, settings)
      } else {
        // Default settings
        settings = {
          groupId,
          privacyMode: 'public-after-7days',
          visibilityDelay: 7,
          allowPreview: true,
          requireApproval: false
        }
        this.visibilitySettings.set(groupId, settings)
      }
    }
    
    return settings
  }

  // Create post with visibility rules
  async createPost(
    groupId: string,
    authorId: string,
    content: string,
    isEncrypted: boolean = true
  ): Promise<GroupPost> {
    const settings = this.getVisibilitySettings(groupId)
    const now = Date.now()
    
    // Calculate when post becomes public
    const publicTimestamp = now + (settings.visibilityDelay * 24 * 60 * 60 * 1000)
    
    const post: GroupPost = {
      id: this.encryption.generateSecureToken(),
      groupId,
      authorId,
      content,
      encryptedData: isEncrypted ? await this.encryption.encryptGroupContent(content, groupId) : '',
      timestamp: now,
      isPublic: false,
      publicTimestamp,
      viewCount: 0,
      joinCount: 0,
      performance: {
        winRate: 0,
        profit: 0,
        accuracy: 0
      }
    }
    
    // Store post
    await this.storePost(post)
    
    // Schedule public visibility
    this.schedulePublicVisibility(post.id, publicTimestamp)
    
    return post
  }

  // Store post in appropriate storage
  private async storePost(post: GroupPost): Promise<void> {
    const posts = await this.getPosts(post.groupId)
    posts.push(post)
    
    // Store encrypted posts for members
    const encryptedPosts = posts.filter(p => p.encryptedData)
    localStorage.setItem(
      `posts_${post.groupId}`,
      JSON.stringify(encryptedPosts)
    )
    
    // Store public posts separately
    const publicPosts = posts.filter(p => p.isPublic)
    localStorage.setItem(
      `public_posts_${post.groupId}`,
      JSON.stringify(publicPosts)
    )
  }

  // Get posts based on user access
  async getPosts(
    groupId: string,
    userId?: string,
    isMember: boolean = false
  ): Promise<GroupPost[]> {
    const settings = this.getVisibilitySettings(groupId)
    const now = Date.now()
    
    // Get all posts
    const memberPosts = JSON.parse(
      localStorage.getItem(`posts_${groupId}`) || '[]'
    )
    const publicPosts = JSON.parse(
      localStorage.getItem(`public_posts_${groupId}`) || '[]'
    )
    
    // Check which posts should be public now
    const newlyPublicPosts = memberPosts.filter((post: GroupPost) =>
      !post.isPublic && now >= post.publicTimestamp
    )

    // Move newly public posts to public storage
    if (newlyPublicPosts.length > 0) {
      const updatedMemberPosts = memberPosts.filter((post: GroupPost) =>
        !newlyPublicPosts.includes(post)
      )
      const updatedPublicPosts = [...publicPosts, ...newlyPublicPosts.map((post: GroupPost) => ({
        ...post,
        isPublic: true
      }))]
      
      localStorage.setItem(`posts_${groupId}`, JSON.stringify(updatedMemberPosts))
      localStorage.setItem(`public_posts_${groupId}`, JSON.stringify(updatedPublicPosts))
    }
    
    // Return appropriate posts based on user access
    if (isMember) {
      // Members see all posts (encrypted and public)
      return [...memberPosts, ...publicPosts]
    } else {
      // Non-members see only public posts
      const publicPostsList = JSON.parse(
        localStorage.getItem(`public_posts_${groupId}`) || '[]'
      )
      
      if (settings.allowPreview) {
        // Allow preview of some encrypted posts
        const previewPosts = memberPosts
          .filter((post: GroupPost) => now >= post.timestamp + (24 * 60 * 60 * 1000)) // 1 day old
          .slice(0, 3) // Only 3 preview posts
          .map((post: GroupPost) => ({
            ...post,
            content: this.createPreviewContent(post.content),
            isPreview: true as const
          }))
        
        return [...publicPostsList, ...previewPosts]
      }
      
      return publicPostsList
    }
  }

  // Create preview content for non-members
  private createPreviewContent(content: string): string {
    // Show limited preview
    const preview = content.substring(0, 100)
    return preview + (content.length > 100 ? '...' : '')
  }

  // Schedule post to become public
  private schedulePublicVisibility(postId: string, publicTimestamp: number): void {
    const delay = publicTimestamp - Date.now()
    
    if (delay > 0) {
      setTimeout(async () => {
        await this.makePostPublic(postId)
      }, delay)
    }
  }

  // Make post public
  async makePostPublic(postId: string): Promise<void> {
    try {
      // Get post from member storage
      const posts = JSON.parse(localStorage.getItem(`posts_*`) || '[]')
      const post = posts.find((p: GroupPost) => p.id === postId)
      
      if (post) {
        // Update post to public
        post.isPublic = true
        
        // Move to public storage
        const publicPosts = JSON.parse(
          localStorage.getItem(`public_posts_${post.groupId}`) || '[]'
        )
        publicPosts.push(post)
        
        // Remove from member storage
        const updatedMemberPosts = posts.filter((p: GroupPost) => p.id !== postId)
        
        localStorage.setItem(`posts_${post.groupId}`, JSON.stringify(updatedMemberPosts))
        localStorage.setItem(`public_posts_${post.groupId}`, JSON.stringify(publicPosts))
        
        console.log(`📢 Post ${postId} is now public`)
        
        // Notify about public post
        this.notifyPublicPost(post)
      }
    } catch (error) {
      console.error('Failed to make post public:', error)
    }
  }

  // Update post performance metrics
  async updatePostPerformance(
    postId: string,
    performance: { winRate: number; profit: number; accuracy: number }
  ): Promise<void> {
    try {
      // Get post from both storages
      const memberPosts = JSON.parse(localStorage.getItem(`posts_*`) || '[]')
      const publicPosts = JSON.parse(localStorage.getItem(`public_posts_*`) || '[]')
      
      const allPosts = [...memberPosts, ...publicPosts]
      const post = allPosts.find((p: GroupPost) => p.id === postId)
      
      if (post) {
        post.performance = {
          winRate: (post.performance.winRate + performance.winRate) / 2,
          profit: post.performance.profit + performance.profit,
          accuracy: (post.performance.accuracy + performance.accuracy) / 2
        }
        
        // Update in appropriate storage
        if (post.isPublic) {
          const updatedPublicPosts = publicPosts.map((p: GroupPost) => 
            p.id === postId ? post : p
          )
          localStorage.setItem(`public_posts_${post.groupId}`, JSON.stringify(updatedPublicPosts))
        } else {
          const updatedMemberPosts = memberPosts.map((p: GroupPost) => 
            p.id === postId ? post : p
          )
          localStorage.setItem(`posts_${post.groupId}`, JSON.stringify(updatedMemberPosts))
        }
      }
    } catch (error) {
      console.error('Failed to update post performance:', error)
    }
  }

  // Track post views
  async trackPostView(postId: string, userId?: string): Promise<void> {
    try {
      const posts = JSON.parse(localStorage.getItem(`public_posts_*`) || '[]')
      const post = posts.find((p: GroupPost) => p.id === postId)
      
      if (post) {
        post.viewCount++
        
        // Update in storage
        const updatedPosts = posts.map((p: GroupPost) => 
          p.id === postId ? post : p
        )
        localStorage.setItem(`public_posts_${post.groupId}`, JSON.stringify(updatedPosts))
        
        // Log view event
        this.logPostEvent(postId, 'view', userId)
      }
    } catch (error) {
      console.error('Failed to track post view:', error)
    }
  }

  // Track joins after seeing post
  async trackJoinAfterPost(postId: string, userId: string): Promise<void> {
    try {
      const posts = JSON.parse(localStorage.getItem(`public_posts_*`) || '[]')
      const post = posts.find((p: GroupPost) => p.id === postId)
      
      if (post) {
        post.joinCount++
        
        // Update in storage
        const updatedPosts = posts.map((p: GroupPost) => 
          p.id === postId ? post : p
        )
        localStorage.setItem(`public_posts_${post.groupId}`, JSON.stringify(updatedPosts))
        
        // Log join event
        this.logPostEvent(postId, 'join', userId)
      }
    } catch (error) {
      console.error('Failed to track join after post:', error)
    }
  }

  // Get public posts for discovery
  async getPublicDiscoveryPosts(limit: number = 20): Promise<GroupPost[]> {
    const allPublicPosts: GroupPost[] = []
    
    // Get all public posts from all groups
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('public_posts_')) {
        const posts = JSON.parse(localStorage.getItem(key) || '[]')
        allPublicPosts.push(...posts)
      }
    }
    
    // Sort by performance and recency
    const sortedPosts = allPublicPosts.sort((a, b) => {
      // Prioritize high performance posts
      const scoreA = a.performance.winRate * 0.5 + (a.viewCount / 100) * 0.3 + (a.joinCount * 10) * 0.2
      const scoreB = b.performance.winRate * 0.5 + (b.viewCount / 100) * 0.3 + (b.joinCount * 10) * 0.2
      
      return scoreB - scoreA
    })
    
    return sortedPosts.slice(0, limit)
  }

  // Get group statistics
  getGroupStats(groupId: string): {
    totalPosts: number
    publicPosts: number
    avgWinRate: number
    totalProfit: number
    totalViews: number
    totalJoins: number
  } {
    const memberPosts = JSON.parse(localStorage.getItem(`posts_${groupId}`) || '[]')
    const publicPosts = JSON.parse(localStorage.getItem(`public_posts_${groupId}`) || '[]')
    
    const allPosts = [...memberPosts, ...publicPosts]
    
    const totalPosts = allPosts.length
    const publicPostsCount = publicPosts.length
    
    const avgWinRate = allPosts.length > 0 
      ? allPosts.reduce((sum, post) => sum + post.performance.winRate, 0) / allPosts.length
      : 0
    
    const totalProfit = allPosts.reduce((sum, post) => sum + post.performance.profit, 0)
    const totalViews = allPosts.reduce((sum, post) => sum + post.viewCount, 0)
    const totalJoins = allPosts.reduce((sum, post) => sum + post.joinCount, 0)
    
    return {
      totalPosts,
      publicPosts: publicPostsCount,
      avgWinRate,
      totalProfit,
      totalViews,
      totalJoins
    }
  }

  // Notify about public post
  private notifyPublicPost(post: GroupPost): void {
    // In a real app, this would send notifications
    console.log(`📢 New public post in group ${post.groupId}`)
    
    // Store notification
    const notifications = JSON.parse(localStorage.getItem('public_post_notifications') || '[]')
    notifications.push({
      id: this.encryption.generateSecureToken(),
      type: 'public_post',
      postId: post.id,
      groupId: post.groupId,
      timestamp: Date.now(),
      read: false
    })
    
    // Keep only last 50 notifications
    if (notifications.length > 50) {
      notifications.splice(0, notifications.length - 50)
    }
    
    localStorage.setItem('public_post_notifications', JSON.stringify(notifications))
  }

  // Log post events
  private logPostEvent(postId: string, eventType: string, userId?: string): void {
    const event = {
      postId,
      eventType,
      userId: userId || 'anonymous',
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    }
    
    const events = JSON.parse(localStorage.getItem('post_events') || '[]')
    events.push(event)
    
    // Keep only last 1000 events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000)
    }
    
    localStorage.setItem('post_events', JSON.stringify(events))
  }

  // Get public post notifications
  getPublicNotifications(): any[] {
    return JSON.parse(localStorage.getItem('public_post_notifications') || '[]')
  }

  // Mark notification as read
  markNotificationRead(notificationId: string): void {
    const notifications = JSON.parse(localStorage.getItem('public_post_notifications') || '[]')
    const notification = notifications.find((n: any) => n.id === notificationId)
    
    if (notification) {
      notification.read = true
      localStorage.setItem('public_post_notifications', JSON.stringify(notifications))
    }
  }
}

export default GroupVisibility
