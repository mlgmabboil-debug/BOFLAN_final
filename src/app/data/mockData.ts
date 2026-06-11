/** Профиль владельца группы (каталог в localStorage). */
export type GroupOwnerProfile = {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  verified: boolean;
  exchange?: string;
};

export type GroupListing = {
  id: string;
  name: string;
  owner: GroupOwnerProfile;
  creatorPayoutEth?: string;
  description: string;
  price: string;
  priceUsd: string;
  members: number;
  maxMembers: number;
  tags: string[];
  joined: boolean;
  premium: boolean;
  /** Подписка в USDT/мес.; если задано, расчёт оплаты в USD без парсинга ETH из `price`. */
  usdtPerMonth?: number;
};

/** Стартовый каталог пустой — группы добавляются из вкладки «Группы». */
export const GROUPS: GroupListing[] = [];

/** Данные монет теперь берутся только из CoinGecko API через useMarketPrices hook */
export const MARKET_COINS: any[] = [];
