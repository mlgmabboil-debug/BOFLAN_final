import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Megaphone, MessageCircle, Send, Ban, Lock, LockOpen, Trash2, MoreVertical,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { sanitizePlainText, sanitizeAvatarUrl, sanitizeUsername } from "../utils/sanitize";

const MAX_CHANNEL_POST_LEN = 4000;
const MAX_CHANNEL_COMMENT_LEN = 1000;
const MAX_CHANNEL_POSTS = 150;
const MAX_BANS = 200;

function isSafeGroupId(id: string) {
  return /^[a-z0-9_-]{1,64}$/i.test(id);
}

export type ChannelComment = {
  id: string;
  userId: string;
  username: string;
  text: string;
  ts: number;
};

export type ChannelPost = {
  id: string;
  authorId: string;
  username: string;
  avatar?: string;
  text: string;
  ts: number;
  comments: ChannelComment[];
  commentsLocked?: boolean;
};

type ChannelStore = {
  posts: ChannelPost[];
  globalCommentsDisabled: boolean;
  bannedUserIds: string[];
};

function storageKey(groupId: string) {
  return `boflan_channel_${groupId}`;
}

function loadStore(groupId: string): ChannelStore {
  const empty: ChannelStore = { posts: [], globalCommentsDisabled: false, bannedUserIds: [] };
  if (!isSafeGroupId(groupId)) return empty;
  try {
    const raw = localStorage.getItem(storageKey(groupId));
    if (!raw) return empty;
    const j = JSON.parse(raw) as ChannelStore;
    const bannedUserIds = (Array.isArray(j.bannedUserIds) ? j.bannedUserIds : [])
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.replace(/[^\w-]/g, "").slice(0, 80))
      .slice(0, MAX_BANS);
    const postsRaw = Array.isArray(j.posts) ? j.posts.slice(0, MAX_CHANNEL_POSTS) : [];
    const posts: ChannelPost[] = postsRaw
      .map((p: unknown): ChannelPost | null => {
        if (!p || typeof p !== "object") return null;
        const o = p as Record<string, unknown>;
        const id = typeof o.id === "string" ? o.id.replace(/[^\w-]/g, "").slice(0, 80) : "";
        const text = sanitizePlainText(o.text, MAX_CHANNEL_POST_LEN);
        if (!id || !text) return null;
        const commentsIn = Array.isArray(o.comments) ? o.comments : [];
        const comments: ChannelComment[] = commentsIn
          .map((c: unknown): ChannelComment | null => {
            if (!c || typeof c !== "object") return null;
            const x = c as Record<string, unknown>;
            const cid = typeof x.id === "string" ? x.id.replace(/[^\w-]/g, "").slice(0, 80) : "";
            const uid = typeof x.userId === "string" ? x.userId.replace(/[^\w-]/g, "").slice(0, 80) : "";
            const ct = sanitizePlainText(x.text, MAX_CHANNEL_COMMENT_LEN);
            const un = sanitizeUsername(x.username, 32);
            if (!cid || !uid || !ct || !un) return null;
            return {
              id: cid,
              userId: uid,
              username: un,
              text: ct,
              ts: Math.min(Date.now(), Math.max(0, Number(x.ts) || 0)),
            };
          })
          .filter((x): x is ChannelComment => x !== null);
        const avatar = sanitizeAvatarUrl(o.avatar);
        return {
          id,
          authorId: typeof o.authorId === "string" ? o.authorId.replace(/[^\w-]/g, "").slice(0, 80) : "",
          username: sanitizeUsername(o.username, 32) || "user",
          avatar: avatar || undefined,
          text,
          ts: Math.min(Date.now(), Math.max(0, Number(o.ts) || 0)),
          comments,
          commentsLocked: Boolean(o.commentsLocked),
        };
      })
      .filter((x): x is ChannelPost => x !== null && !!x.authorId);
    return {
      posts,
      globalCommentsDisabled: !!j.globalCommentsDisabled,
      bannedUserIds,
    };
  } catch {
    return empty;
  }
}

function saveStore(groupId: string, s: ChannelStore) {
  if (!isSafeGroupId(groupId)) return;
  localStorage.setItem(storageKey(groupId), JSON.stringify(s));
}

type Props = {
  groupId: string;
  /** id владельца канала (из мока) */
  ownerUserId: string;
  ownerUsername: string;
  ownerAvatar?: string;
  /** Если задано — показываются только посты и комментарии не старше этой метки времени (ограничение подписки). */
  recentContentCutoffTs?: number | null;
  accessNotice?: string | null;
};

export function GroupChannel({
  groupId,
  ownerUserId,
  ownerUsername,
  ownerAvatar,
  recentContentCutoffTs,
  accessNotice,
}: Props) {
  const { user } = useUser();
  const [store, setStore] = useState<ChannelStore>(() => loadStore(groupId));
  const [postText, setPostText] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [menuPostId, setMenuPostId] = useState<string | null>(null);

  useEffect(() => {
    setStore(loadStore(groupId));
  }, [groupId]);

  const persist = useCallback(
    (next: ChannelStore) => {
      setStore(next);
      saveStore(groupId, next);
    },
    [groupId]
  );

  const isCreator = useMemo(() => {
    if (!user || user.isGuest) return false;
    const u = user.username.trim().toLowerCase().replace(/^@/, "");
    const o = ownerUsername.trim().toLowerCase().replace(/^@/, "");
    return user.id === ownerUserId || u === o;
  }, [user, ownerUserId, ownerUsername]);

  const isBanned = user ? store.bannedUserIds.includes(user.id) : false;

  const publishPost = () => {
    if (!user || !postText.trim() || !isCreator) return;
    const text = sanitizePlainText(postText, MAX_CHANNEL_POST_LEN);
    if (!text) return;
    setPostText("");
    const post: ChannelPost = {
      id: `p_${Date.now()}`,
      authorId: user.id,
      username: user.username,
      avatar: sanitizeAvatarUrl(user.avatar) || undefined,
      text,
      ts: Date.now(),
      comments: [],
      commentsLocked: false,
    };
    persist({ ...store, posts: [post, ...store.posts].slice(0, MAX_CHANNEL_POSTS) });
  };

  const addComment = (postId: string) => {
    if (!user || user.isGuest || isBanned) return;
    const text = sanitizePlainText(commentDrafts[postId] || "", MAX_CHANNEL_COMMENT_LEN);
    if (!text) return;
    const post = store.posts.find((p) => p.id === postId);
    if (!post || post.commentsLocked || store.globalCommentsDisabled) return;
    const c: ChannelComment = {
      id: `c_${Date.now()}`,
      userId: user.id,
      username: user.username,
      text,
      ts: Date.now(),
    };
    const posts = store.posts.map((p) =>
      p.id === postId ? { ...p, comments: [...p.comments, c] } : p
    );
    persist({ ...store, posts });
    setCommentDrafts((d) => ({ ...d, [postId]: "" }));
  };

  const togglePostComments = (postId: string) => {
    if (!isCreator) return;
    const posts = store.posts.map((p) =>
      p.id === postId ? { ...p, commentsLocked: !p.commentsLocked } : p
    );
    persist({ ...store, posts });
    setMenuPostId(null);
  };

  const toggleGlobalComments = () => {
    if (!isCreator) return;
    persist({ ...store, globalCommentsDisabled: !store.globalCommentsDisabled });
  };

  const banUser = (userId: string) => {
    if (!isCreator || userId === ownerUserId) return;
    if (store.bannedUserIds.includes(userId)) return;
    if (store.bannedUserIds.length >= MAX_BANS) return;
    persist({ ...store, bannedUserIds: [...store.bannedUserIds, userId] });
    setMenuPostId(null);
  };

  const unbanUser = (userId: string) => {
    if (!isCreator) return;
    persist({
      ...store,
      bannedUserIds: store.bannedUserIds.filter((id) => id !== userId),
    });
  };

  const deleteComment = (postId: string, commentId: string) => {
    if (!isCreator) return;
    const posts = store.posts.map((p) =>
      p.id === postId
        ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
        : p
    );
    persist({ ...store, posts });
  };

  const deletePost = (postId: string) => {
    if (!isCreator) return;
    persist({ ...store, posts: store.posts.filter((p) => p.id !== postId) });
    setMenuPostId(null);
  };

  const timeAgo = (ts: number) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return "сейчас";
    if (m < 60) return `${m} мин`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ч`;
    return `${Math.floor(h / 24)} д`;
  };

  const postsVisible = useMemo(() => {
    if (recentContentCutoffTs == null) return store.posts;
    return store.posts
      .filter((p) => p.ts >= recentContentCutoffTs)
      .map((p) => ({
        ...p,
        comments: p.comments.filter((c) => c.ts >= recentContentCutoffTs),
      }));
  }, [store.posts, recentContentCutoffTs]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#080808]/80">
      {accessNotice && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-200/90 text-[11px] leading-relaxed flex-shrink-0">
          {accessNotice}
        </div>
      )}
      <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 text-white/70 text-xs">
          <Megaphone size={14} className="text-amber-400/90" />
          <span>Канал</span>
        </div>
        {isCreator && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleGlobalComments}
              className="text-[10px] px-2 py-1 rounded-lg border border-white/10 text-white/50 hover:text-white flex items-center gap-1"
            >
              {store.globalCommentsDisabled ? (
                <>
                  <Lock size={10} /> Комменты выкл.
                </>
              ) : (
                <>
                  <LockOpen size={10} /> Комменты вкл.
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
        {isCreator && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <div className="text-white/50 text-[10px] mb-2">Новый пост (только создатель канала)</div>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              rows={3}
              placeholder="Аналитика, сигнал, новость для подписчиков…"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500/40 resize-none placeholder:text-white/20"
              maxLength={4000}
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={publishPost}
                disabled={!postText.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium"
              >
                Опубликовать
              </button>
            </div>
          </div>
        )}

        {postsVisible.length === 0 && store.posts.length > 0 && recentContentCutoffTs != null && (
          <div className="text-center py-10 text-white/30 text-sm px-4">
            Старше 7 дней скрыто до завершения оплаты подписки.
          </div>
        )}

        {store.posts.length === 0 && (
          <div className="text-center py-16 text-white/25 text-sm space-y-2 px-4">
            <p>
              Пока нет постов. {isCreator ? "Напишите первый." : "Создатель канала ещё ничего не публиковал."}
            </p>
            {!isCreator && user && !user.isGuest && (
              <p className="text-white/15 text-[10px]">
                Посты публикует только @{ownerUsername} (тот же ник в вашем аккаунте BOFLAN).
              </p>
            )}
          </div>
        )}

        {postsVisible.map((post) => {
          const postAv = sanitizeAvatarUrl(post.avatar || ownerAvatar);
          return (
          <motion.article
            key={post.id}
            layout
            className="rounded-2xl border border-white/[0.07] bg-[#0f0f0f]/90 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                {postAv ? (
                <img
                  src={postAv}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover border border-white/10 flex-shrink-0 bg-[#1a1a1a]"
                />
                ) : (
                <div className="w-10 h-10 rounded-xl border border-white/10 flex-shrink-0 bg-[#1a1a1a] flex items-center justify-center text-xs font-bold text-white/40">
                  {post.username.charAt(0).toUpperCase()}
                </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white text-sm font-medium">{post.username}</span>
                      <span className="text-white/30 text-[10px] ml-2">{timeAgo(post.ts)}</span>
                    </div>
                    {isCreator && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMenuPostId(menuPostId === post.id ? null : post.id)}
                          className="p-1 text-white/30 hover:text-white rounded"
                        >
                          <MoreVertical size={16} />
                        </button>
                        <AnimatePresence>
                          {menuPostId === post.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="absolute right-0 top-full mt-1 z-10 min-w-[180px] rounded-lg border border-white/10 bg-[#141414] shadow-xl py-1"
                            >
                              <button
                                type="button"
                                onClick={() => togglePostComments(post.id)}
                                className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/5 flex items-center gap-2"
                              >
                                {post.commentsLocked ? <LockOpen size={12} /> : <Lock size={12} />}
                                {post.commentsLocked ? "Включить комменты к посту" : "Выключить комменты к посту"}
                              </button>
                              <button
                                type="button"
                                onClick={() => deletePost(post.id)}
                                className="w-full text-left px-3 py-2 text-xs text-red-400/80 hover:bg-white/5 flex items-center gap-2"
                              >
                                <Trash2 size={12} />
                                Удалить пост
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                  <p className="text-white/85 text-sm leading-relaxed mt-2 whitespace-pre-wrap break-words">
                    {post.text}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.05] bg-black/25 px-4 py-3">
              <div className="flex items-center gap-1.5 text-white/35 text-[10px] mb-2">
                <MessageCircle size={11} />
                {store.globalCommentsDisabled || post.commentsLocked ? (
                  <span>Комментарии отключены создателем</span>
                ) : (
                  <span>Комментарии ({post.comments.length})</span>
                )}
              </div>

              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {post.comments.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-2 text-xs group/c">
                    <div>
                      <span className="text-blue-400/90 font-medium">{c.username}</span>
                      <span className="text-white/25 ml-2">{timeAgo(c.ts)}</span>
                      <p className="text-white/60 mt-0.5">{c.text}</p>
                    </div>
                    {isCreator && (
                      <button
                        type="button"
                        onClick={() => {
                          banUser(c.userId);
                          deleteComment(post.id, c.id);
                        }}
                        className="opacity-0 group-hover/c:opacity-100 p-1 text-red-400/60 hover:text-red-400"
                        title="Удалить и забанить"
                      >
                        <Ban size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {user && !user.isGuest && !store.globalCommentsDisabled && !post.commentsLocked && !isBanned && (
                <div className="flex gap-2">
                  <input
                    value={commentDrafts[post.id] || ""}
                    onChange={(e) =>
                      setCommentDrafts((d) => ({ ...d, [post.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        addComment(post.id);
                      }
                    }}
                    placeholder="Комментарий…"
                    maxLength={1000}
                    className="flex-1 bg-black/35 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-blue-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => addComment(post.id)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70"
                  >
                    <Send size={14} />
                  </button>
                </div>
              )}
              {isBanned && (
                <p className="text-red-400/50 text-[10px]">Вы не можете комментировать в этом канале.</p>
              )}
            </div>
          </motion.article>
          );
        })}
      </div>

      {isCreator && store.bannedUserIds.length > 0 && (
        <div className="border-t border-white/[0.06] px-3 py-2 flex flex-wrap gap-1.5 items-center flex-shrink-0">
          <span className="text-white/30 text-[10px]">Бан:</span>
          {store.bannedUserIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => unbanUser(id)}
              className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-300/80 hover:bg-red-500/25"
            >
              {id.slice(0, 8)}… ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
