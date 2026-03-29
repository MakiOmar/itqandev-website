/**
 * Dashboard UI language is stored as cookie `preferred-locale` (see LanguageSwitcher).
 * Used for SSR API calls and optional explicit parsing.
 */
export function readPreferredLocaleFromCookieHeader(cookieHeader: string | null | undefined): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  const match = cookieHeader.match(/(?:^|;\s*)preferred-locale=([^;]+)/i);
  if (!match?.[1]) {
    return undefined;
  }
  try {
    const v = decodeURIComponent(match[1].trim());
    return v || undefined;
  } catch {
    return match[1].trim() || undefined;
  }
}
