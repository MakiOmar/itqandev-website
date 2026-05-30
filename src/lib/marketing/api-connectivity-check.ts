/**
 * Browser-side API probes for dev/diagnostics (see /{lang}/api-check).
 */

import { MARKETING_ENDPOINTS } from './endpoints';
import { getMarketingApiBaseUrl } from './api-client';
import { resolveDevSsrMarketingApiBase } from './resolve-api-base';

export type ApiProbeVerdict = 'ok' | 'slow' | 'timeout' | 'error';

export type ApiProbeResult = {
  label: string;
  url: string;
  ok: boolean;
  httpStatus: number | null;
  clientMs: number;
  serverMs: number | null;
  verdict: ApiProbeVerdict;
  message: string;
  bodyPreview: string | null;
};

const SSR_DEV_TIMEOUT_MS = 8000;

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function verdictFromTiming(ok: boolean, clientMs: number): ApiProbeVerdict {
  if (!ok) {
    return 'error';
  }
  if (clientMs >= SSR_DEV_TIMEOUT_MS) {
    return 'timeout';
  }
  if (clientMs >= 2000) {
    return 'slow';
  }
  return 'ok';
}

function diagnosis(probe: ApiProbeResult): string {
  if (probe.verdict === 'timeout') {
    return 'Request exceeded the SSR dev timeout (8s). The browser or Vite proxy cannot reach Laravel in time.';
  }
  if (probe.verdict === 'error') {
    return 'Request failed (HTTP error or network). Check VITE_API_BASE_URL, VITE_API_PROXY_TARGET, and that Laravel is running.';
  }
  if (probe.verdict === 'slow' && probe.serverMs != null && probe.serverMs < 500) {
    return 'Laravel responded quickly on the server but the round-trip was slow — likely WAMP/Apache, proxy, or network latency.';
  }
  if (probe.verdict === 'slow' && probe.serverMs != null && probe.serverMs >= 500) {
    return 'Laravel itself is slow (PHP/DB). Check database, queries, and local server load.';
  }
  if (probe.verdict === 'ok') {
    return 'Healthy. If SSR still fails, Node may not reach the same URL as the browser (see VITE_SSR_API_BASE_URL).';
  }
  return 'Slow response — compare client_ms vs server_ms to see where time is spent.';
}

export function probeDiagnosis(probe: ApiProbeResult): string {
  return diagnosis(probe);
}

export async function probeApiEndpoint(
  label: string,
  url: string,
  timeoutMs = 15000,
): Promise<ApiProbeResult> {
  const started = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      signal: controller.signal,
    });
    const clientMs = Math.round(performance.now() - started);
    const text = await res.text();
    let serverMs: number | null = null;
    let message = res.ok ? 'OK' : `HTTP ${res.status}`;

    try {
      const json = JSON.parse(text) as {
        data?: { server_ms?: number; message?: string; status?: string };
        message?: string;
      };
      if (typeof json?.data?.server_ms === 'number') {
        serverMs = json.data.server_ms;
      }
      if (typeof json?.data?.message === 'string') {
        message = json.data.message;
      } else if (typeof json?.message === 'string') {
        message = json.message;
      }
      if (typeof json?.data?.status === 'string' && json.data.status !== 'ok') {
        message = `${message} (${json.data.status})`;
      }
    } catch {
      /* non-JSON body */
    }

    const ok = res.ok;
    const verdict = verdictFromTiming(ok, clientMs);
    const preview = text.length > 600 ? `${text.slice(0, 600)}…` : text;

    return {
      label,
      url,
      ok,
      httpStatus: res.status,
      clientMs,
      serverMs,
      verdict,
      message,
      bodyPreview: preview || null,
    };
  } catch (e) {
    const clientMs = Math.round(performance.now() - started);
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    return {
      label,
      url,
      ok: false,
      httpStatus: null,
      clientMs,
      serverMs: null,
      verdict: isTimeout ? 'timeout' : 'error',
      message: isTimeout
        ? `Timed out after ${timeoutMs}ms`
        : e instanceof Error
          ? e.message
          : 'Request failed',
      bodyPreview: null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export type ApiCheckTarget = {
  label: string;
  url: string;
};

/** Probes to run from the browser diagnostics page. */
export function buildBrowserApiCheckTargets(pageOrigin: string): ApiCheckTarget[] {
  const apiBase = trimSlash(getMarketingApiBaseUrl(pageOrigin));
  const ssrApiBase = trimSlash(resolveDevSsrMarketingApiBase(pageOrigin));
  const proxyTarget = String(import.meta.env?.VITE_API_PROXY_TARGET ?? '').trim();

  const targets: ApiCheckTarget[] = [
    {
      label: 'Ping (browser / Vite proxy)',
      url: `${apiBase}${MARKETING_ENDPOINTS.ping}`,
    },
    {
      label: 'Public services (browser / Vite proxy)',
      url: `${apiBase}${MARKETING_ENDPOINTS.services}?per_page=1`,
    },
    {
      label: 'Ping (Node SSR dev — same URL SSR uses)',
      url: `${ssrApiBase}${MARKETING_ENDPOINTS.ping}`,
    },
    {
      label: 'Public services (Node SSR dev)',
      url: `${ssrApiBase}${MARKETING_ENDPOINTS.services}?per_page=1`,
    },
  ];

  if (
    proxyTarget &&
    /^https?:\/\//i.test(proxyTarget) &&
    `${trimSlash(proxyTarget)}/api/public/ping` !== `${ssrApiBase}${MARKETING_ENDPOINTS.ping}`
  ) {
    targets.push({
      label: 'Ping (direct VITE_API_PROXY_TARGET)',
      url: `${trimSlash(proxyTarget)}/api/public/ping`,
    });
  }

  return targets;
}

export const SSR_DEV_TIMEOUT_LABEL = `${SSR_DEV_TIMEOUT_MS}ms`;
