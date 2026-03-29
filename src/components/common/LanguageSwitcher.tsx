import { component$, useSignal, $ } from '@builder.io/qwik';
import { useSpeakLocale, useSpeakConfig } from 'qwik-speak';
import { persistPreferredLocale } from '../../lib/i18n/preferred-locale-persist';

/**
 * Language switcher component
 * Allows users to switch between available languages
 */
export const LanguageSwitcher = component$(() => {
  const locale = useSpeakLocale();
  const config = useSpeakConfig();
  const isOpen = useSignal(false);
  
  // Check if current locale is RTL (Arabic)
  const isRTL = locale.lang === 'ar';

  // Toggle dropdown
  const toggleDropdown = $(() => {
    isOpen.value = !isOpen.value;
  });

  // Close dropdown when clicking outside
  const closeDropdown = $(() => {
    isOpen.value = false;
  });

  // Change language
  const changeLanguage = $((lang: string) => {
    const isRtl = lang === 'ar';
    persistPreferredLocale(lang, isRtl);

    // Update locale using qwik-speak's changeLocale
    // This updates the locale context
    locale.lang = lang;
    
    // Close dropdown
    isOpen.value = false;
    
    // Reload page to apply new language
    // The blocking script in RouterHead will read the cookie/localStorage
    // and set direction immediately before any rendering, ensuring both change simultaneously
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  });

  // Get language display name
  const getLanguageName = (lang: string) => {
    const names: Record<string, string> = {
      en: 'English',
      ar: 'العربية',
    };
    return names[lang] || lang.toUpperCase();
  };

  // Get language flag emoji
  const getLanguageFlag = (lang: string) => {
    const flags: Record<string, string> = {
      en: '🇬🇧',
      ar: '🇸🇦',
    };
    return flags[lang] || '🌐';
  };

  return (
    <>
      {/* Component: LanguageSwitcher */}
      <div class="relative">
        <button
          onClick$={toggleDropdown}
          type="button"
          class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Change language"
        >
          <span class="text-lg">{getLanguageFlag(locale.lang)}</span>
          <span class="hidden sm:inline">{getLanguageName(locale.lang)}</span>
          <svg
            class={`w-4 h-4 transition-transform ${isOpen.value ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isOpen.value && (
          <>
            {/* Backdrop */}
            <div
              class="fixed inset-0 z-40"
              onClick$={closeDropdown}
            />
            
            {/* Dropdown content - RTL aware positioning */}
            <div class={`absolute mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 overflow-hidden ${
              isRTL ? 'left-0' : 'right-0'
            }`}>
              {config.supportedLocales.map((supportedLocale) => (
                <button
                  key={supportedLocale.lang}
                  onClick$={() => changeLanguage(supportedLocale.lang)}
                  type="button"
                  class={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isRTL ? 'text-right' : 'text-left'
                  } ${
                    locale.lang === supportedLocale.lang
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span class="text-xl">{getLanguageFlag(supportedLocale.lang)}</span>
                  <span>{getLanguageName(supportedLocale.lang)}</span>
                  {locale.lang === supportedLocale.lang && (
                    <svg
                      class={`w-4 h-4 text-blue-600 dark:text-blue-400 ${
                        isRTL ? 'mr-auto' : 'ml-auto'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
});
