import { component$ } from '@builder.io/qwik';
import { getLanguageFlagSrc } from '~/lib/i18n/language-flags';

/**
 * Decorative 4:3 flag for a language code. Uses self-hosted SVGs (emoji flags
 * have no glyphs on Windows); unmapped codes get a globe icon.
 */
export const LanguageFlag = component$<{ lang: string; class?: string }>((props) => {
  const src = getLanguageFlagSrc(props.lang);
  const sizeClass = props.class ?? 'h-3.5 w-[1.167rem]';

  if (!src) {
    return (
      <svg
        class={`${sizeClass} shrink-0`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        {/* Globe fallback */}
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={20}
      height={15}
      decoding="async"
      class={`${sizeClass} shrink-0 rounded-sm object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)]`}
    />
  );
});
