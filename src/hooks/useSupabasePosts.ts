import { useState, useEffect, useCallback } from "react";
import type { FeedPostShape } from "../app/utils/feedPosts";
import { createServerPost, fetchFeedPosts, syncLocalPostsToSupabase } from "../app/utils/postsApi";
import { useUser } from "../app/context/UserContext";

export function useSupabasePosts() {
  const { user } = useUser();
  const [posts, setPosts] = useState<FeedPostShape[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (user) {
        await syncLocalPostsToSupabase(user);
      }
      const list = await fetchFeedPosts();
      setPosts(list);
      if (list.length === 0) {
        setError(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки постов");
    } finally {
      setLoading(false);
    }
  }, []);

  const createPost = async (
    post: Omit<FeedPostShape, "id" | "timeAgo" | "liked">,
    userId: string,
    profileSecret?: string
  ) => {
    const created = await createServerPost(post, userId, profileSecret);
    setPosts((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
    return created;
  };

  useEffect(() => {
    loadPosts();
    const interval = setInterval(loadPosts, 60_000);
    return () => clearInterval(interval);
  }, [loadPosts]);

  return {
    posts,
    loading,
    error,
    loadPosts,
    createPost,
  };
}
