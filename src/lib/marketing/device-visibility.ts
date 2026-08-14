/**
 * Device visibility for layout builders (Elementor-style Advanced → Responsive).
 * Hidden nodes are omitted from the rendered tree (not CSS display:none).
 */
import { UAParser } from 'ua-parser-js';
import type { DeviceHideOn, LayoutBreakpoint, PageLayoutBand } from './appearance-types';
import { isPageLayoutBand } from './page-layout-utils';
import type { PageSectionNode } from './appearance-types';

export type { DeviceHideOn };

export function emptyHideOn(): Required<DeviceHideOn> {
  return { mobile: false, tablet: false, desktop: false };
}

export function normalizeHideOn(raw: unknown): Required<DeviceHideOn> {
  const base = emptyHideOn();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return base;
  }
  const o = raw as Record<string, unknown>;
  return {
    mobile: o.mobile === true || o.mobile === 1 || o.mobile === '1' || o.mobile === 'true',
    tablet: o.tablet === true || o.tablet === 1 || o.tablet === '1' || o.tablet === 'true',
    desktop: o.desktop === true || o.desktop === 1 || o.desktop === '1' || o.desktop === 'true',
  };
}

/** True when the node should not be rendered for this device. */
export function isHiddenOnDevice(
  hideOn: unknown,
  device: LayoutBreakpoint,
): boolean {
  const h = normalizeHideOn(hideOn);
  return h[device] === true;
}

export function isLayoutNodeVisibleOnDevice(
  node: { enabled?: boolean; hide_on?: unknown } | null | undefined,
  device: LayoutBreakpoint,
): boolean {
  if (!node) return false;
  if (node.enabled === false) return false;
  return !isHiddenOnDevice(node.hide_on, device);
}

/**
 * Map User-Agent → builder breakpoint via ua-parser-js.
 * Tablets → tablet; phones → mobile; everything else → desktop.
 */
export function detectLayoutBreakpointFromUserAgent(
  userAgent: string | null | undefined,
): LayoutBreakpoint {
  const ua = typeof userAgent === 'string' ? userAgent : '';
  if (!ua.trim()) return 'desktop';
  try {
    const result = new UAParser(ua).getResult();
    const type = String(result.device?.type || '').toLowerCase();
    if (type === 'mobile') return 'mobile';
    if (type === 'tablet') return 'tablet';
    // Some UAs expose wearable/embedded; treat as mobile when clearly phone-like.
    if (type === 'wearable') return 'mobile';
  } catch {
    // fall through
  }
  return 'desktop';
}

/** Filter a page-layout band tree for the active device (omit hidden nodes). */
export function filterPageLayoutBandForDevice(
  band: PageLayoutBand,
  device: LayoutBreakpoint,
): PageLayoutBand | null {
  if (!isLayoutNodeVisibleOnDevice(band, device)) return null;

  const rows = (band.rows || [])
    .map((row) => {
      if (!isLayoutNodeVisibleOnDevice(row, device)) return null;
      const columns = (row.columns || [])
        .map((col) => {
          if (!isLayoutNodeVisibleOnDevice(col, device)) return null;
          const blocks = (col.blocks || []).filter((b) =>
            isLayoutNodeVisibleOnDevice(b, device),
          );
          if (blocks.length === 0) return null;
          return { ...col, blocks };
        })
        .filter((c): c is NonNullable<typeof c> => c != null);
      if (columns.length === 0) return null;
      return { ...row, columns };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  if (rows.length === 0) return null;
  return { ...band, rows };
}

/** Filter flat or layout section lists for public/admin preview render. */
export function filterPageSectionsForDevice(
  sections: PageSectionNode[] | null | undefined,
  device: LayoutBreakpoint,
): PageSectionNode[] {
  if (!sections?.length) return [];
  const out: PageSectionNode[] = [];
  for (const node of sections) {
    if (isPageLayoutBand(node)) {
      const filtered = filterPageLayoutBandForDevice(node, device);
      if (filtered) out.push(filtered);
      continue;
    }
    if (isLayoutNodeVisibleOnDevice(node, device)) {
      out.push(node);
    }
  }
  return out;
}
