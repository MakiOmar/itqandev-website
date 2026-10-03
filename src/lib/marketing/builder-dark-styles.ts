import { DARK_SCOPE_SELECTOR } from '~/lib/theme/theme-scope';
import {
  BUTTON_PARTS,
  CASE_CARD_STYLE_KEYS,
  HERO_STYLE_KEYS,
  TESTIMONIAL_STYLE_KEYS,
  cssSafeBlockId,
  type BuilderStyles,
  type StyleBag,
  type StyleShadow,
} from './builder-styles';

/**
 * Dark-mode overrides (`styles.dark`): colours and shadows only, one bag for every breakpoint.
 * Resolution in dark mode: dark override → light custom value → widget theme default.
 * Mirrors `BuilderStyleDocument::colorKind` / `THEME_SENTINEL` on the backend.
 */

export type ColorStyleKind = 'color' | 'shadow';

/** Dark-bag value that resets a key to the widget's theme default (emitted as `initial`). */
export const DARK_THEME_SENTINEL = 'theme';

const BASE_COLOR_KEYS = [
  'border_color', 'caption_color', 'text_color', 'icon_color', 'glow_primary_color', 'glow_secondary_color',
  'tab_color', 'tab_bg', 'tab_hover_color', 'tab_hover_bg', 'tab_active_color', 'tab_active_bg',
  'tab_indicator_color', 'nav_color', 'nav_bg', 'nav_border_color', 'nav_hover_color', 'nav_hover_bg',
  'link_color', 'link_hover_color', 'title_color', 'subtitle_color',
];
const BASE_SHADOW_KEYS = ['box_shadow', 'hover_box_shadow'];
const BUTTON_COLOR_SUFFIXES = ['color', 'bg', 'border_color', 'hover_color', 'hover_bg', 'hover_border_color'];
const BUTTON_SHADOW_SUFFIXES = ['shadow', 'hover_shadow'];

const COLOR_STYLE_KINDS: ReadonlyMap<string, ColorStyleKind> = (() => {
  const map = new Map<string, ColorStyleKind>();
  for (const key of BASE_COLOR_KEYS) map.set(key, 'color');
  for (const key of BASE_SHADOW_KEYS) map.set(key, 'shadow');
  for (const [key, kind] of Object.entries({ ...CASE_CARD_STYLE_KEYS, ...TESTIMONIAL_STYLE_KEYS, ...HERO_STYLE_KEYS })) {
    if (kind === 'color' || kind === 'shadow') map.set(key, kind);
  }
  for (const part of BUTTON_PARTS) {
    for (const s of BUTTON_COLOR_SUFFIXES) map.set(`${part}_${s}`, 'color');
    for (const s of BUTTON_SHADOW_SUFFIXES) map.set(`${part}_${s}`, 'shadow');
  }
  return map;
})();

/** `color` / `shadow` when a dark bag may override `key`, otherwise null. */
export function colorStyleKind(key: string): ColorStyleKind | null {
  return COLOR_STYLE_KINDS.get(key) ?? null;
}

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_RE = /^rgba?\(\s*[\d.]+(?:\s*,\s*[\d.]+){2,3}\s*\)$/i;
export const KIT_COLOR_VAR_RE = /^var\(--kit-color-[a-z0-9_-]{1,40}\)$/;

/** Strict colour check before a value reaches a `<style>` element (backend validates too). */
export function safeCssColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return HEX_RE.test(s) || RGB_RE.test(s) || KIT_COLOR_VAR_RE.test(s) ? s : null;
}

function finite(n: unknown): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function safeShadow(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Partial<StyleShadow>;
  const color = safeCssColor(v.color);
  const h = finite(v.h);
  const y = finite(v.v);
  const blur = finite(v.blur);
  const spread = finite(v.spread) ?? 0;
  if (!color || h === null || y === null || blur === null) return null;
  return `${v.inset === true ? 'inset ' : ''}${h}px ${y}px ${blur}px ${spread}px ${color}`;
}

export function darkStyleBag(styles?: BuilderStyles | null): StyleBag {
  const dark = styles?.dark;
  return dark && typeof dark === 'object' && !Array.isArray(dark) ? dark : {};
}

export function hasDarkStyles(styles?: BuilderStyles | null): boolean {
  return Object.keys(darkStyleBag(styles)).length > 0;
}

/** CSS value for one dark override, or null when invalid. */
function darkValueCss(key: string, value: unknown): string | null {
  const kind = colorStyleKind(key);
  if (!kind) return null;
  if (value === DARK_THEME_SENTINEL) return 'initial';
  return kind === 'color' ? safeCssColor(value) : safeShadow(value);
}

/**
 * Scoped `<style>` body for a node's dark overrides. Re-declares the base, `-md` and `-lg` vars
 * with `!important` so they beat the inline light vars at every breakpoint; `initial` makes
 * `var(--s-x, default)` fall through to the widget's theme default.
 */
export function builderDarkStyleCss(nodeId: string, styles?: BuilderStyles | null): string | null {
  const decls: string[] = [];
  for (const [key, value] of Object.entries(darkStyleBag(styles))) {
    const css = darkValueCss(key, value);
    if (css === null) continue;
    const name = `--s-${key.replace(/_/g, '-')}`;
    decls.push(`${name}:${css}!important`, `${name}-md:${css}!important`, `${name}-lg:${css}!important`);
  }
  if (decls.length === 0) return null;
  return `#b-${cssSafeBlockId(nodeId)}${DARK_SCOPE_SELECTOR}{${decls.join(';')}}`;
}
