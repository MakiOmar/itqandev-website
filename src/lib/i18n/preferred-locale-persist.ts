/**
 * Persists UI locale for SSR (cookie), client (localStorage), and document direction (RTL cookie).
 * Used by dashboard and public language switchers.
 */
export function persistPreferredLocale(lang: string, isRtl: boolean): void {
  const code = String(lang || 'en')
    .trim()
    .toLowerCase();
  const rtlFlag = isRtl ? '1' : '0';

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('preferred-locale', code);
    localStorage.setItem('preferred-locale-rtl', rtlFlag);
  }

  if (typeof document === 'undefined') {
    return;
  }

  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  const exp = expirationDate.toUTCString();
  document.cookie = `preferred-locale=${encodeURIComponent(code)}; path=/; expires=${exp}; SameSite=Lax`;
  document.cookie = `preferred-locale-rtl=${rtlFlag}; path=/; expires=${exp}; SameSite=Lax`;

  const dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', code);
  if (document.body) {
    document.body.setAttribute('dir', dir);
    document.body.setAttribute('lang', code);
  }
}
