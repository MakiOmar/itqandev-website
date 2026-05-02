import { component$, useSignal, $ } from '@builder.io/qwik';
import { useLocation, useNavigate } from '@builder.io/qwik-city';
import { useSpeakLocale } from 'qwik-speak';
import { speakConfig } from '~/lib/i18n/config';
import { persistPreferredLocale } from '~/lib/i18n/preferred-locale-persist';
import { getLanguageFlagEmoji } from '~/lib/i18n/language-flags';
import { swapUiLocaleInPathname } from '~/lib/i18n/ui-locale-path';
import type { SiteLanguageRow } from '~/types/site-language';

const supportedSpeakCodes = new Set(speakConfig.supportedLocales.map((l) => l.lang.toLowerCase()));

/**
 * Language switcher driven by site settings (Settings → languages).
 * Only lists locales that exist in qwik-speak (UI translations available).
 * Renders nothing when fewer than two choices.
 */
export const SiteLanguageSwitcher = component$<{ languages: SiteLanguageRow[] | null | undefined }>((props) => {
  const locale = useSpeakLocale();
  const loc = useLocation();
  const nav = useNavigate();
  const isOpen = useSignal(false);

  const options = (props.languages || []).filter(
    (row) => row?.code && supportedSpeakCodes.has(String(row.code).toLowerCase()),
  );

  if (options.length < 2) {
    return null;
  }

  const currentRtl = options.find((o) => o.code.toLowerCase() === locale.lang.toLowerCase())?.rtl ?? false;
  const isRTL = currentRtl || locale.lang === 'ar';

  const toggleDropdown = $(() => {
    isOpen.value = !isOpen.value;
  });

  const closeDropdown = $(() => {
    isOpen.value = false;
  });

  const changeLanguage = $((nextLang: string, rtl: boolean) => {
    persistPreferredLocale(nextLang, rtl);
    locale.lang = nextLang;
    isOpen.value = false;
    const path = swapUiLocaleInPathname(loc.url.pathname, nextLang);
    nav(`${path}${loc.url.search}${loc.url.hash}`);
  });

  const current = options.find((o) => o.code.toLowerCase() === locale.lang.toLowerCase()) ?? options[0];

  return (
    <div class="relative">
      <button
        onClick$={toggleDropdown}
        type="button"
        class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Change language"
      >
        <span class="text-lg leading-none" aria-hidden="true">
          {getLanguageFlagEmoji(current.code)}
        </span>
        <span class="hidden sm:inline">{current.native_label || current.label || current.code}</span>
        <span class="sm:hidden">{String(current.code).toUpperCase()}</span>
        <svg
          class={`h-4 w-4 transition-transform ${isOpen.value ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen.value ? (
        <>
          <div class="fixed inset-0 z-40" onClick$={closeDropdown} />
          <div
            class={`absolute z-50 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 ${
              isRTL ? 'left-0' : 'right-0'
            }`}
          >
            {options.map((row) => {
              const active = locale.lang.toLowerCase() === row.code.toLowerCase();
              return (
                <button
                  key={row.code}
                  type="button"
                  onClick$={() => changeLanguage(row.code, !!row.rtl)}
                  class={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isRTL ? 'text-right' : 'text-left'
                  } ${
                    active
                      ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span class="text-xl leading-none" aria-hidden="true">
                    {getLanguageFlagEmoji(row.code)}
                  </span>
                  <span>{row.native_label || row.label || row.code}</span>
                  {active ? (
                    <svg
                      class={`h-4 w-4 text-blue-600 dark:text-blue-400 ${isRTL ? 'mr-auto' : 'ml-auto'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
});
