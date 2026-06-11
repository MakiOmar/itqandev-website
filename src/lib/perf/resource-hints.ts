import { getConfig } from '~/lib/config';
import { laravelPublicOrigin } from '~/lib/marketing/resolve-laravel-media-url';
import { shouldDisableGoogleFontsForPath } from '~/lib/perf/google-fonts-policy';

export type ResourceHintLink = {
  href: string;
  /** Required for cross-origin font files and credentialed API/storage fetches. */
  crossOrigin?: boolean;
};

function tryOrigin(url: string | undefined | null): string | null {
  const raw = (url ?? '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return null;
  }
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function envOrigin(key: string): string | null {
  const v = import.meta.env?.[key];
  return tryOrigin(typeof v === 'string' ? v : null);
}

/**
 * Origins for `<link rel="preconnect">` in the document head.
 *
 * @param documentOrigin - Current page origin; skips preconnect to self (same-origin /api).
 */
export function collectPreconnectHints(
  documentOrigin?: string | null,
  pathname?: string | null,
): ResourceHintLink[] {
  const seen = new Set<string>();
  const hints: ResourceHintLink[] = [];
  const disableGoogleFonts =
    pathname != null ? shouldDisableGoogleFontsForPath(pathname) : false;

  const add = (href: string, crossOrigin = false) => {
    if (!href) {
      return;
    }
    const key = crossOrigin ? `${href}|c` : href;
    if (seen.has(key)) {
      return;
    }
    if (documentOrigin && href === documentOrigin) {
      return;
    }
    seen.add(key);
    hints.push(crossOrigin ? { href, crossOrigin: true } : { href });
  };

  // Google Fonts (CSS on googleapis.com, files on gstatic.com)
  if (!disableGoogleFonts) {
    add('https://fonts.googleapis.com');
    add('https://fonts.gstatic.com', true);
  }

  const apiOrigin = tryOrigin(getConfig().api.baseUrl?.trim());
  if (apiOrigin) {
    add(apiOrigin, true);
  }

  const laravel = tryOrigin(laravelPublicOrigin() || undefined);
  if (laravel) {
    add(laravel, true);
  }

  for (const key of ['VITE_API_PROXY_TARGET', 'VITE_SSR_API_BASE_URL'] as const) {
    const origin = envOrigin(key);
    if (origin) {
      add(origin, true);
    }
  }

  return hints;
}
