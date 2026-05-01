import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, map, Observable, tap} from 'rxjs';
import {API} from '../api/api.config';
import {AuthState, AuthTokens, AuthUser} from './auth.types';

type TokenPairResponse = { access_token: string; refresh_token: string; token_type: string; expires_in: number };
type LoginReq = { email: string; password: string };
type RegisterReq = { email: string; password: string };

type PasswordResetRequestResp = { status: string };
type PasswordResetConfirmResp = { status: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly key = 'gtrade.auth.v1';
  private readonly stateSubject = new BehaviorSubject<AuthState>(this.loadInitialState());
  readonly state$ = this.stateSubject.asObservable();

  get snapshot(): AuthState { return this.stateSubject.value; }
  get accessToken(): string | null { return this.snapshot.status === 'auth' ? this.snapshot.tokens.accessToken : null; }
  get refreshToken(): string | null { return this.snapshot.status === 'auth' ? this.snapshot.tokens.refreshToken : null; }
  get userId(): string | null { return this.snapshot.status === 'auth' ? this.snapshot.user.id : null; }
  get isAuthed(): boolean { return !!this.accessToken; }

  login(req: LoginReq): Observable<AuthUser> {
    return this.http.post<TokenPairResponse>(`${API.auth}/login`, req).pipe(
      tap(res => this.setAuth(res, req.email)),
      map(() => (this.snapshot as Extract<AuthState, {status: 'auth'}>).user),
    );
  }

  register(req: RegisterReq): Observable<AuthUser> {
    return this.http.post<TokenPairResponse>(`${API.auth}/register`, req).pipe(
      tap(res => this.setAuth(res, req.email)),
      map(() => (this.snapshot as Extract<AuthState, {status: 'auth'}>).user),
    );
  }

  refresh(): Observable<string> {
    const refresh_token = this.refreshToken;
    if (!refresh_token) throw new Error('No refresh token');
    return this.http.post<TokenPairResponse>(`${API.auth}/refresh`, { refresh_token }).pipe(
      tap(res => this.setAuth(res, this.snapshot.status === 'auth' ? this.snapshot.user.email : undefined)),
      map(res => res.access_token),
    );
  }

  requestPasswordReset(email: string): Observable<PasswordResetRequestResp> {
    return this.http.post<PasswordResetRequestResp>(`${API.auth}/password/reset/request`, { email });
  }

  confirmPasswordReset(token: string, new_password: string): Observable<PasswordResetConfirmResp> {
    return this.http.post<PasswordResetConfirmResp>(`${API.auth}/password/reset/confirm`, { token, new_password });
  }

  logout(): void {
    localStorage.removeItem(this.key);
    this.stateSubject.next({ status: 'guest' });
  }

  private setAuth(res: TokenPairResponse, email?: string) {
    const tokens: AuthTokens = {
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      expiresIn: res.expires_in,
    };
    const id = readJwtSub(res.access_token) ?? 'me';
    const user: AuthUser = { id, email, name: email?.split('@')[0] || `User #${id}`, avatarUrl: null };
    const state: AuthState = { status: 'auth', user, tokens };
    localStorage.setItem(this.key, JSON.stringify(state));
    this.stateSubject.next(state);
  }

  private loadInitialState(): AuthState {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return { status: 'guest' };
      const parsed = JSON.parse(raw) as AuthState;
      return parsed?.status === 'auth' && parsed.tokens?.accessToken ? parsed : { status: 'guest' };
    } catch { return { status: 'guest' }; }
  }
}

function readJwtSub(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(normalized).split('').map(c => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join(''));
    return String(JSON.parse(json).sub ?? '') || null;
  } catch { return null; }
}
