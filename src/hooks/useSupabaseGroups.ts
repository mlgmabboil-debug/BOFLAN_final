import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Group = Database['public']['Tables']['groups']['Row']
type GroupInsert = Database['public']['Tables']['groups']['Insert']
type GroupMember = Database['public']['Tables']['group_members']['Row']
type GroupPost = Database['public']['Tables']['group_posts']['Row']

export function useSupabaseGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          owner:user_profiles(username, display_name, avatar_url, verified),
          members:group_members(count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setGroups(data || [])
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Error fetching groups')
      console.error('Error fetching groups:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const createGroup = async (groupData: Omit<GroupInsert, 'id' | 'owner_id'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          ...groupData,
          owner_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      await fetchGroups()
      return data
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Error creating group')
      console.error('Error creating group:', error)
      throw error
    }
  }

  const joinGroup = async (groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id
        })

      if (error) throw error

      await fetchGroups()
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Error joining group')
      console.error('Error joining group:', error)
      throw error
    }
  }

  const leaveGroup = async (groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id)

      if (error) throw error

      await fetchGroups()
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Error leaving group')
      console.error('Error leaving group:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  return {
    groups,
    loading,
    error,
    createGroup,
    joinGroup,
    leaveGroup,
    refetch: fetchGroups
  }
}

export function useGroupPosts(groupId: string) {
  const [posts, setPosts] = useState<GroupPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('group_posts')
        .select(`
          *,
          user:user_profiles(username, display_name, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPosts(data || [])
    } catch (e: any) {
      console.error('Error fetching posts:', e)
    } finally {
      setLoading(false)
    }
  }

  const createPost = async (postData: Omit<Database['public']['Tables']['group_posts']['Insert'], 'id' | 'user_id' | 'group_id'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    try {
      const { error } = await supabase
        .from('group_posts')
        .insert({
          ...postData,
          group_id: groupId,
          user_id: user.id
        })

      if (error) throw error

      await fetchPosts()
    } catch (e: any) {
      console.error('Error creating post:', e)
      throw e
    }
  }

  useEffect(() => {
    if (groupId) {
      fetchPosts()
    }
  }, [groupId])

  return {
    posts,
    loading,
    createPost,
    refetch: fetchPosts
  }
}
