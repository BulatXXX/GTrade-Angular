import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {Lang} from '../i18n/i18n.dict';

export type AppLanguage = 'en' | 'ru';
export type SearchLanguage = 'auto' | 'en' | 'ru';
export type GameMode = 'pvp' | 'pve';

export type AppSettings = {
  appLanguage: AppLanguage;
  searchLanguage: SearchLanguage;
  mode: GameMode;
};

const STORAGE_KEY = 'th.settings.v1';

const DEFAULT_SETTINGS: AppSettings = {
  appLanguage: 'en',
  searchLanguage: 'auto',
  mode: 'pvp',
};

function safeLoad(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      appLanguage: parsed.appLanguage === 'ru' ? 'ru' : 'en',
      searchLanguage: parsed.searchLanguage === 'ru' ? 'ru' : parsed.searchLanguage === 'en' ? 'en' : 'auto',
      mode: parsed.mode === 'pve' ? 'pve' : 'pvp',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function safeSave(v: AppSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch {}
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly _state$ = new BehaviorSubject<AppSettings>(safeLoad());

  readonly settings$ = this._state$.asObservable();

  get snapshot(): AppSettings {
    return this._state$.value;
  }
  toggleAppLanguage() {
    const next: Lang = this.snapshot.appLanguage === 'ru' ? 'en' : 'ru';
    this.setAppLanguage(next);
  }
  setAppLanguage(appLanguage: AppLanguage) {
    this.patch({ appLanguage: appLanguage, searchLanguage: appLanguage });
  }

  setSearchLanguage(searchLanguage: SearchLanguage) {
    this.patch({ searchLanguage });
  }

  setMode(mode: GameMode) {
    this.patch({ mode });
  }

  private patch(p: Partial<AppSettings>) {
    const next = { ...this._state$.value, ...p };
    this._state$.next(next);
    safeSave(next);
  }
}
