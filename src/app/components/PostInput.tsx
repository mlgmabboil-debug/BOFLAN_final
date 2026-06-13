import { useState } from "react";
import { useUser } from "../context/UserContext";
import { useSupabasePosts } from "../../hooks/useSupabasePosts";
import { buildFeedPostFromUser, MAX_POST_BODY } from "../utils/feedPosts";
import { useMarketPrices } from "../hooks/useMarketPrices";
import { ImageUpload } from "./ImageUpload";
import { motion } from "motion/react";

interface PostInputProps {
  defaultCoin?: string;
  onPostSuccess?: () => void;
}

export function PostInput({ defaultCoin = "BTC", onPostSuccess }: PostInputProps) {
  const { user } = useUser();
  const [postText, setPostText] = useState("");
  const [postCoin, setPostCoin] = useState(defaultCoin);
  const [postDirection, setPostDirection] = useState<"LONG" | "SHORT">("LONG");
  const [postImages, setPostImages] = useState<string[]>([]);
  const { prices } = useMarketPrices();
  const { createPost } = useSupabasePosts();
  const [publishError, setPublishError] = useState<string | null>(null);

  const publishPost = async () => {
    if (!user || !postText.trim()) return;

    const next = buildFeedPostFromUser(user, postText, postCoin, postDirection, prices);
    next.images = postImages;

    setPublishError(null);
    try {
      await createPost(next, user.id, user.profileSecret);
      setPostText("");
      setPostImages([]);
      if (onPostSuccess) onPostSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось опубликовать пост";
      setPublishError(msg);
      console.error("Error publishing post:", e);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-3">
      {publishError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-300 text-xs">
          {publishError}
        </div>
      )}
      <textarea
        value={postText}
        onChange={(e) => setPostText(e.target.value)}
        placeholder={`Ваше мнение о ${defaultCoin}?`}
        rows={3}
        maxLength={MAX_POST_BODY}
        className="w-full bg-[#161616] border border-[#222222] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#333333] transition-all resize-none"
      />
      
      <ImageUpload 
        images={postImages}
        onImagesChange={setPostImages}
        maxImages={2}
      />
      
      <div className="flex items-center justify-between mt-1">
        <select
          value={postDirection}
          onChange={(e) => setPostDirection(e.target.value as "LONG" | "SHORT")}
          className="bg-[#161616] border border-[#222222] rounded-lg px-3 py-1.5 text-white text-xs outline-none"
        >
          <option value="LONG">Bullish / LONG</option>
          <option value="SHORT">Bearish / SHORT</option>
        </select>
        
        <button
          onClick={publishPost}
          disabled={!postText.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
        >
          Post
        </button>
      </div>
    </div>
  );
}
