import {inject, Injectable} from '@angular/core';
import {distinctUntilChanged, map} from 'rxjs';

import {Dict, DICT_EN, DICT_RU, Lang} from './i18n.dict';
import {SettingsService} from '../services/settings-service';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private settings: SettingsService = inject(SettingsService);
  readonly lang$ = this.settings.settings$.pipe(
    map(s => s.appLanguage as Lang),
    distinctUntilChanged()
  );

  private dict(lang: Lang): Dict {
    return lang === 'ru' ? DICT_RU : DICT_EN;
  }

  /** Sync */
  t(key: string, params?: Record<string, string | number>): string {
    const lang = this.settings.snapshot.appLanguage as Lang;
    return this.translate(lang, key, params);
  }

  /** Reactive (удобно для pipe) */
  t$(key: string, params?: Record<string, string | number>) {
    return this.lang$.pipe(map(lang => this.translate(lang, key, params)));
  }

  private translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
    const table = this.dict(lang);
    const fallback = DICT_EN[key] ?? key;      // fallback на EN, потом key
    const raw = table[key] ?? fallback;

    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
  }
}
