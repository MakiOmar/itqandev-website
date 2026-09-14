import type { PageLayoutBand } from '~/lib/marketing/appearance-types';

const STORAGE_KEY = 'cc-saved-builder-bands';

export type SavedBuilderBand = {
  id: string;
  name: string;
  band: PageLayoutBand;
};

function readRaw(): SavedBuilderBand[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as SavedBuilderBand[]) : [];
  } catch {
    return [];
  }
}

export function listSavedBuilderBands(): SavedBuilderBand[] {
  return readRaw().slice(0, 24);
}

export function saveBuilderBand(name: string, band: PageLayoutBand): SavedBuilderBand[] {
  const next: SavedBuilderBand[] = [
    {
      id: `saved_${Date.now()}`,
      name: name.trim() || 'Saved section',
      band: JSON.parse(JSON.stringify(band)) as PageLayoutBand,
    },
    ...readRaw(),
  ].slice(0, 24);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeSavedBuilderBand(id: string): SavedBuilderBand[] {
  const next = readRaw().filter((row) => row.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
