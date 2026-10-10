import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { PageSectionNode } from '../marketing/appearance-types';
import type { ChromeLayoutKind } from '../../types/chrome-layout';
import { chromeKindRouteSegment } from './chrome-layout-actions';
import { ensurePageLayoutBands } from './page-layout';
import type { PreviewRecordOption } from './content-types';

/** Record whose data fills a theme layout's dynamic tags in the builder canvas. */
export type BuilderPreviewSource = { type: string; recordId: number };

const STORAGE_PREFIX = 'credocode:builder-preview';

function storageKey(kind: ChromeLayoutKind, layoutId: number): string {
  return `${STORAGE_PREFIX}:${kind}:${layoutId}`;
}

/** Last source picked for this layout (per browser), so reopening the builder shows the same data. */
export function readBuilderPreviewSource(kind: ChromeLayoutKind, layoutId: number): BuilderPreviewSource | null {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(kind, layoutId)) ?? 'null') as Partial<BuilderPreviewSource> | null;
    if (raw && typeof raw.type === 'string' && Number.isInteger(raw.recordId)) {
      return { type: raw.type, recordId: Number(raw.recordId) };
    }
  } catch {
    // Storage blocked or corrupt: fall back to the first record.
  }
  return null;
}

export function writeBuilderPreviewSource(
  kind: ChromeLayoutKind,
  layoutId: number,
  source: BuilderPreviewSource | null,
): void {
  try {
    if (source) localStorage.setItem(storageKey(kind, layoutId), JSON.stringify(source));
    else localStorage.removeItem(storageKey(kind, layoutId));
  } catch {
    // Not persisted; the choice still applies for this session.
  }
}

/** Remembered record when it is still listed, else the newest one; 0 means "show tags". */
export function pickPreviewRecordId(records: PreviewRecordOption[], remembered?: number | null): number {
  if (remembered === 0) return 0;
  if (remembered && records.some((row) => row.id === remembered)) return remembered;
  return records[0]?.id ?? 0;
}

/** Present the builder's unsaved sections with the record's dynamic tag values (nothing is saved). */
export async function previewChromeDraftFromBrowser(
  kind: ChromeLayoutKind,
  layoutId: number,
  payload: { contentType: string; recordId: number; locale: string; sections: PageSectionNode[] },
): Promise<PageSectionNode[]> {
  const res = await getApiClient(null).post<{ sections?: PageSectionNode[] }>(
    API_ENDPOINTS.APPEARANCE.PREVIEW_AS(chromeKindRouteSegment(kind), layoutId),
    {
      content_type: payload.contentType,
      record_id: payload.recordId,
      locale: payload.locale,
      sections: payload.sections,
    },
  );
  return ensurePageLayoutBands(Array.isArray(res.data?.sections) ? res.data.sections : []);
}
