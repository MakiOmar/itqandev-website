/**
 * Appearance builder media field values: library media id (number) or legacy URL/path string.
 */

export function isAppearanceMediaId(value: unknown): boolean {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return true;
  }
  if (typeof value === 'string') {
    const t = value.trim();
    return /^\d+$/.test(t) && Number(t) > 0;
  }
  return false;
}

export function appearanceMediaId(value: unknown): number | null {
  if (!isAppearanceMediaId(value)) {
    return null;
  }
  return typeof value === 'number' ? value : Number(String(value).trim());
}

/** Preview src for admin UI (URL string or cached URL for a media id). */
export function appearanceMediaPreviewSrc(
  value: unknown,
  urlById?: Record<string, string> | null,
): string {
  if (value == null || value === '') {
    return '';
  }
  const id = appearanceMediaId(value);
  if (id !== null) {
    const fromCache = urlById?.[String(id)]?.trim();
    return fromCache || '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
}

/** Value shown in the optional paste-URL input (blank when value is a media id). */
export function appearanceMediaUrlInputValue(value: unknown): string {
  if (isAppearanceMediaId(value)) {
    return '';
  }
  return typeof value === 'string' ? value : '';
}

/** Collect media ids from one settings object (flat keys + translations bags + floating_icons). */
export function collectAppearanceMediaIdsFromSettings(
  settings: Record<string, unknown> | null | undefined,
): number[] {
  if (!settings || typeof settings !== 'object') {
    return [];
  }
  const ids = new Set<number>();
  for (const [key, value] of Object.entries(settings)) {
    if (key === 'translations') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const bag of Object.values(value as Record<string, unknown>)) {
          if (!bag || typeof bag !== 'object' || Array.isArray(bag)) continue;
          for (const nested of Object.values(bag as Record<string, unknown>)) {
            const id = appearanceMediaId(nested);
            if (id !== null) ids.add(id);
          }
        }
      }
      continue;
    }
    if (key === 'floating_icons' && Array.isArray(value)) {
      for (const row of value) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        const id = appearanceMediaId((row as Record<string, unknown>).media_id);
        if (id !== null) ids.add(id);
      }
      continue;
    }
    const id = appearanceMediaId(value);
    if (id !== null) ids.add(id);
  }
  return Array.from(ids);
}

export function collectAppearanceMediaIdsFromSections(
  sections: Array<{ settings?: Record<string, unknown> } | null | undefined>,
): number[] {
  const ids = new Set<number>();
  for (const section of sections) {
    for (const id of collectAppearanceMediaIdsFromSettings(section?.settings)) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

/** Collect media ids from chrome layout docs (`sections` tree or legacy `zones`). */
export function collectAppearanceMediaIdsFromFooterDoc(doc: {
  sections?: Array<{
    settings?: Record<string, unknown>;
    rows?: Array<{
      columns?: Array<{
        blocks?: Array<{ settings?: Record<string, unknown> }>;
      }>;
    }>;
  }>;
  zones?: Partial<
    Record<
      string,
      {
        columns?: Array<{
          blocks?: Array<{ settings?: Record<string, unknown> }>;
        }>;
      }
    >
  >;
} | null | undefined): number[] {
  const ids = new Set<number>();
  if (Array.isArray(doc?.sections) && doc.sections.length > 0) {
    for (const band of doc.sections) {
      for (const id of collectAppearanceMediaIdsFromSettings(band?.settings)) {
        ids.add(id);
      }
      for (const row of band?.rows ?? []) {
        for (const col of row.columns ?? []) {
          for (const block of col.blocks ?? []) {
            for (const id of collectAppearanceMediaIdsFromSettings(block.settings)) {
              ids.add(id);
            }
          }
        }
      }
    }
    return Array.from(ids);
  }
  if (!doc?.zones) return [];
  for (const zone of Object.values(doc.zones)) {
    if (!zone?.columns) continue;
    for (const col of zone.columns) {
      for (const block of col.blocks ?? []) {
        for (const id of collectAppearanceMediaIdsFromSettings(block.settings)) {
          ids.add(id);
        }
      }
    }
  }
  return Array.from(ids);
}
