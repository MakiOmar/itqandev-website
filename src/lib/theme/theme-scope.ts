/**
 * Light/dark is a class on the nearest theme scope: `<html>` on the public site, or the builder
 * canvas wrapper when the editor previews the other mode. The nearest `.light` / `.dark` wins.
 */

/** Matches an element in dark mode unless a `.light` scope sits between it and the outer `.dark`. */
export const DARK_SCOPE_SELECTOR = ':where(.dark, .dark *):not(:where(.dark .light, .dark .light *))';

export type ThemeMode = 'light' | 'dark';

/** True when the nearest theme scope of `el` (or `<html>`) is dark. Browser only. */
export function isDarkScope(el: Element | null | undefined): boolean {
  if (typeof document === 'undefined') return false;
  const scope = el?.closest('.dark, .light') ?? document.documentElement;
  return scope.classList.contains('dark');
}

/** Theme currently applied to `<html>` (admin and public share the same bootstrap). */
export function documentThemeMode(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Mirror the `<html>` theme into `target` until `pinned` is set (the editor chose a canvas theme).
 * Returns the observer cleanup. Browser only.
 */
export function followAdminTheme(
  target: { value: ThemeMode },
  pinned: { value: boolean },
): () => void {
  if (typeof document === 'undefined') return () => {};
  const sync = () => {
    if (!pinned.value) target.value = documentThemeMode();
  };
  sync();
  const obs = new MutationObserver(sync);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => obs.disconnect();
}
