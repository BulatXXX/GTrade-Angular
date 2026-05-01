// src/app/core/services/sync.compare.ts
import {TrackedItem} from '../models/item';

export type DiffRow = {
  id: string;
  iconLink: string | null;
  local?: TrackedItem | null;
  server?: TrackedItem | null;
  kind: 'onlyLocal' | 'onlyServer' | 'conflict';
  winner?: 'local' | 'server';
};

export type SyncCompare = {
  localCount: number;
  serverCount: number;
  inSync: boolean;
  onlyLocal: DiffRow[];
  onlyServer: DiffRow[];
  conflicts: DiffRow[];
};

export function normalizeTracked(x: TrackedItem): TrackedItem {
  return {
    id: String(x?.id ?? ''),
    iconLink: x?.iconLink ? String(x.iconLink) : null,
    updatedAt: Number(x?.updatedAt ?? Date.now()),
  };
}

export function buildCompare(localRaw: TrackedItem[], serverRaw: TrackedItem[]): SyncCompare {
  const local = (localRaw ?? []).map(normalizeTracked).filter(x => x.id);
  const server = (serverRaw ?? []).map(normalizeTracked).filter(x => x.id);

  const lMap = new Map(local.map(x => [x.id, x] as const));
  const sMap = new Map(server.map(x => [x.id, x] as const));

  const ids = new Set<string>([...lMap.keys(), ...sMap.keys()]);

  const onlyLocal: DiffRow[] = [];
  const onlyServer: DiffRow[] = [];
  const conflicts: DiffRow[] = [];

  for (const id of ids) {
    const l = lMap.get(id) ?? null;
    const s = sMap.get(id) ?? null;

    if (l && !s) {
      onlyLocal.push({ id, iconLink: l.iconLink, local: l, server: null, kind: 'onlyLocal' });
      continue;
    }
    if (!l && s) {
      onlyServer.push({ id, iconLink: s.iconLink, local: null, server: s, kind: 'onlyServer' });
      continue;
    }
    if (l && s) {
      const conflict =
        l.updatedAt !== s.updatedAt ||
        (l.iconLink ?? null) !== (s.iconLink ?? null);

      if (conflict) {
        const winner: 'local' | 'server' = l.updatedAt >= s.updatedAt ? 'local' : 'server';
        conflicts.push({
          id,
          iconLink: l.iconLink ?? s.iconLink ?? null,
          local: l,
          server: s,
          kind: 'conflict',
          winner,
        });
      }
    }
  }

  const sortByTimeDesc = (a: DiffRow, b: DiffRow) => {
    const ta = a.local?.updatedAt ?? a.server?.updatedAt ?? 0;
    const tb = b.local?.updatedAt ?? b.server?.updatedAt ?? 0;
    return tb - ta;
  };

  return {
    localCount: local.length,
    serverCount: server.length,
    inSync: onlyLocal.length === 0 && onlyServer.length === 0 && conflicts.length === 0,
    onlyLocal: onlyLocal.sort(sortByTimeDesc),
    onlyServer: onlyServer.sort(sortByTimeDesc),
    conflicts: conflicts.sort(sortByTimeDesc),
  };
}
