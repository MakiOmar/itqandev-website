/**
 * WHAT IS THIS FILE?
 *
 * SSR entry point, in all cases the application is rendered outside the browser, this
 * entry point will be the common one.
 *
 * - Server (express, cloudflare...)
 * - npm run start
 * - npm run preview
 * - npm run build
 *
 */
import {
  renderToStream,
  type RenderToStreamOptions,
} from "@builder.io/qwik/server";
import Root from "./root";

export default function (opts: RenderToStreamOptions) {
  // #region agent log
  try {
    const o = opts as unknown as Record<string, unknown>;
    fetch("http://127.0.0.1:7469/ingest/ed85bb2c-c192-44f6-8c60-9fe04360649a", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "08cfc0",
      },
      body: JSON.stringify({
        sessionId: "08cfc0",
        runId: "pre-fix",
        hypothesisId: "H0",
        location: "entry.ssr.tsx",
        message: "SSR renderToStream invoked",
        data: {
          optKeys: Object.keys(o ?? {}),
          serverDataKeys:
            o.serverData && typeof o.serverData === "object"
              ? Object.keys(o.serverData as object)
              : [],
          locale:
            (o.serverData as Record<string, unknown> | undefined)?.locale ??
            (o.serverData as Record<string, unknown> | undefined)?.lang,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
  // #endregion
  return renderToStream(<Root />, {
    ...opts,
    // Use container attributes to set attributes on the html tag.
    containerAttributes: {
      lang: "en-us",
      ...opts.containerAttributes,
    },
    serverData: {
      ...opts.serverData,
    },
  });
}
