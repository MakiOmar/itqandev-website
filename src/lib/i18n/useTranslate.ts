import { useSpeakLocale } from 'qwik-speak';
import { isServer } from '@builder.io/qwik/build';

export { translateApp } from './translate-app';

/** Agent debug: cap SSR logs per process to limit noise */
let __agentUseTranslateLogs = 0;

/**
 * Current UI locale only — no translator function (avoids Qwik SSR Code(3) serialization).
 * Use: import { translateApp } from this module; translateApp(lang, 'common.loading')
 */
export function useTranslate() {
  const locale = useSpeakLocale();
  const lang = locale.lang || 'en';

  // #region agent log
  if (isServer && __agentUseTranslateLogs < 40) {
    __agentUseTranslateLogs += 1;
    const stack = new Error().stack ?? '';
    const frames = stack
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.includes('website') || l.includes('credocode'));
    fetch('http://127.0.0.1:7469/ingest/ed85bb2c-c192-44f6-8c60-9fe04360649a', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '08cfc0',
      },
      body: JSON.stringify({
        sessionId: '08cfc0',
        runId: 'post-fix',
        hypothesisId: 'H6',
        location: 'useTranslate.ts:hook',
        message: 'useTranslate() invoked (SSR)',
        data: {
          n: __agentUseTranslateLogs,
          localeLang: lang,
          frames: frames.slice(0, 8),
          fixAttempt: 'translateApp-module-no-t-fn',
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  return {
    lang,
    locale: locale.lang,
  };
}
