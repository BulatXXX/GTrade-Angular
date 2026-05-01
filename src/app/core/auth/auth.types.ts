export type AuthUser = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
};

export type AuthState =
  | { status: 'guest' }
  | { status: 'auth'; user: AuthUser; tokens: AuthTokens };
