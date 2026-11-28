import { useSignal, useTask$, type Signal } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { uiLangFromUrlPathname } from '../i18n/ui-locale-path';
import type { SiteLanguageRow } from '../../types/site-language';

/**
 * Keep a content-locale signal on the dashboard URL language (`/ar/admin/...`).
 * An explicit `?locale=` (builder deep link) is left alone.
 * Runs once per path once site languages are known, so a manual language pick on the
 * form is not reset until the operator switches the dashboard language.
 */
export function useFollowDashboardLocale(
  locale: Signal<string>,
  siteLanguages: SiteLanguageRow[] | null | undefined,
) {
  const location = useLocation();
  const appliedPath = useSignal('');

  useTask$(({ track }) => {
    const path = track(() => location.url.pathname);
    const codes = track(() =>
      (siteLanguages ?? [])
        .map((row) => String(row?.code ?? '').toLowerCase())
        .filter(Boolean)
        .join('|'),
    );
    const explicit = location.url.searchParams.get('locale');
    if (explicit && explicit.trim() !== '') {
      return;
    }
    const known = new Set(codes.split('|').filter(Boolean));
    const next = uiLangFromUrlPathname(path).toLowerCase();
    if (known.size === 0 || !known.has(next)) {
      return;
    }
    if (appliedPath.value === path) {
      return;
    }
    appliedPath.value = path;
    if (locale.value.toLowerCase() !== next) {
      locale.value = next;
    }
  });
}
