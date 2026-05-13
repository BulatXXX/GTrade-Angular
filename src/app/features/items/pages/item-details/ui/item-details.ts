import {Component, DestroyRef, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {map} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {ItemDetailsViewModel} from '../item-details-view-model';
import {ItemDetails, PriceHistoryEntry, PriceSnapshot} from '../../../../../core/models/item';
import {TPipe} from '../../../../../core/i18n/t.pipe';
import {I18nService} from '../../../../../core/i18n/i18n.service';

type ChartPoint = { x: number; y: number; value?: number; date?: string };
type Metric = { labelKey: string; value: string | number; hint?: string; hintKey?: string; synthetic?: boolean; descKey?: string };
type MetricKey = 'current' | 'top_sell' | 'top_buy' | 'median' | 'low' | 'high' | 'base_price' | 'adjusted_price' | 'spread' | 'sample_size' | 'top_price';
type GameTheme = { key: string; labelKey: string; className: string; accent: string };
type AxisLabel = { text: string; pos: number };
type PriceChange = { text: string; up: boolean };
type BarsHeader = {
  labelKey: string;
  value?: string;
  valueKey?: string;
  valueParams?: Record<string, string | number>;
  captionKey: string;
};
type TrendCaption = { key: string; params?: Record<string, string | number> };

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, TPipe],
  templateUrl: './item-details.html',
  styleUrl: './item-details.scss',
})
export class ItemDetailsPage {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private i18n = inject(I18nService);

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
    if (game === 'warframe') return { key: 'warframe', labelKey: 'items.details.theme.warframe', className: 'theme-warframe', accent: '#7ad7ff' };
    if (game === 'eve') return { key: 'eve', labelKey: 'items.details.theme.eve', className: 'theme-eve', accent: '#ffb347' };
    if (game === 'tarkov') return { key: 'tarkov', labelKey: 'items.details.theme.tarkov', className: 'theme-tarkov', accent: '#b7ff7a' };
    return { key: 'generic', labelKey: 'items.details.theme.generic', className: 'theme-generic', accent: '#b7a7ff' };
  }

  metrics(item: ItemDetails): Metric[] {
    const price = item.price;
    const game = String(item.game || '').toLowerCase();
    if (game === 'warframe') {
      return [
        this.resolveMetric(item, 'items.details.metrics.current', 'current', price?.pricing?.current),
        this.resolveMetric(item, 'items.details.metrics.topSell', 'top_sell', price?.pricing?.top_sell),
        this.resolveMetric(item, 'items.details.metrics.median', 'median', price?.analytics?.median),
        this.resolveOrders(item, price?.analytics?.sample_size),
      ];
    }
    if (game === 'eve') {
      return [
        this.resolveMetric(item, 'items.details.metrics.adjusted', 'adjusted_price', price?.pricing?.adjusted_price),
        this.resolveMetric(item, 'items.details.metrics.base', 'base_price', price?.pricing?.base_price),
        this.resolveMetric(item, 'items.details.metrics.spread', 'spread', price?.pricing?.spread),
        this.resolveMetric(item, 'items.details.metrics.high', 'high', price?.analytics?.high),
      ];
    }
    if (game === 'tarkov') {
      return [
        this.resolveMetric(item, 'items.details.metrics.topPrice', 'top_price', item.topPrice ?? price?.pricing?.current),
        this.resolveMetric(item, 'items.details.metrics.low', 'low', price?.analytics?.low),
        this.resolveMetric(item, 'items.details.metrics.high', 'high', price?.analytics?.high),
        {
          labelKey: 'items.details.metrics.mode',
          value: price?.game_mode === 'pve' ? 'PvE' : 'PvP',
          hintKey: 'items.details.metrics.hint.pricingMode',
          descKey: 'items.details.metrics.desc.mode',
        },
      ];
    }
    return [
      this.resolveMetric(item, 'items.details.metrics.current', 'current', price?.pricing?.current),
      this.resolveMetric(item, 'items.details.metrics.median', 'median', price?.analytics?.median),
      this.resolveMetric(item, 'items.details.metrics.low', 'low', price?.analytics?.low),
      this.resolveMetric(item, 'items.details.metrics.high', 'high', price?.analytics?.high),
    ];
  }

  /** Real value when present; else deterministic synthesis around `priceAnchor(item)`. */
  private resolveMetric(item: ItemDetails, labelKey: string, key: MetricKey, real: number | null | undefined): Metric {
    const cur = item.price?.currency;
    const descKey = `items.details.metrics.desc.${this.descId(key)}`;
    if (typeof real === 'number' && Number.isFinite(real)) {
      return { ...this.metric(labelKey, real, cur), descKey };
    }
    const anchor = this.priceAnchor(item);
    if (anchor == null) return { ...this.metric(labelKey, null, cur), descKey };
    const synth = this.synthMetric(this.synthSeed(item), key, anchor);
    return { ...this.metric(labelKey, synth, cur), synthetic: true, descKey };
  }

  private resolveOrders(item: ItemDetails, real: number | null | undefined): Metric {
    const descKey = 'items.details.metrics.desc.orders';
    if (typeof real === 'number' && Number.isFinite(real)) {
      return { labelKey: 'items.details.metrics.orders', value: real, hintKey: 'items.details.metrics.hint.sampleSize', descKey };
    }
    const synth = this.synthMetric(this.synthSeed(item), 'sample_size', this.priceAnchor(item) ?? 1);
    return { labelKey: 'items.details.metrics.orders', value: synth, hintKey: 'items.details.metrics.hint.sampleSize', synthetic: true, descKey };
  }

  /** Top-price line in the page header. Falls back to deterministic synth when both topPrice and current are missing. */
  headerPrice(item: ItemDetails): { value: string; currency: string; synthetic: boolean; descKey: string } {
    const cur = item.price?.currency ?? '';
    const real = item.topPrice ?? item.price?.pricing?.current ?? null;
    if (typeof real === 'number' && Number.isFinite(real)) {
      return { value: this.formatNumber(real), currency: cur, synthetic: false, descKey: 'items.details.metrics.desc.topPrice' };
    }
    const anchor = this.priceAnchor(item);
    if (anchor == null) return { value: '—', currency: cur, synthetic: false, descKey: 'items.details.metrics.desc.topPrice' };
    const synth = this.synthMetric(this.synthSeed(item), 'top_price', anchor);
    return { value: this.formatNumber(synth), currency: cur, synthetic: true, descKey: 'items.details.metrics.desc.topPrice' };
  }

  metricTitle(m: Metric): string {
    if (!m.descKey) return '';
    return this.i18n.t(m.descKey);
  }

  /** Stable seed for hash-based synthesis. Includes game_mode so Tarkov PvP and PvE produce different but consistent values. */
  private synthSeed(item: ItemDetails): string {
    const mode = item.price?.game_mode ?? 'regular';
    return `${item.id}:${mode}`;
  }

  private descId(key: MetricKey): string {
    const map: Record<MetricKey, string> = {
      current: 'current',
      top_sell: 'topSell',
      top_buy: 'topBuy',
      median: 'median',
      low: 'low',
      high: 'high',
      base_price: 'base',
      adjusted_price: 'adjusted',
      spread: 'spread',
      sample_size: 'orders',
      top_price: 'topPrice',
    };
    return map[key];
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  }

  private priceAnchor(item: ItemDetails): number | null {
    const p = item.price?.pricing;
    const a = item.price?.analytics;
    const candidates = [item.topPrice, p?.current, p?.top_sell, p?.adjusted_price, p?.base_price, a?.median, a?.high, a?.low];
    for (const v of candidates) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
    }
    return null;
  }

  /** Hash-based factor in [0,1) — same item+key always produces same factor. */
  private synthFactor(seed: string, key: string): number {
    return (hashString(`${seed}:${key}`) % 10000) / 10000;
  }

  private synthMetric(seed: string, key: MetricKey | string, anchor: number): number {
    if (key === 'sample_size') {
      // Plausible order count 5..200, deterministic.
      return 5 + (hashString(`${seed}:sample_size`) % 196);
    }
    if (key === 'spread') {
      // Spread is a fraction of price (5%..15% of anchor).
      const f = 0.05 + this.synthFactor(seed, 'spread') * 0.10;
      return roundForScale(anchor * f);
    }
    const ranges: Record<string, [number, number]> = {
      current: [0.97, 1.03],
      top_sell: [1.00, 1.10],
      top_buy: [0.85, 0.95],
      median: [0.95, 1.05],
      low: [0.70, 0.92],
      high: [1.10, 1.40],
      base_price: [0.92, 1.05],
      adjusted_price: [0.95, 1.05],
      top_price: [1.00, 1.08],
    };
    const [lo, hi] = ranges[key] ?? [0.92, 1.08];
    const factor = lo + this.synthFactor(seed, key) * (hi - lo);
    return roundForScale(anchor * factor);
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
    const values = this.baseValues(item);
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

  barsHeader(item: ItemDetails): BarsHeader {
    if (this.hasRealHistory(item)) {
      const days = this.dailyHistoryPoints(item.priceHistory!).length;
      return {
        labelKey: 'items.details.bars.dailyPrices',
        valueKey: 'items.details.bars.daysCount',
        valueParams: { count: days },
        captionKey: 'items.details.bars.dailyCaption',
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
        labelKey: 'items.details.bars.openOrders',
        value: orders != null ? this.formatPrice(orders) : '—',
        captionKey: 'items.details.bars.openOrders.caption',
      };
    }
    if (game === 'eve') {
      const spread = p?.spread;
      return {
        labelKey: 'items.details.bars.spread',
        value: spread != null ? this.formatPrice(spread, cur) : '—',
        captionKey: 'items.details.bars.spread.caption',
      };
    }
    if (game === 'tarkov') {
      const low = a?.low;
      const high = a?.high;
      const range = (low != null && high != null) ? high - low : null;
      return {
        labelKey: 'items.details.bars.priceRange',
        value: range != null ? this.formatPrice(range, cur) : '—',
        captionKey: 'items.details.bars.priceRange.caption',
      };
    }
    return {
      labelKey: 'items.details.bars.liquidity',
      value: a?.sample_size != null ? this.formatPrice(a.sample_size) : '—',
      captionKey: 'items.details.bars.liquidity.caption',
    };
  }

  trendCaption(item: ItemDetails): TrendCaption {
    if (this.hasRealHistory(item)) {
      const h = item.priceHistory!;
      const cur = h[0]?.currency ?? '';
      return cur
        ? { key: 'items.details.trend.historyWithCurrency', params: { count: h.length, cur } }
        : { key: 'items.details.trend.history', params: { count: h.length } };
    }
    const cur = item.price?.currency;
    return cur
      ? { key: 'items.details.trend.activityWithCurrency', params: { cur } }
      : { key: 'items.details.trend.activity' };
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

  private metric(labelKey: string, value?: number | string | null, currency?: string): Metric {
    const shown = typeof value === 'number' ? Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) : (value ?? '—');
    return currency
      ? { labelKey, value: shown, hint: currency }
      : { labelKey, value: shown, hintKey: 'items.details.metrics.hint.market' };
  }

  private baseValues(item: ItemDetails): number[] {
    const p = item.price?.pricing;
    const a = item.price?.analytics;
    const values = [p?.current, p?.top_sell, p?.top_buy, p?.base_price, p?.adjusted_price, p?.spread, a?.low, a?.median, a?.high, a?.sample_size]
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
    if (values.length) return values;
    const anchor = this.priceAnchor(item);
    if (anchor == null) return [24, 31, 28, 39, 35, 44];
    return (['low', 'median', 'current', 'top_sell', 'high', 'base_price'] as const)
      .map(k => this.synthMetric(item.id, k, anchor));
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

/** Round to a precision that looks natural for the value scale. */
function roundForScale(value: number): number {
  const abs = Math.abs(value);
  if (abs >= 10000) return Math.round(value / 100) * 100;
  if (abs >= 100) return Math.round(value);
  if (abs >= 1) return Math.round(value * 100) / 100;
  return Math.round(value * 1000) / 1000;
}
