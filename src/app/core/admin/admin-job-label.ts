import { AdminJob } from './admin.types';

const GAME_LABELS: Record<string, string> = {
  warframe: 'Warframe',
  eve: 'EVE',
  tarkov: 'Tarkov',
};

export function jobLabel(job: Pick<AdminJob, 'type' | 'meta'> | null | undefined): string {
  if (!job) return '—';
  const type = job.type ?? '';
  const meta = (job.meta ?? {}) as Record<string, unknown>;

  if (type === 'catalog-import') {
    const game = String(meta['game'] ?? '').trim();
    const lang = String(meta['language'] ?? '').trim();
    const limit = String(meta['limit'] ?? '').trim();

    const head = game ? `Import • ${GAME_LABELS[game.toLowerCase()] ?? game}` : 'Import';
    const tail: string[] = [];
    if (lang) tail.push(lang);
    if (limit) tail.push(`limit ${limit}`);
    return tail.length ? `${head} (${tail.join(', ')})` : head;
  }

  if (type === 'price-history-sync') return 'Price history sync';

  return type || '—';
}
