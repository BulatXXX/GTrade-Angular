import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {ItemPreview} from '../models/item';

export type HistoryEntry = ItemPreview & { visitedAt: number };

@Injectable({providedIn: 'root'})
export class ItemsHistoryService {
  private readonly key = 'tarkov.history.v1';
  private readonly subject = new BehaviorSubject<HistoryEntry[]>(this.load());

  history$ = this.subject.asObservable();

  add(item: ItemPreview) {
    const now = Date.now();
    const current = this.subject.value;

    const next: HistoryEntry[] = [
      {...item, visitedAt: now},
      ...current.filter(x => x.id !== item.id),
    ].slice(0, 10);

    this.subject.next(next);
    this.save(next);
  }

  private load(): HistoryEntry[] {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    } catch {
      return [];
    }
  }

  private save(value: HistoryEntry[]) {
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
    } catch {
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
      const next: HistoryEntry[] = [];
      this.subject.next(next);
      this.save(next);
    } catch {
      console.log("FUCK")
    }
  }
}
