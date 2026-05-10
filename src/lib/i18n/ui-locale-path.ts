import { speakConfig } from './config';
import { readPreferredLocaleFromCookieHeader } from './dashboard-locale';

/** First URL segment for dashboard + marketing UI (qwik-speak locales). */
export const UI_LOCALE_SEGMENTS = new Set(speakConfig.supportedLocales.map((l) => l.lang.toLowerCase()));

const UI_PREFIX_RE = /^\/(en|ar)(?=\/|$)/i;

/**
 * True when pathname already starts with `/en` or `/ar` (optionally after Vite base).
 */
export function pathnameHasUiLocale(pathname: string): boolean {
  return UI_PREFIX_RE.test(pathname || '/');
}

/**
 * Strip `/en` or `/ar` prefix from pathname for route matching (e.g. `/en/admin` → `/admin`).
 */
export function stripUiLocaleFromPathname(pathname: string): string {
  const p = pathname || '/';
  const m = p.match(UI_PREFIX_RE);
  if (!m) {
    return p.startsWith('/') ? p : `/${p}`;
  }
  const rest = p.slice(m[0].length) || '/';
  return rest.startsWith('/') ? rest : `/${rest}`;
}

/**
 * Prefix a path with UI locale (`/admin` → `/en/admin`). Idempotent if already prefixed.
 */
export function withUiLocale(lang: string, path: string): string {
  const code = UI_LOCALE_SEGMENTS.has(String(lang).toLowerCase()) ? String(lang).toLowerCase() : speakConfig.defaultLocale.lang;
  const raw = path.startsWith('/') ? path : `/${path}`;
  if (UI_PREFIX_RE.test(raw)) {
    return raw.replace(UI_PREFIX_RE, `/${code}`);
  }
  if (raw === '/') {
    return `/${code}/`;
  }
  return `/${code}${raw}`;
}

/**
 * Replace the leading UI locale segment (`/en/...` → `/ar/...`).
 */
export function swapUiLocaleInPathname(pathname: string, newLang: string): string {
  const code = UI_LOCALE_SEGMENTS.has(String(newLang).toLowerCase()) ? String(newLang).toLowerCase() : speakConfig.defaultLocale.lang;
  const p = pathname || '/';
  if (UI_PREFIX_RE.test(p)) {
    return p.replace(UI_PREFIX_RE, `/${code}`);
  }
  return withUiLocale(code, stripUiLocaleFromPathname(p));
}

/** Strip Vite/Qwik base path so `/app/en/about` resolves UI locale segment. */
function pathnameAfterBaseUrl(publicPathname: string): string {
  let p = (publicPathname || '/').trim();
  p = p.startsWith('/') ? p : `/${p}`;
  let b = String(import.meta.env.BASE_URL ?? '/').trim();
  if (b.startsWith('./')) {
    b = b.slice(1);
  }
  if (b && b !== '/' && !b.startsWith('/')) {
    b = `/${b}`;
  }
  b = b.endsWith('/') && b.length > 1 ? b.slice(0, -1) : b;
  if (b === '/' || b === '') {
    return p;
  }
  if (p === b || p.startsWith(`${b}/`)) {
    const rest = p === b ? '/' : p.slice(b.length) || '/';
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return p;
}

/**
 * Marketing SSR locale: **`params.lang`** → **`request.url`** path segment → **`preferred-locale` cookie**.
 * Some route loaders omit parent `[lang]` in `params`, and `onRequest` may set the cookie **after**
 * inbound loaders read headers — **`request.url` is always truthful on SSR**.
 */
export function uiLocaleFromPublicRoute(
  cookieHeader: string | null | undefined,
  paramsLang: string | undefined,
  requestUrl?: string | null,
): string | undefined {
  const langSeg = String(paramsLang ?? '').trim().toLowerCase();
  if (UI_LOCALE_SEGMENTS.has(langSeg)) {
    return langSeg;
  }
  if (requestUrl) {
    try {
      const path = pathnameAfterBaseUrl(new URL(requestUrl).pathname);
      const fromPath = uiLangPrefixFromPathname(path);
      if (fromPath) {
        return fromPath;
      }
    } catch {
      /* malformed request.url during tests */
    }
  }
  return readPreferredLocaleFromCookieHeader(cookieHeader ?? '') ?? undefined;
}

/** UI locale from `preferred-locale` cookie (set by `[lang]` layout); for loaders/actions. */
export function uiLangFromPreferredCookie(cookie: { get(name: string): unknown }): string {
  const raw = cookie.get('preferred-locale') as { value?: string } | null | undefined;
  const pref = raw?.value;
  return pref === 'ar' || pref === 'en' ? pref : speakConfig.defaultLocale.lang;
}

/** Leading `/en` or `/ar` segment only; `null` if the path has no UI locale prefix. */
export function uiLangPrefixFromPathname(pathname: string): 'en' | 'ar' | null {
  const m = (pathname || '/').match(UI_PREFIX_RE);
  if (!m) {
    return null;
  }
  return m[1].toLowerCase() === 'ar' ? 'ar' : 'en';
}

/** UI locale from URL (`/en/...`, `/ar/...`); falls back to English when there is no prefix. */
export function uiLangFromUrlPathname(pathname: string): 'en' | 'ar' {
  return uiLangPrefixFromPathname(pathname) ?? 'en';
}
