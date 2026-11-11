/**
 * Advanced → CSS ID / CSS classes on builder nodes (band, row, column, widget, kit).
 * Mirrors backend `LayoutNodeAttributes`; values are used unescaped in selectors and attributes.
 */
import { cssSafeBlockId } from './builder-styles';

export type BuilderNodeAttrs = {
  css_id?: string;
  css_classes?: string;
};

const CSS_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const CSS_CLASS_PATTERN = /^-?[A-Za-z_][A-Za-z0-9_-]{0,63}$/;

export const MAX_CSS_CLASSES = 10;

/** Valid id without a leading `#`, or '' (letter first, then letters, digits, `-`, `_`; max 64). */
export function normalizeCssId(raw: unknown): string {
  const id = String(raw ?? '').trim().replace(/^#/, '');
  return CSS_ID_PATTERN.test(id) ? id : '';
}

/** Space-separated valid class names (leading `.` dropped, duplicates removed, max 10), or ''. */
export function normalizeCssClasses(raw: unknown): string {
  const seen = new Set<string>();
  for (const token of String(raw ?? '').split(/\s+/)) {
    const name = token.replace(/^\./, '');
    if (CSS_CLASS_PATTERN.test(name)) seen.add(name);
    if (seen.size >= MAX_CSS_CLASSES) break;
  }
  return [...seen].join(' ');
}

/** The node with its CSS ID / classes replaced; empty values remove the keys. */
export function withBuilderNodeAttrs<T extends BuilderNodeAttrs>(node: T, next: BuilderNodeAttrs): T {
  const { css_id: _id, css_classes: _classes, ...rest } = node;
  const cssId = normalizeCssId(next.css_id);
  const cssClasses = normalizeCssClasses(next.css_classes);
  return {
    ...rest,
    ...(cssId ? { css_id: cssId } : {}),
    ...(cssClasses ? { css_classes: cssClasses } : {}),
  } as T;
}

/**
 * HTML id of a node's styled element: the operator's CSS ID, else `b-{nodeId}`. Custom CSS
 * (`selector`) and dark overrides are scoped to `#{this}` so they keep working with a CSS ID.
 */
export function builderNodeDomId(nodeId: string, cssId?: unknown): string {
  return normalizeCssId(cssId) || `b-${cssSafeBlockId(nodeId)}`;
}
