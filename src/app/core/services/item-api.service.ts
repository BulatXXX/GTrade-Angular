import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {catchError, forkJoin, map, Observable, of, switchMap} from 'rxjs';
import {API} from '../api/api.config';
import {CatalogItem, GameCode, GameMode, ItemDetails, ItemPreview, PriceHistoryEntry, PriceSnapshot} from '../models/item';

type ListItemsResponse = { items: CatalogItem[]; limit: number; offset: number };
type ItemResponse = { item: CatalogItem };
type PriceResponse = { price: PriceSnapshot };
type TopPriceResponse = { value?: number | null; currency?: string; fetched_at?: string };
type PriceHistoryResponse = { item_id: string; game_mode: string; history: PriceHistoryEntry[] };

function asPreview(item: CatalogItem): ItemPreview {
  return {
    id: item.id,
    game: item.game,
    source: item.source,
    externalId: item.external_id,
    name: item.localized_name || item.name,
    description: item.localized_description || item.description || null,
    iconLink: item.image_url || null,
  };
}

@Injectable({ providedIn: 'root' })
export class ItemApiService {
  private http = inject(HttpClient);

  searchItems(params: { name: string; game?: GameCode | 'all'; lang?: 'en' | 'ru'; limit?: number; offset?: number }): Observable<ItemPreview[]> {
    let q = new HttpParams()
      .set('q', params.name)
      .set('language', params.lang ?? 'en')
      .set('limit', params.limit ?? 40)
      .set('offset', params.offset ?? 0);

    if (params.game && params.game !== 'all') q = q.set('game', params.game);

    return this.http.get<ListItemsResponse>(`${API.items}/search`, { params: q }).pipe(
      map(res => (res.items ?? []).map(asPreview))
    );
  }

  listItems(params: { game?: GameCode | 'all'; lang?: 'en' | 'ru'; limit?: number; offset?: number }): Observable<ItemPreview[]> {
    let q = new HttpParams()
      .set('language', params.lang ?? 'en')
      .set('active_only', true)
      .set('limit', params.limit ?? 40)
      .set('offset', params.offset ?? 0);
    if (params.game && params.game !== 'all') q = q.set('game', params.game);
    return this.http.get<ListItemsResponse>(API.items, { params: q }).pipe(map(res => (res.items ?? []).map(asPreview)));
  }

  getItemById(params: { id: string; lang?: 'en' | 'ru'; gameMode?: GameMode }): Observable<ItemDetails> {
    const itemParams = new HttpParams().set('language', params.lang ?? 'en');
    return this.http.get<ItemResponse>(`${API.items}/${encodeURIComponent(params.id)}`, { params: itemParams }).pipe(
      map(res => res.item),
      switchMap(item => {
        const preview = asPreview(item);
        const marketParams = new HttpParams()
          .set('game', String(item.game))
          .set('game_mode', params.gameMode ?? 'regular');
        const externalId = item.external_id || item.id;

        const historyParams = new HttpParams()
          .set('game_mode', params.gameMode ?? 'regular')
          .set('limit', 60);

        return forkJoin({
          price: this.http.get<PriceResponse>(`${API.market}/items/${encodeURIComponent(externalId)}/prices`, { params: marketParams }).pipe(
            map(res => res.price),
            catchError(() => of(null))
          ),
          top: this.http.get<TopPriceResponse>(`${API.market}/items/${encodeURIComponent(externalId)}/top-price`, { params: marketParams }).pipe(
            map(res => res.value ?? null),
            catchError(() => of(null))
          ),
          history: this.http.get<PriceHistoryResponse>(`${API.items}/${encodeURIComponent(item.id)}/prices/history`, { params: historyParams }).pipe(
            map(res => res.history ?? []),
            catchError(() => of([] as PriceHistoryEntry[]))
          ),
        }).pipe(
          map(({price, top, history}) => ({
            ...preview,
            description: preview.description ?? null,
            image512pxLink: preview.iconLink,
            price,
            topPrice: top,
            priceHistory: history,
          }))
        );
      })
    );
  }

  getItemsByIdsForProfile(params: { ids: string[]; lang?: 'en' | 'ru'; gameMode?: GameMode }): Observable<Array<{ id: string; name: string; game: GameCode | string; avg24hPrice: number | null; iconLink?: string | null }>> {
    if (!params.ids.length) return of([]);
    return forkJoin(params.ids.map(id => this.getItemById({ id, lang: params.lang, gameMode: params.gameMode }).pipe(catchError(() => of(null))))).pipe(
      map(items => items.filter(Boolean).map((it: any) => ({ id: it.id, name: it.name, game: it.game, avg24hPrice: it.topPrice ?? it.price?.pricing?.current ?? null, iconLink: it.iconLink })))
    );
  }
}
