import type { PageLayoutBand } from '../marketing/appearance-types';

/** Blocks per `kind:type` and per `type`, including one level inside inner bands (max-instances checks). */
export function countBlocksByType(bands: PageLayoutBand[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const band of bands) {
    for (const row of band.rows ?? []) {
      for (const col of row.columns ?? []) {
        for (const block of col.blocks ?? []) {
          const kind = block.kind || 'kit';
          const key = `${kind}:${block.type}`;
          counts[key] = (counts[key] ?? 0) + 1;
          counts[block.type] = (counts[block.type] ?? 0) + 1;
          if (block.type === 'inner_band' && block.rows) {
            for (const row of block.rows) {
              for (const col of row.columns ?? []) {
                for (const nested of col.blocks ?? []) {
                  const nk = `${nested.kind || 'kit'}:${nested.type}`;
                  counts[nk] = (counts[nk] ?? 0) + 1;
                  counts[nested.type] = (counts[nested.type] ?? 0) + 1;
                }
              }
            }
          }
        }
      }
    }
  }
  return counts;
}
