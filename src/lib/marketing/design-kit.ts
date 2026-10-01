/** Design-kit global colours as exposed by `GET /api/public/site-meta` (`design_kit`, `design_kit_css`). */

export type KitColorToken = {
  id: string;
  name: string;
  light: string;
  /** Empty when dark mode uses the light value. */
  dark: string;
};

export const KIT_BASE_COLORS = ['primary', 'secondary', 'text', 'accent', 'muted'] as const;

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const ID_RE = /^[a-z0-9_-]{1,40}$/;

function hex(value: unknown): string {
  const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return HEX_RE.test(s) ? s : '';
}

export function kitColorVar(id: string): string {
  return `var(--kit-color-${id})`;
}

/** Normalised token list (base colours first, then custom); unknown or unsafe entries are skipped. */
export function parseKitColors(raw: unknown): KitColorToken[] {
  const kit = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const colors = kit.colors && typeof kit.colors === 'object' ? (kit.colors as Record<string, unknown>) : {};
  const dark = kit.colors_dark && typeof kit.colors_dark === 'object' ? (kit.colors_dark as Record<string, unknown>) : {};
  const out: KitColorToken[] = [];
  for (const id of KIT_BASE_COLORS) {
    const light = hex(colors[id]);
    if (light) out.push({ id, name: id, light, dark: hex(dark[id]) });
  }
  for (const row of Array.isArray(colors.custom) ? colors.custom : []) {
    const token = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    const id = typeof token.id === 'string' ? token.id : '';
    const light = hex(token.value);
    if (!ID_RE.test(id) || !light) continue;
    out.push({ id, name: typeof token.name === 'string' && token.name.trim() ? token.name.trim() : id, light, dark: hex(dark[id]) });
  }
  return out;
}
