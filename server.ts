import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

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

  // Initialize database with an empty array if it doesn't exist
  if (!fs.existsSync(DB_FILE)) {
    saveStoredPosts([]);
  }

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
