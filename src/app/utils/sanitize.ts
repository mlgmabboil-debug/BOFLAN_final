/** Убирает нулевые байты и обрезает длину (защита от перегрузки и странных символов). */
export function sanitizePlainText(input: unknown, maxLen: number): string {
  if (typeof input !== "string") return "";
  return input.replace(/\0/g, "").trim().slice(0, maxLen);
}

/**
 * Разрешены только https-URL без пробелов и кавычек (снижает риск XSS через src и odd schemes).
 */
export function sanitizeAvatarUrl(url: unknown): string {
  if (typeof url !== "string") return "";
  const t = url.trim();
  if (t.length === 0 || t.length > 2048) return "";
  if (!/^https:\/\//i.test(t)) return "";
  if (/[\s<>"'`]/.test(t)) return "";
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") return "";
    return u.href;
  } catch {
    return "";
  }
}

export function sanitizeUsername(username: unknown, maxLen = 32): string {
  if (typeof username !== "string") return "";
  const t = username.trim().replace(/[^\w\u0400-\u04FF.-]/g, "").slice(0, maxLen);
  return t;
}

/** EVM-адрес для отображения баланса (только просмотр, без подписей). */
export function sanitizeEthAddress(addr: unknown): string {
  if (typeof addr !== "string") return "";
  const t = addr.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(t)) return "";
  return t.toLowerCase();
}
