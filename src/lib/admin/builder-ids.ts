/** Random ids for builder nodes. Dependency-free so pure helpers (and their node self-tests) can import it. */

export function newBlockId(type: string): string {
  return `blk_${type}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newColumnId(): string {
  return `col_${Math.random().toString(36).slice(2, 10)}`;
}

export function newRowId(): string {
  return `row_${Math.random().toString(36).slice(2, 10)}`;
}

export function newBandId(): string {
  return `band_${Math.random().toString(36).slice(2, 10)}`;
}
