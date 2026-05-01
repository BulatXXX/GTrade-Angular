import {Component, DestroyRef, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {map} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {ItemDetailsViewModel} from '../item-details-view-model';
import {ItemDetails, PriceSnapshot} from '../../../../../core/models/item';

type ChartPoint = { x: number; y: number };
type Metric = { label: string; value: string | number; hint: string };
type GameTheme = { key: string; label: string; className: string; accent: string };

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './item-details.html',
  styleUrl: './item-details.scss',
})
export class ItemDetailsPage {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  vm = inject(ItemDetailsViewModel);

  placeholder = 'assets/item-placeholder.svg';
  state$ = this.vm.state$;

  constructor() {
    this.route.paramMap.pipe(
      map(pm => pm.get('id') ?? ''),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(id => {
      if (id) this.vm.load(id);
    });
  }

  toggleTracked() { this.vm.toggleTracked(); }
  setMode(mode: 'pve' | 'regular') { this.vm.setMode(mode); }

  theme(item: ItemDetails): GameTheme {
    const game = String(item.game || '').toLowerCase();
    if (game === 'warframe') return { key: 'warframe', label: 'Warframe market', className: 'theme-warframe', accent: '#7ad7ff' };
    if (game === 'eve') return { key: 'eve', label: 'EVE regional market', className: 'theme-eve', accent: '#ffb347' };
    if (game === 'tarkov') return { key: 'tarkov', label: 'Tarkov flea market', className: 'theme-tarkov', accent: '#b7ff7a' };
    return { key: 'generic', label: 'Market analytics', className: 'theme-generic', accent: '#b7a7ff' };
  }

  metrics(item: ItemDetails): Metric[] {
    const price = item.price;
    const game = String(item.game || '').toLowerCase();
    if (game === 'warframe') {
      return [
        this.metric('Current', price?.pricing?.current, price?.currency),
        this.metric('Top sell', price?.pricing?.top_sell, price?.currency),
        this.metric('Median', price?.analytics?.median, price?.currency),
        { label: 'Orders', value: price?.analytics?.sample_size ?? '—', hint: 'sample size' },
      ];
    }
    if (game === 'eve') {
      return [
        this.metric('Adjusted', price?.pricing?.adjusted_price, price?.currency),
        this.metric('Base', price?.pricing?.base_price, price?.currency),
        this.metric('Spread', price?.pricing?.spread, price?.currency),
        this.metric('High', price?.analytics?.high, price?.currency),
      ];
    }
    if (game === 'tarkov') {
      return [
        this.metric('Top price', item.topPrice ?? price?.pricing?.current, price?.currency),
        this.metric('Low', price?.analytics?.low, price?.currency),
        this.metric('High', price?.analytics?.high, price?.currency),
        { label: 'Mode', value: price?.game_mode || 'regular', hint: 'pricing mode' },
      ];
    }
    return [
      this.metric('Current', price?.pricing?.current, price?.currency),
      this.metric('Median', price?.analytics?.median, price?.currency),
      this.metric('Low', price?.analytics?.low, price?.currency),
      this.metric('High', price?.analytics?.high, price?.currency),
    ];
  }

  chartPoints(item: ItemDetails, kind: 'trend' | 'volume' = 'trend'): ChartPoint[] {
    const price = item.price;
    const seed = hashString(JSON.stringify({ id: item.externalId, game: item.game, pricing: price?.pricing, analytics: price?.analytics, kind }));
    const values = this.baseValues(price);
    const min = Math.max(1, Math.min(...values));
    const max = Math.max(...values, min + 1);
    return Array.from({ length: 18 }, (_, i) => {
      const wave = Math.sin((seed % 19 + i) / 2.4) * 0.18 + Math.cos((seed % 31 + i) / 3.7) * 0.11;
      const noise = ((hashString(`${seed}:${kind}:${i}`) % 100) / 100 - 0.5) * 0.22;
      const anchor = values[i % values.length] || max;
      const raw = kind === 'volume' ? anchor * (0.45 + Math.abs(wave) + Math.abs(noise)) : anchor * (1 + wave + noise);
      const y = 92 - ((raw - min) / (max - min || 1)) * 72;
      return { x: 6 + i * 5.2, y: clamp(y, 10, 92) };
    });
  }

  sparkline(points: ChartPoint[]): string {
    return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  areaPath(points: ChartPoint[]): string {
    if (!points.length) return '';
    return `M ${this.sparkline(points)} L ${points.at(-1)!.x.toFixed(1)},96 L ${points[0].x.toFixed(1)},96 Z`;
  }

  bars(item: ItemDetails): Array<{ x: number; y: number; h: number }> {
    return this.chartPoints(item, 'volume').map((p, i) => ({ x: 7 + i * 5.2, y: p.y, h: 96 - p.y }));
  }

  private metric(label: string, value?: number | string | null, currency?: string): Metric {
    const shown = typeof value === 'number' ? Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) : (value ?? '—');
    return { label, value: shown, hint: currency || 'market' };
  }

  private baseValues(price?: PriceSnapshot | null): number[] {
    const p = price?.pricing;
    const a = price?.analytics;
    const values = [p?.current, p?.top_sell, p?.top_buy, p?.base_price, p?.adjusted_price, p?.spread, a?.low, a?.median, a?.high, a?.sample_size]
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
    return values.length ? values : [24, 31, 28, 39, 35, 44];
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.endsWith(this.placeholder)) return;
    img.src = this.placeholder;
  }
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
