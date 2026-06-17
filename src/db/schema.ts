import { pgTable, text, timestamp, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: varchar("id", { length: 255 }).primaryKey(),
  username: varchar("username", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  cryptoAddress: varchar("crypto_address", { length: 255 }),
  verified: boolean("verified").default(false),
  exchange: varchar("exchange", { length: 50 }).default("Binance"),
  winRate: varchar("win_rate", { length: 50 }).default("0"),
  pnl: varchar("pnl", { length: 50 }).default("0%"),
  pnlPositive: boolean("pnl_positive").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => profiles.id),
  groupId: varchar("group_id", { length: 255 }),
  tier: varchar("tier", { length: 50 }).default("free"),
  
  coin: varchar("coin", { length: 50 }),
  coinName: varchar("coin_name", { length: 150 }),
  direction: varchar("direction", { length: 50 }),
  target: varchar("target", { length: 100 }),
  timeframe: varchar("timeframe", { length: 50 }),
  text: text("text").notNull(),
  chartData: jsonb("chart_data"),
  images: jsonb("images"),
  currentPrice: varchar("current_price", { length: 100 }),
  priceChange: varchar("price_change", { length: 100 }),
  positive: boolean("positive").default(true),
  accuracy: varchar("accuracy", { length: 50 }),
  
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  repostsCount: integer("reposts_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

