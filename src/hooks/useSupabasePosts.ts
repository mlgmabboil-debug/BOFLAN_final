import { useState, useEffect, useCallback } from "react";
import type { FeedPostShape } from "../app/utils/feedPosts";
import { createServerPost, fetchFeedPosts } from "../app/utils/postsApi";

export function useSupabasePosts() {
  const [posts, setPosts] = useState<FeedPostShape[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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
