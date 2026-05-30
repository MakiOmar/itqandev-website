import { $, component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { useLocation } from '@builder.io/qwik-city';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { Button } from '~/components/marketing/Button';
import { MARKETING_ENDPOINTS } from '~/lib/marketing/endpoints';
import { getMarketingApiBaseUrl } from '~/lib/marketing/api-client';
import { resolveDevSsrMarketingApiBase } from '~/lib/marketing/resolve-api-base';
import {
  buildBrowserApiCheckTargets,
  probeApiEndpoint,
  probeDiagnosis,
  SSR_DEV_TIMEOUT_LABEL,
  type ApiProbeResult,
} from '~/lib/marketing/api-connectivity-check';

function verdictClasses(verdict: ApiProbeResult['verdict']): string {
  switch (verdict) {
    case 'ok':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'slow':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200';
    case 'timeout':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    default:
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
  }
}

export default component$(() => {
  const loc = useLocation();
  const running = useSignal(false);
  const results = useSignal<ApiProbeResult[]>([]);
  const lastRunAt = useSignal<string | null>(null);

  const runChecks = $(async () => {
    running.value = true;
    results.value = [];
    const targets = buildBrowserApiCheckTargets(loc.url.origin);
    const next: ApiProbeResult[] = [];
    for (const target of targets) {
      next.push(await probeApiEndpoint(target.label, target.url));
      results.value = [...next];
    }
    lastRunAt.value = new Date().toLocaleTimeString();
    running.value = false;
  });

  useVisibleTask$(() => {
    void runChecks();
  });

  const apiBase = getMarketingApiBaseUrl(loc.url.href);
  const ssrApiBase = resolveDevSsrMarketingApiBase(loc.url.href);
  const rawPingUrl = `${apiBase.replace(/\/$/, '')}${MARKETING_ENDPOINTS.ping}`;
  const ssrPingUrl = `${ssrApiBase.replace(/\/$/, '')}${MARKETING_ENDPOINTS.ping}`;
  const proxyTarget = String(import.meta.env?.VITE_API_PROXY_TARGET ?? '').trim();

  return (
    <>
      <Section>
        <Container>
          <div class="mx-auto max-w-3xl">
            <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              API connectivity check
            </h1>
            <p class="mt-4 text-slate-600 dark:text-slate-400">
              Use this page in the browser to see whether Laravel is slow, unreachable, or failing only from
              Node SSR. Compare <strong class="font-semibold">client_ms</strong> (round-trip in your browser)
              with <strong class="font-semibold">server_ms</strong> (Laravel processing time). In dev, Node SSR
              uses <strong class="font-semibold">VITE_API_PROXY_TARGET</strong> directly (not the Vite :5173 proxy).
            </p>

            <div class="mt-6 rounded-xl border border-slate-200 bg-white/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/50">
              <p class="font-medium text-slate-900 dark:text-white">Quick links (open JSON in a new tab)</p>
              <ul class="mt-2 list-inside list-disc space-y-1 text-slate-600 dark:text-slate-400">
                <li>
                  <a
                    class="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                    href={rawPingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {rawPingUrl}
                  </a>
                  <span class="text-slate-500"> (browser)</span>
                </li>
                <li>
                  <a
                    class="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                    href={ssrPingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ssrPingUrl}
                  </a>
                  <span class="text-slate-500"> (Node SSR dev)</span>
                </li>
                {proxyTarget ? (
                  <li>
                    <a
                      class="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                      href={`${proxyTarget.replace(/\/$/, '')}/api/public/ping`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {proxyTarget.replace(/\/$/, '')}/api/public/ping
                    </a>
                    <span class="text-slate-500"> (direct WAMP / artisan, no Vite)</span>
                  </li>
                ) : null}
              </ul>
              <p class="mt-3 text-xs text-slate-500 dark:text-slate-500">
                SSR dev timeout: {SSR_DEV_TIMEOUT_LABEL}. If &quot;Node SSR dev&quot; probes fail here, set
                VITE_API_PROXY_TARGET (or VITE_SSR_API_BASE_URL) in website/.env and restart the dev server.
              </p>
            </div>

            <div class="mt-6 flex flex-wrap items-center gap-3">
              <Button type="button" disabled={running.value} onClick$={runChecks}>
                {running.value ? 'Running…' : 'Run checks again'}
              </Button>
              {lastRunAt.value ? (
                <span class="text-sm text-slate-500 dark:text-slate-400">Last run: {lastRunAt.value}</span>
              ) : null}
            </div>

            <div class="mt-8 space-y-4">
              {results.value.length === 0 && running.value ? (
                <p class="text-sm text-slate-500 dark:text-slate-400">Probing endpoints…</p>
              ) : null}
              {results.value.map((probe) => (
                <article
                  key={probe.url}
                  class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{probe.label}</h2>
                      <p class="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">
                        {probe.url}
                      </p>
                    </div>
                    <span
                      class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${verdictClasses(probe.verdict)}`}
                    >
                      {probe.verdict}
                    </span>
                  </div>

                  <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt class="text-slate-500 dark:text-slate-400">HTTP status</dt>
                      <dd class="font-mono text-slate-900 dark:text-white">{probe.httpStatus ?? '—'}</dd>
                    </div>
                    <div>
                      <dt class="text-slate-500 dark:text-slate-400">client_ms (browser)</dt>
                      <dd class="font-mono text-slate-900 dark:text-white">{probe.clientMs}</dd>
                    </div>
                    <div>
                      <dt class="text-slate-500 dark:text-slate-400">server_ms (Laravel)</dt>
                      <dd class="font-mono text-slate-900 dark:text-white">
                        {probe.serverMs != null ? probe.serverMs : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-slate-500 dark:text-slate-400">Message</dt>
                      <dd class="text-slate-900 dark:text-white">{probe.message}</dd>
                    </div>
                  </dl>

                  <p class="mt-4 text-sm text-slate-600 dark:text-slate-300">{probeDiagnosis(probe)}</p>

                  {probe.bodyPreview ? (
                    <pre class="mt-4 max-h-40 overflow-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                      {probe.bodyPreview}
                    </pre>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
});

export const head: DocumentHead = {
  title: 'API connectivity check',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
};
