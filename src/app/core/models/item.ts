export type GameCode = 'warframe' | 'eve' | 'tarkov';
export type GameMode = 'regular' | 'pve';

export type CatalogItem = {
  id: string;
  game: GameCode | string;
  source: string;
  external_id: string;
  slug: string;
  name: string;
  localized_name?: string | null;
  description?: string | null;
  localized_description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  translations?: Array<{
    language_code: string;
    name: string;
    description?: string | null;
  }>;
  created_at?: string;
  updated_at?: string;
};

export type ItemPreview = {
  id: string;
  game: string;
  source: string;
  externalId: string;
  name: string;
  description?: string | null;
  iconLink: string | null;
};

export type PriceSnapshot = {
  item_id: string;
  game: string;
  game_mode?: string | null;
  source: string;
  currency: string;
  market_kind: string;
  fetched_at: string;
  pricing?: {
    current?: number | null;
    top_sell?: number | null;
    top_buy?: number | null;
    base_price?: number | null;
    adjusted_price?: number | null;
    spread?: number | null;
  } | null;
  analytics?: {
    sample_size?: number | null;
    low?: number | null;
    high?: number | null;
    median?: number | null;
  } | null;
};

export type PriceHistoryEntry = {
  item_id: string;
  source: string;
  game_mode: string;
  value: number;
  currency: string;
  collected_on: string;
  collected_at: string;
};

export type ItemDetails = ItemPreview & {
  description: string | null;
  image512pxLink: string | null;
  price?: PriceSnapshot | null;
  topPrice?: number | null;
  priceHistory?: PriceHistoryEntry[];
};

export type TrackedItem = {
  id: string;
  iconLink: string | null;
  updatedAt: number;
};
