/**
 * Light/dark is a class on the nearest theme scope: `<html>` on the public site, or the builder
 * canvas wrapper when the editor previews the other mode. The nearest `.light` / `.dark` wins.
 */

/** Matches an element in dark mode unless a `.light` scope sits between it and the outer `.dark`. */
export const DARK_SCOPE_SELECTOR = ':where(.dark, .dark *):not(:where(.dark .light, .dark .light *))';

export type ThemeMode = 'light' | 'dark';

/** Settings → Branding: theme for visitors who never toggled; `system` follows `prefers-color-scheme`. */
export type SiteDefaultTheme = ThemeMode | 'system';

/**
 * Only an explicit toggle is stored here, so a changed site default still reaches visitors who never chose.
 * (The older `theme` key also held auto-detected values, so it is ignored.)
 */
export const THEME_PREFERENCE_KEY = 'theme-preference';

export function parseSiteDefaultTheme(raw: unknown): SiteDefaultTheme {
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

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

/** Flip the `<html>` theme and persist it under the key the head bootstrap script reads. Browser only. */
export function toggleDocumentTheme(): ThemeMode {
  const next: ThemeMode = documentThemeMode() === 'dark' ? 'light' : 'dark';
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(next);
  try {
    localStorage.setItem(THEME_PREFERENCE_KEY, next);
  } catch {
    /* storage blocked (private mode): the class change still applies for this page */
  }
  return next;
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
