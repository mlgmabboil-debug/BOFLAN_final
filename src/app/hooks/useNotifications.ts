import { useState, useEffect, useCallback } from "react";
import { projectId, publicAnonKey, isEdgeFunctionOnline } from "../../../utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6d3e2891`;

const NOTIF_STORAGE_PREFIX = "boflan_notifications_";

export interface Notification {
  id: string;
  userId: string;
  text: string;
  type: "trade" | "follow" | "group" | "price" | "system";
  read: boolean;
  timestamp: number;
}

// Default initial notifications to make the app look lively of initial load
const DEFAULT_NOTIFICATIONS: Omit<Notification, "userId">[] = [
  {
    id: "init_system_1",
    text: "Добро пожаловать в BOFLAN! Верифицируйте свой крипто-портфель в настройках профиля.",
    type: "system",
    read: false,
    timestamp: Date.now() - 3600000,
  },
  {
    id: "init_trade_2",
    text: "Трейдер aleks_crypto открыл новую сделку LONG по BTC с таргетом $102,500.",
    type: "trade",
    read: false,
    timestamp: Date.now() - 1200000,
  }
];

export function useNotifications(userId: string | undefined, pollInterval = 20000, disableFetch = false) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const getLocalNotifications = useCallback((uid: string): Notification[] => {
    try {
      const stored = localStorage.getItem(`${NOTIF_STORAGE_PREFIX}${uid}`);
      if (stored) {
        return JSON.parse(stored);
      }
      // Populate defaults
      const defaults = DEFAULT_NOTIFICATIONS.map(n => ({ ...n, userId: uid }));
      localStorage.setItem(`${NOTIF_STORAGE_PREFIX}${uid}`, JSON.stringify(defaults));
      return defaults;
    } catch {
      return [];
    }
  }, []);

  const saveLocalNotifications = useCallback((uid: string, list: Notification[]) => {
    try {
      localStorage.setItem(`${NOTIF_STORAGE_PREFIX}${uid}`, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    
    const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
    if (!isSupabaseValid || !(await isEdgeFunctionOnline(API_BASE, publicAnonKey))) {
      const local = getLocalNotifications(userId);
      setNotifications(local);
      setUnreadCount(local.filter((n) => !n.read).length);
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const resp = await fetch(`${API_BASE}/notifications/${userId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (json.success) {
        setNotifications(json.notifications);
        setUnreadCount(json.notifications.filter((n: Notification) => !n.read).length);
        // Sync to local for offline speed
        saveLocalNotifications(userId, json.notifications);
      }
    } catch (e) {
      console.warn("Notifications API error, pulling from local storage:", e);
      const local = getLocalNotifications(userId);
      setNotifications(local);
      setUnreadCount(local.filter((n) => !n.read).length);
    } finally {
      setLoading(false);
    }
  }, [userId, getLocalNotifications, saveLocalNotifications]);

  useEffect(() => {
    if (disableFetch) {
      setLoading(false);
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, pollInterval);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollInterval, disableFetch]);

  const markAllRead = async () => {
    if (!userId) return;
    
    // Optimistic local update
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    setUnreadCount(0);
    saveLocalNotifications(userId, updated);

    const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
    if (!isSupabaseValid) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch(`${API_BASE}/notifications/${userId}/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (e) {
      console.warn("Mark all read server error:", e);
    }
  };

  const markRead = async (notifId: string) => {
    if (!userId) return;

    // Optimistic local update
    const updated = notifications.map((n) => n.id === notifId ? { ...n, read: true } : n);
    setNotifications(updated);
    setUnreadCount((c) => Math.max(0, c - 1));
    saveLocalNotifications(userId, updated);

    const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
    if (!isSupabaseValid) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch(`${API_BASE}/notifications/${userId}/read/${notifId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (e) {
      console.warn("Mark read server error:", e);
    }
  };

  const addNotification = async (text: string, type: Notification["type"] = "system") => {
    if (!userId) return;

    // Optimistic or standalone local update
    const localNotif: Notification = {
      id: `localNotif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      text,
      type,
      read: false,
      timestamp: Date.now()
    };
    const updated = [localNotif, ...notifications];
    setNotifications(updated);
    setUnreadCount((c) => c + 1);
    saveLocalNotifications(userId, updated);

    const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
    if (!isSupabaseValid) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch(`${API_BASE}/notifications/${userId}/add`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ text, type }),
      });
      clearTimeout(timeoutId);
    } catch (e) {
      console.warn("Server notification register failed:", e);
    }
  };

  return { notifications, unreadCount, loading, markAllRead, markRead, addNotification, refresh: fetchNotifications };
}
