import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Dynamically write VITE_ variables from process.env to .env so they are embedded in the bundle
try {
  const envFile = path.resolve(process.cwd(), '.env');
  const envVars: string[] = [];
  
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("VITE_") || key === "GEMINI_API_KEY" || key === "APP_URL") {
      envVars.push(`${key}="${process.env[key]}"`);
    }
  }

  console.log("Process env VITE_ keys found:", Object.keys(process.env).filter(k => k.startsWith("VITE_")));

  if (envVars.length > 0) {
    fs.writeFileSync(envFile, envVars.join('\n'), 'utf-8');
    console.log('Successfully wrote process.env variables to .env file for the application.');
  } else {
    console.warn('No VITE_ variables found in process.env!');
  }
} catch (e) {
  console.error('Warning: could not write VITE_ vars to .env in server.ts:', e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  const DB_FILE = path.join(process.cwd(), "posts_db.json");

  // Helper to read posts
  function getStoredPosts() {
    try {
      if (fs.existsSync(DB_FILE)) {
        return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      }
    } catch (err) {
      console.error("Error reading db file, returning empty array:", err);
    }
    return [];
  }

  // Helper to save posts
  function saveStoredPosts(posts: any[]) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(posts, null, 2), "utf-8");
    } catch (err) {
      console.error("Error writing db file:", err);
    }
  }

  // Initialize databases with empty data if they don't exist
  if (!fs.existsSync(DB_FILE)) {
    saveStoredPosts([]);
  }

  const SENTIMENT_FILE = path.join(process.cwd(), "sentiment_db.json");
  function getSentiments() {
    try {
      if (fs.existsSync(SENTIMENT_FILE)) {
        return JSON.parse(fs.readFileSync(SENTIMENT_FILE, "utf-8"));
      }
    } catch (err) {
      console.error("Error reading sentiment db:", err);
    }
    return {};
  }
  function saveSentiments(s: any) {
    try {
      fs.writeFileSync(SENTIMENT_FILE, JSON.stringify(s, null, 2), "utf-8");
    } catch (err) { }
  }

  app.get("/api/sentiment/:coin", (req, res) => {
    const sentiments = getSentiments();
    const coin = req.params.coin.toUpperCase();
    res.json(sentiments[coin] || { bullish: 0, bearish: 0 });
  });

  app.post("/api/sentiment/:coin", (req, res) => {
    const sentiments = getSentiments();
    const coin = req.params.coin.toUpperCase();
    const { vote } = req.body;
    if (!sentiments[coin]) sentiments[coin] = { bullish: 0, bearish: 0 };
    if (vote === 'bullish') sentiments[coin].bullish += 1;
    if (vote === 'bearish') sentiments[coin].bearish += 1;
    saveSentiments(sentiments);
    res.json(sentiments[coin]);
  });

  // CoinGecko Proxy with simple in-memory cache to bypass CORS and prevent 429 rate limits
  const coingeckoCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 30000; // 30 seconds caching is more than enough to stop spam

  app.get("/api/coingecko/*", async (req, res) => {
    try {
      const targetPath = (req.params as any)[0];
      const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
      const targetUrl = `https://api.coingecko.com/api/v3/${targetPath}${queryParams ? '?' + queryParams : ''}`;
      
      const cacheKey = targetUrl;
      const cached = coingeckoCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return res.json(cached.data);
      }

      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          if (cached) {
            console.warn(`[CoinGecko Proxy] 429 rate limit hit, serving cached data for ${targetPath}`);
            return res.json(cached.data);
          }
          return res.status(429).json({ error: "CoinGecko API rate limit exceeded. Please retry shortly." });
        }
        throw new Error(`CoinGecko responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      coingeckoCache.set(cacheKey, { data, timestamp: Date.now() });
      res.json(data);
    } catch (err: any) {
      console.error("[CoinGecko Proxy] Error:", err.message);
      // Try to recover with Cache even if expired
      const targetPath = (req.params as any)[0];
      const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
      const targetUrl = `https://api.coingecko.com/api/v3/${targetPath}${queryParams ? '?' + queryParams : ''}`;
      const cached = coingeckoCache.get(targetUrl);
      if (cached) {
        return res.json(cached.data);
      }
      res.status(500).json({ error: err.message || "Failed to fetch from CoinGecko" });
    }
  });

  // Global News Mock Area
  app.get("/api/news/:coin", async (req, res) => {
    try {
      const coin = req.params.coin.toUpperCase();
      const response = await fetch(`https://min-api.cryptocompare.com/data/v2/news/?categories=${coin}`);
      const data = await response.json();
      res.json(data?.Data?.slice(0, 10) || []);
    } catch (err) {
      console.error(err);
      res.status(500).json([]);
    }
  });

  // REST API for chat messages
  const CHAT_FILE = path.join(process.cwd(), "chat_storage.json");
  const getChatMessages = () => {
    try {
      if (fs.existsSync(CHAT_FILE)) {
        return JSON.parse(fs.readFileSync(CHAT_FILE, "utf-8"));
      }
    } catch (err) {
      console.error("Error reading chat file:", err);
    }
    return {};
  };

  const saveChatMessages = (data: any) => {
    try {
      fs.writeFileSync(CHAT_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error writing chat file:", err);
    }
  };

  app.get("/api/chat/:groupId/messages", (req, res) => {
    const groupId = req.params.groupId;
    const chats = getChatMessages();
    res.json({ success: true, messages: chats[groupId] || [] });
  });

  app.post("/api/chat/:groupId/messages", (req, res) => {
    const groupId = req.params.groupId;
    const msg = req.body;
    
    if (!msg || !msg.userId || !msg.text) {
      return res.status(400).json({ success: false, error: "Invalid message format" });
    }

    const chats = getChatMessages();
    if (!chats[groupId]) chats[groupId] = [];
    
    const newMsg = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      groupId,
      userId: msg.userId,
      username: msg.username || 'System',
      avatar: msg.avatar || null,
      text: msg.text,
      timestamp: Date.now(),
      isGuest: Boolean(msg.isGuest),
      type: msg.type || 'text',
      signalData: msg.signalData || null
    };

    chats[groupId].push(newMsg);
    saveChatMessages(chats);
    
    res.json({ success: true, message: newMsg });
  });

  // REST API for posts
  app.get("/api/posts", (req, res) => {
    const posts = getStoredPosts();
    const userId = req.query.userId;
    if (userId) {
      const filtered = posts.filter((p: any) => p.user_id === userId);
      return res.json(filtered);
    }
    res.json(posts);
  });

  app.post("/api/posts", (req, res) => {
    const { post, userId } = req.body;
    if (!post || !userId) {
      return res.status(400).json({ error: "Missing post or userId" });
    }

    const posts = getStoredPosts();
    
    const rawPost = {
      id: `server_${Date.now()}__${Math.random().toString(36).slice(2, 9)}`,
      created_at: new Date().toISOString(),
      user_id: userId,
      coin: post.coin,
      coin_name: post.coinName,
      direction: post.direction,
      target: post.target,
      timeframe: post.timeframe,
      text: post.text,
      chart_data: post.chartData,
      images: post.images,
      current_price: post.currentPrice,
      price_change: post.priceChange,
      positive: post.positive,
      likes: post.likes || 0,
      comments: post.comments || 0,
      reposts: post.reposts || 0,
      accuracy: post.accuracy,
      user_profiles: {
        user_id: userId,
        username: post.user.username,
        display_name: post.user.displayName,
        avatar_url: post.user.avatar,
        verified: post.user.verified,
        exchange: post.user.exchange,
        win_rate: post.user.winRate,
        pnl: post.user.pnl,
        pnl_positive: post.user.pnlPositive
      }
    };

    posts.unshift(rawPost);
    saveStoredPosts(posts);

    res.status(201).json(rawPost);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
