export type CatalogStats = {
  total_items: number;
  active_items: number;
  price_history_rows: number;
};

export type AdminJob = {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | string;
  progress_percent: number;
  processed: number;
  total: number;
  error?: string;
  started_at?: string;
  finished_at?: string;
  meta?: Record<string, unknown>;
};

export type AdminUser = {
  id: number;
  email: string;
  email_verified: boolean;
  role: string;
  created_at: string;
};

export type AdminPriceAlertResult = {
  target_user_id?: number;
  users_checked: number;
  emails_sent: number;
  changes_found: number;
  users_with_diff: number;
};

export type CatalogImportRequest = {
  game: string;
  source?: string;
  language?: string;
};

export type AdminMessageRequest = {
  user_id: number;
  subject: string;
  html_body: string;
  text_body: string;
};

export type CreateItemRequest = {
  name: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  game?: string;
  source?: string;
  external_id?: string;
  slug?: string;
  translations?: Array<{ language_code: string; name: string; description?: string }>;
};

export type UpdateItemRequest = {
  name?: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  translations?: Array<{ language_code: string; name: string; description?: string }>;
};
