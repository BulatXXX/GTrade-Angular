import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {TrackedItem} from '../models/item';

type TrackedInput = Pick<TrackedItem, 'id' | 'iconLink'> & Partial<Pick<TrackedItem, 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class TrackedItemsService {
  private readonly key = 'gtrade.watchlist.v1';
  private readonly subject = new BehaviorSubject<TrackedItem[]>(this.load());

  readonly tracked$ = this.subject.asObservable();

  /** Синхронный снимок (удобно для sync-сервиса) */
  snapshot(): TrackedItem[] {
    return this.subject.value;
  }

  isTracked(id: string): boolean {
    return this.subject.value.some(x => x.id === id);
  }

  /** Локальный toggle: updatedAt ставим всегда "сейчас" */
  toggle(item: TrackedInput) {
    const current = this.subject.value;
    const exists = current.some(x => x.id === item.id);

    if (exists) {
      const next = current.filter(x => x.id !== item.id);
      this.set(next);
      return;
    }

    const normalized: TrackedItem = {
      id: String(item.id),
      iconLink: item.iconLink ?? null,
      updatedAt: Date.now(),
    };

    this.set([normalized, ...current]);
  }

  /** Жёстко заменить список (например: serverWins) */
  replaceAll(items: TrackedInput[]) {
    const next = this.normalizeList(items);
    this.set(next);
  }

  /**
   * Смёрджить "внутрь" локального (например: union/merge strategy)
   * По id: updatedAt берём максимальный.
   * Если у победителя нет iconLink — пытаемся взять у второго.
   */
  mergeIn(items: TrackedInput[]) {
    const byId = new Map<string, TrackedItem>();

    // сначала локальные
    for (const x of this.subject.value) {
      byId.set(x.id, x);
    }

    // потом внешние
    for (const raw of items ?? []) {
      const id = String(raw?.id ?? '');
      if (!id) continue;

      const incoming: TrackedItem = {
        id,
        iconLink: raw.iconLink ?? null,
        updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
      };

      const prev = byId.get(id);
      if (!prev) {
        byId.set(id, incoming);
        continue;
      }

      const winner =
        (incoming.updatedAt ?? 0) >= (prev.updatedAt ?? 0) ? incoming : prev;
      const loser = winner === incoming ? prev : incoming;

      byId.set(id, {
        id,
        updatedAt: winner.updatedAt,
        iconLink: winner.iconLink ?? loser.iconLink ?? null,
      });
    }

    const next = Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    this.set(next);
  }

  remove(id: string) {
    this.set(this.subject.value.filter(x => x.id !== id));
  }

  clear() {
    this.set([]);
  }

  // ---------------- private ----------------

  private set(value: TrackedItem[]) {
    this.subject.next(value);
    this.save(value);
  }

  private normalizeList(items: TrackedInput[]): TrackedItem[] {
    const byId = new Map<string, TrackedItem>();
    for (const x of items ?? []) {
      const id = String(x?.id ?? '');
      if (!id) continue;

      const normalized: TrackedItem = {
        id,
        iconLink: x.iconLink ?? null,
        updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
      };

      const prev = byId.get(id);
      if (!prev || normalized.updatedAt >= prev.updatedAt) {
        byId.set(id, normalized);
      }
    }

    return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private load(): TrackedItem[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as any[];

      // ВАЖНО: поддержим все старые поля, чтобы после перезагрузки не "пустело"
      return (parsed ?? [])
        .filter(x => x?.id)
        .map(x => ({
          id: String(x.id),
          iconLink: x.iconLink ? String(x.iconLink) : null,
          updatedAt: Number(x.updatedAt ?? x.addedAt ?? x.createdAt ?? Date.now()),
        })) as TrackedItem[];
    } catch {
      return [];
    }
  }

  private save(value: TrackedItem[]) {
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
    } catch {}
  }
}
