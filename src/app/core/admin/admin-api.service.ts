import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ADMIN_API, API } from '../api/api.config';
import {
  AdminJob,
  AdminMessageRequest,
  AdminPriceAlertResult,
  AdminUser,
  CatalogImportRequest,
  CatalogStats,
  CreateItemRequest,
  UpdateItemRequest,
} from './admin.types';
import { CatalogItem } from '../models/item';

type ListItemsResponse = { items: CatalogItem[]; limit?: number; offset?: number };
type ItemResponse = { item: CatalogItem };
type ListUsersResponse = { users: AdminUser[] };
type ListJobsResponse = { jobs: AdminJob[] };

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);

  // --- Catalog stats & jobs ---

  getStats(): Observable<CatalogStats> {
    return this.http.get<CatalogStats>(`${ADMIN_API.catalog}/stats`);
  }

  listJobs(): Observable<AdminJob[]> {
    return this.http
      .get<ListJobsResponse>(`${ADMIN_API.catalog}/jobs`)
      .pipe(map(res => res.jobs ?? []));
  }

  getJob(id: string): Observable<AdminJob> {
    return this.http.get<AdminJob>(`${ADMIN_API.catalog}/jobs/${id}`);
  }

  startCatalogImport(req: CatalogImportRequest): Observable<AdminJob> {
    return this.http.post<AdminJob>(`${ADMIN_API.catalog}/jobs/catalog-import`, req);
  }

  startPriceSync(): Observable<AdminJob> {
    return this.http.post<AdminJob>(`${ADMIN_API.catalog}/jobs/price-history-sync`, {});
  }

  // --- Users ---

  listUsers(): Observable<AdminUser[]> {
    return this.http
      .get<ListUsersResponse>(`${ADMIN_API.auth}/users`)
      .pipe(map(res => res.users ?? []));
  }

  setUserRole(id: number, role: string): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${ADMIN_API.auth}/users/${id}/role`, { role });
  }

  // --- Notifications ---

  sendPriceAlerts(req: { user_id?: number; force_send?: boolean }): Observable<AdminPriceAlertResult> {
    return this.http.post<AdminPriceAlertResult>(`${ADMIN_API.userAssets}/price-alerts/send`, req);
  }

  sendAdminMessage(req: AdminMessageRequest): Observable<void> {
    return this.http.post<void>(`${ADMIN_API.userAssets}/messages/send`, req);
  }

  // --- Item CRUD (public catalog routes, admin role authorized by gateway) ---

  listItems(params: {
    game?: string;
    language?: string;
    active_only?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<CatalogItem[]> {
    let p = new HttpParams();
    if (params.game) p = p.set('game', params.game);
    if (params.language) p = p.set('language', params.language);
    if (params.active_only != null) p = p.set('active_only', String(params.active_only));
    if (params.limit != null) p = p.set('limit', String(params.limit));
    if (params.offset != null) p = p.set('offset', String(params.offset));
    return this.http
      .get<ListItemsResponse>(`${API.items}`, { params: p })
      .pipe(map(res => res.items ?? []));
  }

  searchItems(params: {
    q: string;
    game?: string;
    language?: string;
    limit?: number;
    offset?: number;
  }): Observable<CatalogItem[]> {
    let p = new HttpParams().set('q', params.q);
    if (params.game) p = p.set('game', params.game);
    if (params.language) p = p.set('language', params.language);
    if (params.limit != null) p = p.set('limit', String(params.limit));
    if (params.offset != null) p = p.set('offset', String(params.offset));
    return this.http
      .get<ListItemsResponse>(`${API.items}/search`, { params: p })
      .pipe(map(res => res.items ?? []));
  }

  getItem(id: string, language?: string): Observable<CatalogItem> {
    let p = new HttpParams();
    if (language) p = p.set('language', language);
    return this.http
      .get<ItemResponse>(`${API.items}/${id}`, { params: p })
      .pipe(map(res => res.item));
  }

  createItem(req: CreateItemRequest): Observable<CatalogItem> {
    return this.http
      .post<ItemResponse>(`${API.items}`, req)
      .pipe(map(res => res.item));
  }

  upsertItem(req: CreateItemRequest): Observable<CatalogItem> {
    return this.http
      .post<ItemResponse>(`${API.items}/upsert`, req)
      .pipe(map(res => res.item));
  }

  updateItem(id: string, req: UpdateItemRequest): Observable<CatalogItem> {
    return this.http
      .put<ItemResponse>(`${API.items}/${id}`, req)
      .pipe(map(res => res.item));
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${API.items}/${id}`);
  }
}
