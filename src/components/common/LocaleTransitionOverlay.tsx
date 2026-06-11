import {
  component$,
  useContextProvider,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import {
  endLocaleTransition,
  LocaleTransitionContext,
  type LocaleTransitionState,
} from '~/lib/i18n/locale-transition';
import { getLanguageFlagEmoji } from '~/lib/i18n/language-flags';

const SWITCHING_MESSAGE: Record<string, string> = {
  en: 'Switching language…',
  ar: 'جاري تبديل اللغة…',
};

const LocaleTransitionOverlayView = component$<{ state: LocaleTransitionState }>((props) => {
  const loc = useLocation();
  const mounted = useSignal(false);
  const fadingOut = useSignal(false);
  const { state } = props;

  // eslint-disable-next-line qwik/no-use-visible-task -- overlay lifecycle tied to client navigation
  useVisibleTask$(({ track }) => {
    track(() => state.active.value);
    track(() => loc.isNavigating);
    track(() => loc.url.pathname);

    if (!state.active.value) {
      mounted.value = false;
      fadingOut.value = false;
      return;
    }

    mounted.value = true;

    const startPath = state.startPath.value;
    const pathChanged = startPath != null && loc.url.pathname !== startPath;
    if (!pathChanged || loc.isNavigating || fadingOut.value) {
      return;
    }

    fadingOut.value = true;
    const timeoutId = window.setTimeout(() => {
      endLocaleTransition(state);
      mounted.value = false;
      fadingOut.value = false;
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  });

  const targetLang = (state.target.value ?? '').toLowerCase();
  const message = SWITCHING_MESSAGE[targetLang] ?? SWITCHING_MESSAGE.en;

  return mounted.value ? (
    <div
      class={[
        'locale-transition-overlay',
        fadingOut.value ? 'locale-transition-overlay--out' : '',
      ]}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div class="locale-transition-overlay__panel">
        <span class="locale-transition-overlay__flag" aria-hidden="true">
          {getLanguageFlagEmoji(targetLang || 'en')}
        </span>
        <div class="locale-transition-overlay__spinner" aria-hidden="true" />
        <p class="locale-transition-overlay__message">{message}</p>
      </div>
    </div>
  ) : null;
});

/**
 * Provides locale-transition context for the public header switcher and renders the overlay.
 */
export const LocaleTransitionProvider = component$(() => {
  const state: LocaleTransitionState = {
    active: useSignal(false),
    target: useSignal<string | null>(null),
    startPath: useSignal<string | null>(null),
  };

  useContextProvider(LocaleTransitionContext, state);

  return <LocaleTransitionOverlayView state={state} />;
});
