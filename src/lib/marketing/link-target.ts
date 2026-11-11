/**
 * Link target for builder widgets that store `open_in_new_tab` (button, button group, image link,
 * social links), shown in the inspector as Link target: current window (`_self`) / new window (`_blank`).
 */

export function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/** `#id` links point into the current page; a new window would load the page again instead of scrolling. */
export function isSamePageAnchor(href: string): boolean {
  return href.trim().startsWith('#');
}

/**
 * `target` / `rel` attributes. New-window links always get `noopener noreferrer` so the opened page
 * can't reach `window.opener`; extra `rel` tokens (e.g. `nofollow`) are kept.
 */
export function linkTargetAttrs(href: string, openInNewTab: unknown, rel: unknown = ''): { target?: string; rel?: string } {
  const newWindow = isTruthyFlag(openInNewTab) && !isSamePageAnchor(href);
  const tokens = new Set(
    String(rel ?? '')
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => /^[a-z-]+$/.test(t)),
  );
  if (newWindow) {
    tokens.add('noopener');
    tokens.add('noreferrer');
  }
  const relValue = [...tokens].join(' ');
  return { ...(newWindow ? { target: '_blank' } : {}), ...(relValue ? { rel: relValue } : {}) };
}
