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
    const bounds = this.chartBounds(item);
    if (!bounds) return [];
    const history = item.priceHistory;
    if (history && history.length >= 2) {
      return this.historyToPoints(history, bounds);
    }
    return this.syntheticPoints(item, kind, bounds);
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
    if (h && h.length >= 2) {
      const n = h.length;
      const count = Math.min(5, n);
      const step = (n - 1) / (count - 1);
      return Array.from({ length: count }, (_, i) => {
        const idx = Math.round(i * step);
        return { text: this.shortDate(h[idx].collected_on), pos: (idx / (n - 1)) * 100 };
      });
    }
    const today = new Date();
    const spanDays = 30;
    return [0, 1, 2, 3, 4].map(i => {
      const d = new Date(today);
      d.setDate(today.getDate() - Math.round((4 - i) * spanDays / 4));
      return { text: this.shortDate(d.toISOString()), pos: i * 25 };
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
    const b = this.chartBounds(item);
    if (!b) return [];
    return [
      { text: this.formatPrice(b.hi, b.currency),              pos: 8  },
      { text: this.formatPrice((b.hi + b.lo) / 2, b.currency), pos: 44 },
      { text: this.formatPrice(b.lo, b.currency),              pos: 80 },
    ];
  }

  private chartBounds(item: ItemDetails): { lo: number; hi: number; currency?: string } | null {
    const h = item.priceHistory;
    if (h && h.length >= 2) {
      const values = h.map(p => p.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const pad = (max - min) * 0.1 || max * 0.05 || 1;
      return { lo: min - pad, hi: max + pad, currency: h[0]?.currency };
    }
    const values = this.baseValues(item.price);
    if (!values.length) return null;
    const min = Math.max(0, Math.min(...values));
    const max = Math.max(...values, min + 1);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
    const range = max - min;
    const pad = Math.max(range * 0.35, max * 0.08, 1);
    return { lo: Math.max(0, min - pad), hi: max + pad, currency: item.price?.currency };
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

  bars(item: ItemDetails): Array<{ x: number; y: number; w: number; h: number; up: boolean }> {
    const points = this.hasRealHistory(item)
      ? this.dailyHistoryPoints(item.priceHistory!)
      : this.chartPoints(item, 'bars');
    const n = points.length;
    if (!n) return [];
    const span = 86;
    const slot = span / n;
    const w = Math.max(1.4, Math.min(4.2, slot * 0.62));
    return points.map((p, i) => ({
      x: 7 + i * slot + (slot - w) / 2,
      y: p.y,
      w,
      h: 92 - p.y,
      up: i === 0 ? true : p.value !== undefined && points[i - 1].value !== undefined
        ? (p.value! >= points[i - 1].value!)
        : true,
    }));
  }

  barsHeader(item: ItemDetails): { label: string; value: string; caption: string } {
    if (this.hasRealHistory(item)) {
      const days = this.dailyHistoryPoints(item.priceHistory!).length;
      return {
        label: 'Daily prices',
        value: `${days} ${days === 1 ? 'day' : 'days'}`,
        caption: 'Last close price per day · green = up vs prev, red = down',
      };
    }
    const game = String(item.game ?? '').toLowerCase();
    const price = item.price;
    const a = price?.analytics;
    const p = price?.pricing;
    const cur = price?.currency;

    if (game === 'warframe') {
      const orders = a?.sample_size;
      return {
        label: 'Open orders',
        value: orders != null ? this.formatPrice(orders) : '—',
        caption: 'Active sell orders on the marketplace',
      };
    }
    if (game === 'eve') {
      const spread = p?.spread;
      return {
        label: 'Spread',
        value: spread != null ? this.formatPrice(spread, cur) : '—',
        caption: 'Adjusted-vs-base regional price difference',
      };
    }
    if (game === 'tarkov') {
      const low = a?.low;
      const high = a?.high;
      const range = (low != null && high != null) ? high - low : null;
      return {
        label: 'Price range',
        value: range != null ? this.formatPrice(range, cur) : '—',
        caption: 'Difference between recent flea-market low and high',
      };
    }
    return {
      label: 'Liquidity',
      value: a?.sample_size != null ? this.formatPrice(a.sample_size) : '—',
      caption: 'Snapshot of recent market activity',
    };
  }

  trendCaption(item: ItemDetails): string {
    if (this.hasRealHistory(item)) {
      const h = item.priceHistory!;
      const cur = h[0]?.currency ?? '';
      return `Price${cur ? ` in ${cur}` : ''} across ${h.length} recent observations`;
    }
    const cur = item.price?.currency;
    return `Recent price activity${cur ? ` · ${cur}` : ''}`;
  }

  private dailyHistoryPoints(history: PriceHistoryEntry[]): ChartPoint[] {
    const byDay = new Map<string, PriceHistoryEntry>();
    for (const entry of history) {
      const key = entry.collected_on || entry.collected_at?.slice(0, 10) || '';
      if (!key) continue;
      byDay.set(key, entry);
    }
    const ordered = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, entry]) => entry);
    if (!ordered.length) return [];
    const values = ordered.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.1 || max * 0.05 || 1;
    return this.historyToPoints(ordered, { lo: min - pad, hi: max + pad });
  }

  sparkline(points: ChartPoint[]): string {
    return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  hasRealHistory(item: ItemDetails): boolean {
    return !!(item.priceHistory && item.priceHistory.length >= 2);
  }

  private historyToPoints(history: PriceHistoryEntry[], bounds: { lo: number; hi: number }): ChartPoint[] {
    const span = bounds.hi - bounds.lo || 1;
    const n = history.length;
    return history.map((h, i) => ({
      x: 4 + (i / Math.max(n - 1, 1)) * 92,
      y: clamp(8 + (1 - (h.value - bounds.lo) / span) * 72, 8, 80),
      value: h.value,
      date: h.collected_on,
    }));
  }

  private syntheticPoints(item: ItemDetails, kind: 'trend' | 'bars', bounds: { lo: number; hi: number }): ChartPoint[] {
    const price = item.price;
    const seed = hashString(JSON.stringify({ id: item.externalId, game: item.game, pricing: price?.pricing, analytics: price?.analytics, kind }));
    const span = bounds.hi - bounds.lo || 1;
    const center = (bounds.lo + bounds.hi) / 2;
    const halfSpan = span / 2;
    return Array.from({ length: 18 }, (_, i) => {
      const wave = Math.sin((seed % 19 + i) / 2.4) * 0.6 + Math.cos((seed % 31 + i) / 3.7) * 0.32;
      const noise = ((hashString(`${seed}:${kind}:${i}`) % 100) / 100 - 0.5) * 0.45;
      const drift = (wave + noise) * 0.78;
      const raw = kind === 'bars'
        ? bounds.lo + span * (0.32 + Math.abs(wave) * 0.5 + Math.abs(noise) * 0.3)
        : center + halfSpan * drift;
      const y = 8 + (1 - (raw - bounds.lo) / span) * 72;
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
