import { useState } from "react";
import { Heart, MessageCircle, Repeat2, Bookmark, TrendingUp, TrendingDown, Share2, X } from "lucide-react";
import { MiniChart } from "./MiniChart";
import { VerifiedBadge } from "./VerifiedBadge";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { formatPrice, useMarketPrices, getPrice } from "../hooks/useMarketPrices";
import { sanitizeAvatarUrl } from "../utils/sanitize";
import { usePostInteractions } from "../../hooks/usePostInteractions";
import { useUser } from "../context/UserContext";

interface FeedCardProps {
  post: {
    id: string;
    user: {
      id: string;
      username: string;
      displayName: string;
      avatar: string;
      verified: boolean;
      exchange?: string;
      winRate: number;
      pnl: string;
      pnlPositive: boolean;
    };
    coin: string;
    coinName: string;
    direction: "LONG" | "SHORT";
    target: string;
    timeframe: string;
    text: string;
    chartData: { t: number; p: number }[];
    images: string[];
    currentPrice: string;
    priceChange: string;
    positive: boolean;
    likes: number;
    comments: number;
    reposts: number;
    timeAgo: string;
    accuracy: string;
    liked: boolean;
  };
}

export function FeedCard({ post }: FeedCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const { user } = useUser();
  const { toggleLike, toggleSave, isLiked, isSaved, addComment, getPostComments } = usePostInteractions(user?.id);
  const navigate = useNavigate();
  const { allPrices } = useMarketPrices();
  const live = getPrice(post.coin, allPrices);
  const currentPrice = live ? formatPrice(live.current_price) : post.currentPrice;
  const priceChange = live
    ? `${(live.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}${(live.price_change_percentage_24h ?? 0).toFixed(2)}%`
    : post.priceChange;
  const positive = live ? (live.price_change_percentage_24h ?? 0) >= 0 : post.positive;
  const avatarSrc = sanitizeAvatarUrl(post.user.avatar);

  const likedBySession = isLiked(post.id);
  const liked = likedBySession || post.liked;
  const saved = isSaved(post.id);
  const postComments = getPostComments(post.id);
  const realLikes = post.likes + (likedBySession && !post.liked ? 1 : 0);

  const handleLike = () => {
    toggleLike(post.id, post.user);
  };

  const handleSave = () => {
    toggleSave(post.id);
  };

  const handleComment = () => {
    if (!commentText.trim() || !user) return;
    addComment(post.id, commentText.trim(), {
      id: user.id,
      username: user.username,
      avatar: user.avatar
    }, post.user);
    setCommentText("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass card-hover rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(`/profile/${post.user.username}`)}
            className="relative flex-shrink-0"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-[#2a2a2a]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-xs font-bold text-white/50">
                {post.user.username.charAt(0).toUpperCase()}
              </div>
            )}
            {post.user.verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                <svg viewBox="0 0 12 12" className="w-3 h-3 fill-white">
                  <path d="M10.5 3L5 9 1.5 5.5 2.5 4.5 5 7 9.5 2z" />
                </svg>
              </div>
            )}
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate(`/profile/${post.user.username}`)}
                className="text-white font-medium text-sm hover:underline"
              >
                {post.user.displayName}
              </button>
              {post.user.verified && (
                <VerifiedBadge size="sm" exchange={post.user.exchange} />
              )}
              <span className={`text-xs font-mono font-medium ${post.user.pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
                {post.user.pnl}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-white/40 text-xs">@{post.user.username}</span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-white/40 text-xs">{post.timeAgo}</span>
              {post.accuracy && post.accuracy !== "—" ? (
                <>
                  <span className="text-white/20 text-xs">·</span>
                  <span className="text-white/40 text-xs">{post.accuracy}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Direction badge */}
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 flex-shrink-0 ${
            post.direction === "LONG"
              ? "bg-gradient-to-r from-emerald-500/10 to-emerald-400/5 text-emerald-400 border border-emerald-500/20"
              : "bg-gradient-to-r from-red-500/10 to-red-400/5 text-red-400 border border-red-500/20"
          }`}
        >
          {post.direction === "LONG" ? (
            <TrendingUp size={14} />
          ) : (
            <TrendingDown size={14} />
          )}
          {post.direction}
        </div>
      </div>

      {/* Coin Info */}
      <div className="px-4 pb-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600/20 to-blue-400/10 flex items-center justify-center text-xs font-bold text-blue-400 border border-blue-500/20">
            {post.coin.charAt(0)}
          </div>
          <div>
            <span className="text-white text-sm font-semibold">{post.coin}</span>
            <span className="text-white/40 text-xs ml-1">{post.coinName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-white font-mono text-sm font-medium">{currentPrice}</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${positive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {priceChange}
          </span>
        </div>
      </div>

      {/* Mini chart */}
      <div className="px-4 pb-3 h-20">
        <div className="w-full h-full glass-light rounded-lg p-2">
          <MiniChart symbol={post.coin} height={56} width={600} />
        </div>
      </div>

      {/* Prediction details */}
      <div className="px-4 pb-3 flex gap-2 text-xs flex-wrap">
        <div className="glass-light rounded-lg px-3 py-1.5 flex gap-1.5 items-center">
          <span className="text-white/50">Цель:</span>
          <span className="text-emerald-400 font-mono font-medium">{post.target}</span>
        </div>
        <div className="glass-light rounded-lg px-3 py-1.5 flex gap-1.5 items-center">
          <span className="text-white/50">Срок:</span>
          <span className="text-white/80 font-mono">{post.timeframe}</span>
        </div>
        <div className="glass-light rounded-lg px-3 py-1.5 flex gap-1.5 items-center">
          <span className="text-white/50">Win rate:</span>
          <span className="text-blue-400 font-mono font-medium">{post.user.winRate}%</span>
        </div>
      </div>

      {/* Text */}
      <div className="px-4 pb-3">
        <p className="text-white/80 text-sm leading-relaxed">{post.text}</p>
      </div>

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div className="px-4 pb-3">
          <div className={`grid gap-2 ${
            post.images.length === 1 ? 'grid-cols-1' :
            post.images.length === 2 ? 'grid-cols-2' :
            'grid-cols-2'
          }`}>
            {post.images.map((imageUrl, index) => (
              <img
                key={index}
                src={imageUrl}
                alt={`Post image ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
                onClick={() => window.open(imageUrl, '_blank')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-xs transition-all duration-300 btn-press ${
              liked ? "text-red-400" : "text-white/50 hover:text-red-400"
            }`}
          >
            <Heart size={16} fill={liked ? "currentColor" : "none"} className={liked ? "animate-pulse" : ""} />
            <span className="font-medium">{realLikes.toLocaleString()}</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1.5 text-xs transition-all duration-300 btn-press ${
              showComments ? "text-blue-400" : "text-white/50 hover:text-blue-400"
            }`}
          >
            <MessageCircle size={16} />
            <span className="font-medium">{post.comments + postComments.length}</span>
          </button>
          <button className="relative flex items-center gap-1.5 text-xs text-white/50 hover:text-emerald-400 transition-all duration-300 btn-press">
            <Repeat2 size={16} />
            <span className="font-medium">{post.reposts}</span>
            <span className="absolute -top-1 -right-1 text-[8px] bg-yellow-500/20 text-yellow-400 px-1 py-0.5 rounded border border-yellow-500/30">DEMO</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className={`transition-all duration-300 btn-press ${saved ? "text-yellow-400" : "text-white/50 hover:text-yellow-400"}`}
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          </button>
          <button className="relative text-white/50 hover:text-white transition-all duration-300 btn-press">
            <Share2 size={16} />
            <span className="absolute -top-1 -right-1 text-[8px] bg-yellow-500/20 text-yellow-400 px-1 py-0.5 rounded border border-yellow-500/30">DEMO</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Comment Input */}
              {user && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-xs font-bold text-white/50 flex-shrink-0">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Написать комментарий..."
                      className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50 transition-colors placeholder-white/30"
                    />
                    <button
                      onClick={handleComment}
                      disabled={!commentText.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Отправить
                    </button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              {postComments.length > 0 ? (
                <div className="space-y-3">
                  {postComments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-xs font-bold text-white/50 flex-shrink-0">
                        {comment.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium text-sm">{comment.username}</span>
                          <span className="text-white/30 text-xs">
                            {Math.floor((Date.now() - comment.createdAt) / 60000)} мин. назад
                          </span>
                        </div>
                        <p className="text-white/70 text-sm">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-sm text-center py-4">Комментариев пока нет</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
