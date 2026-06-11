import { useState, useEffect } from 'react'
import { useNotifications } from '../app/hooks/useNotifications'

const LIKES_KEY = 'boflan_post_likes'
const SAVED_KEY = 'boflan_saved_posts'
const COMMENTS_KEY = 'boflan_post_comments'

export interface Comment {
  id: string
  postId: string
  userId: string
  username: string
  avatar: string
  content: string
  createdAt: number
}

export function usePostInteractions(userId?: string) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<Comment[]>([])
  const { addNotification } = useNotifications(userId, 20000, true)

  // Load data from localStorage
  useEffect(() => {
    try {
      const likesData = localStorage.getItem(LIKES_KEY)
      if (likesData) {
        const parsed = JSON.parse(likesData)
        setLikedPosts(new Set(parsed))
      }

      const savedData = localStorage.getItem(SAVED_KEY)
      if (savedData) {
        const parsed = JSON.parse(savedData)
        setSavedPosts(new Set(parsed))
      }

      const commentsData = localStorage.getItem(COMMENTS_KEY)
      if (commentsData) {
        const parsed = JSON.parse(commentsData)
        setComments(parsed)
      }
    } catch (e) {
      console.error('Error loading interactions:', e)
    }
  }, [])

  // Save likes to localStorage
  const saveLikedPosts = (newLiked: Set<string>) => {
    try {
      localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(newLiked)))
    } catch (e) {
      console.error('Error saving likes:', e)
    }
  }

  // Save saved posts to localStorage
  const saveSavedPosts = (newSaved: Set<string>) => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(newSaved)))
    } catch (e) {
      console.error('Error saving posts:', e)
    }
  }

  // Save comments to localStorage
  const saveComments = (newComments: Comment[]) => {
    try {
      localStorage.setItem(COMMENTS_KEY, JSON.stringify(newComments))
    } catch (e) {
      console.error('Error saving comments:', e)
    }
  }

  const toggleLike = (postId: string, postAuthor?: { id: string; username: string; avatar: string }) => {
    const newLiked = new Set(likedPosts)
    const isLiking = !newLiked.has(postId)
    
    if (isLiking) {
      newLiked.add(postId)
      // Add notification for post author (if different from current user)
      if (postAuthor && userId && postAuthor.id !== userId) {
        addNotification('Ваш пост лайкнул пользователь', 'system')
      }
    } else {
      newLiked.delete(postId)
    }
    
    setLikedPosts(newLiked)
    saveLikedPosts(newLiked)
    return isLiking
  }

  const toggleSave = (postId: string) => {
    const newSaved = new Set(savedPosts)
    if (newSaved.has(postId)) {
      newSaved.delete(postId)
    } else {
      newSaved.add(postId)
    }
    setSavedPosts(newSaved)
    saveSavedPosts(newSaved)
    return newSaved.has(postId)
  }

  const addComment = (postId: string, content: string, user: { id: string; username: string; avatar: string }, postAuthor?: { id: string; username: string; avatar: string }) => {
    const newComment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      postId,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      content,
      createdAt: Date.now()
    }
    const newComments = [...comments, newComment]
    setComments(newComments)
    saveComments(newComments)
    
    // Add notification for post author (if different from commenter)
    if (postAuthor && user.id !== postAuthor.id) {
      addNotification(`${user.username} прокомментировал ваш пост`, 'system')
    }
    
    return newComment
  }

  const getPostComments = (postId: string) => {
    return comments.filter(c => c.postId === postId).sort((a, b) => b.createdAt - a.createdAt)
  }

  const deleteComment = (commentId: string) => {
    const newComments = comments.filter(c => c.id !== commentId)
    setComments(newComments)
    saveComments(newComments)
  }

  return {
    likedPosts,
    savedPosts,
    comments,
    toggleLike,
    toggleSave,
    addComment,
    getPostComments,
    deleteComment,
    isLiked: (postId: string) => likedPosts.has(postId),
    isSaved: (postId: string) => savedPosts.has(postId)
  }
}
