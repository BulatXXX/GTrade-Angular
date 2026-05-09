import {Component, DestroyRef, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {map} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {ItemDetailsViewModel} from '../item-details-view-model';
import {ItemDetails, PriceHistoryEntry, PriceSnapshot} from '../../../../../core/models/item';

type ChartPoint = { x: number; y: number; value?: number; date?: string };
type Metric = { label: string; value: string | number; hint: string };
type GameTheme = { key: string; label: string; className: string; accent: string };
type AxisLabel = { text: string; pos: number };
type PriceChange = { text: string; up: boolean };

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

  chartPoints(item: ItemDetails, kind: 'trend' | 'bars' = 'trend'): ChartPoint[] {
    const history = item.priceHistory;
    if (history && history.length >= 2) {
      return this.historyToPoints(history);
    }
    return this.syntheticPoints(item, kind);
  }

  smoothPath(points: ChartPoint[]): string {
    if (points.length < 2) return '';
    let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const t = 0.22;
      const cp1x = p1.x + (p2.x - p0.x) * t;
      const cp1y = p1.y + (p2.y - p0.y) * t;
      const cp2x = p2.x - (p3.x - p1.x) * t;
      const cp2y = p2.y - (p3.y - p1.y) * t;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  areaPath(points: ChartPoint[]): string {
    if (!points.length) return '';
    const line = this.smoothPath(points);
    return `${line} L ${points[points.length - 1].x.toFixed(1)},100 L ${points[0].x.toFixed(1)},100 Z`;
  }

  xLabels(item: ItemDetails): AxisLabel[] {
    const h = item.priceHistory;
    if (!h || h.length < 2) return [];
    const n = h.length;
    const count = Math.min(5, n);
    const step = (n - 1) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round(i * step);
      return { text: this.shortDate(h[idx].collected_on), pos: (idx / (n - 1)) * 100 };
    });
  }

  priceChange(item: ItemDetails): PriceChange | null {
    const h = item.priceHistory;
    if (!h || h.length < 2) return null;
    const first = h[0].value;
    const last = h[h.length - 1].value;
    if (!first) return null;
    const pct = ((last - first) / first) * 100;
    return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, up: pct >= 0 };
  }

  yLabels(item: ItemDetails): Array<{ text: string; pos: number }> {
    const r = this.chartRange(item);
    if (!r) return [];
    const pad = (r.max - r.min) * 0.1 || r.max * 0.05 || 1;
    const lo = r.min - pad;
    const hi = r.max + pad;
    return [
      { text: this.formatPrice(hi, r.currency),            pos: 8  },
      { text: this.formatPrice((hi + lo) / 2, r.currency), pos: 44 },
      { text: this.formatPrice(lo, r.currency),            pos: 80 },
    ];
  }

  private chartRange(item: ItemDetails): { min: number; max: number; currency?: string } | null {
    const h = item.priceHistory;
    if (h && h.length >= 2) {
      const values = h.map(p => p.value);
      return { min: Math.min(...values), max: Math.max(...values), currency: h[0]?.currency };
    }
    const values = this.baseValues(item.price);
    if (!values.length) return null;
    const min = Math.max(0, Math.min(...values));
    const max = Math.max(...values, min + 1);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
    return { min, max, currency: item.price?.currency };
  }

  endpointBadges(item: ItemDetails): { first?: { x: number; y: number; price: string; date: string }; last?: { x: number; y: number; price: string; date: string } } {
    const h = item.priceHistory;
    if (!h || h.length < 2) return {};
    const points = this.chartPoints(item, 'trend');
    if (points.length < 2) return {};
    const cur = h[0]?.currency || '';
    return {
      first: {
        x: points[0].x,
        y: points[0].y,
        price: this.formatPrice(h[0].value, cur),
        date: this.shortDate(h[0].collected_on),
      },
      last: {
        x: points[points.length - 1].x,
        y: points[points.length - 1].y,
        price: this.formatPrice(h[h.length - 1].value, cur),
        date: this.shortDate(h[h.length - 1].collected_on),
      },
    };
  }

  private formatPrice(value: number, currency?: string): string {
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const formatted = new Intl.NumberFormat('en-US', {
      notation: abs >= 10000 ? 'compact' : 'standard',
      maximumFractionDigits: abs >= 100 ? 0 : 2,
    }).format(value);
    return currency ? `${formatted} ${currency}` : formatted;
  }

  bars(item: ItemDetails): Array<{ x: number; y: number; h: number; up: boolean }> {
    const points = this.chartPoints(item, 'bars');
    return points.map((p, i) => ({
      x: 7 + i * (86 / Math.max(points.length - 1, 1)),
      y: p.y,
      h: 92 - p.y,
      up: i === 0 ? true : p.value !== undefined && points[i - 1].value !== undefined
        ? (p.value! >= points[i - 1].value!)
        : true,
    }));
  }

  sparkline(points: ChartPoint[]): string {
    return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  hasRealHistory(item: ItemDetails): boolean {
    return !!(item.priceHistory && item.priceHistory.length >= 2);
  }

  private historyToPoints(history: PriceHistoryEntry[]): ChartPoint[] {
    const values = history.map(h => h.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.1 || max * 0.05 || 1;
    const lo = min - pad;
    const hi = max + pad;
    const n = history.length;
    return history.map((h, i) => ({
      x: 4 + (i / Math.max(n - 1, 1)) * 92,
      y: clamp(8 + (1 - (h.value - lo) / (hi - lo)) * 72, 8, 80),
      value: h.value,
      date: h.collected_on,
    }));
  }

  private syntheticPoints(item: ItemDetails, kind: 'trend' | 'bars'): ChartPoint[] {
    const price = item.price;
    const seed = hashString(JSON.stringify({ id: item.externalId, game: item.game, pricing: price?.pricing, analytics: price?.analytics, kind }));
    const values = this.baseValues(price);
    const min = Math.max(0, Math.min(...values));
    const max = Math.max(...values, min + 1);
    const pad = (max - min) * 0.1 || max * 0.05 || 1;
    const lo = min - pad;
    const hi = max + pad;
    return Array.from({ length: 18 }, (_, i) => {
      const wave = Math.sin((seed % 19 + i) / 2.4) * 0.18 + Math.cos((seed % 31 + i) / 3.7) * 0.11;
      const noise = ((hashString(`${seed}:${kind}:${i}`) % 100) / 100 - 0.5) * 0.22;
      const anchor = values[i % values.length] || max;
      const raw = kind === 'bars' ? anchor * (0.45 + Math.abs(wave) + Math.abs(noise)) : anchor * (1 + wave + noise);
      const y = 8 + (1 - (raw - lo) / (hi - lo || 1)) * 72;
      return { x: 4 + i * 5.2, y: clamp(y, 8, 80), value: raw };
    });
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

  private shortDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
