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
      let { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          owner:user_profiles(username, display_name, avatar_url, verified),
          members:group_members(count)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
          console.warn("Foreign relationship select failed in fetchGroups, querying separately...");
          const { data: groupsOnly, error: groupsError } = await supabase
            .from('groups')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (groupsError) throw groupsError;
          
          if (groupsOnly) {
            const ownerIds = Array.from(new Set(groupsOnly.map((g: any) => g.owner_id).filter(Boolean)));
            let ownersMap = new Map();
            if (ownerIds.length > 0) {
              const { data: profiles, error: profilesError } = await supabase
                .from('user_profiles')
                .select('user_id, username, display_name, avatar_url, verified')
                .in('user_id', ownerIds);
              if (!profilesError && profiles) {
                ownersMap = new Map(profiles.map((p: any) => [p.user_id, p]));
              }
            }
            
            const { data: members, error: membersError } = await supabase
              .from('group_members')
              .select('group_id');
              
            const countsMap = new Map();
            if (!membersError && members) {
              for (const m of members) {
                countsMap.set(m.group_id, (countsMap.get(m.group_id) || 0) + 1);
              }
            }
            
            data = groupsOnly.map((g: any) => ({
              ...g,
              owner: ownersMap.get(g.owner_id) || null,
              members: [{ count: countsMap.get(g.id) || 0 }]
            })) as any;
          }
        } else {
          throw error;
        }
      }

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
      let { data, error } = await supabase
        .from('group_posts')
        .select(`
          *,
          user:user_profiles(username, display_name, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
          console.warn("Foreign relationship select failed in useGroupPosts, querying separately...");
          const { data: postsOnly, error: postsError } = await supabase
            .from('group_posts')
            .select('*')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false });
            
          if (postsError) throw postsError;
          
          if (postsOnly) {
            const userIds = Array.from(new Set(postsOnly.map((p: any) => p.user_id).filter(Boolean)));
            let userMap = new Map();
            if (userIds.length > 0) {
              const { data: profiles, error: profilesError } = await supabase
                .from('user_profiles')
                .select('user_id, username, display_name, avatar_url')
                .in('user_id', userIds);
              if (!profilesError && profiles) {
                  userMap = new Map(profiles.map((p: any) => [p.user_id, p]));
              }
            }
            data = postsOnly.map((p: any) => ({
              ...p,
              user: userMap.get(p.user_id) || null
            })) as any;
          }
        } else {
          throw error;
        }
      }

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
