import { component$ } from "@builder.io/qwik";
import { useDocumentHead, useLocation } from "@builder.io/qwik-city";
import { uiLocaleBootstrapJson } from "~/lib/i18n/ui-locale-segments";
import { isAdminDashboardPath } from "~/lib/i18n/ui-locale-path";
import { INLINE_CRITICAL_CSS } from "~/lib/perf/critical-css";
import { buildDocumentBootstrapScript } from "~/lib/perf/document-bootstrap-script";
import { collectPreconnectHints, type ResourceHintLink } from "~/lib/perf/resource-hints";
import { buildCanonicalHref } from "~/lib/seo/canonical-url";

function preconnectLinkProps(hint: ResourceHintLink) {
  return {
    rel: "preconnect" as const,
    href: hint.href,
    ...(hint.crossOrigin ? { crossOrigin: "anonymous" as const } : {}),
  };
}

/**
 * The RouterHead component is placed inside of the document `<head>` element.
 */
export const RouterHead = component$(() => {
  const head = useDocumentHead();
  const loc = useLocation();
  const isAdmin = isAdminDashboardPath(loc.url.pathname);
  const hasCanonicalLink = head.links.some((l) => l.rel === "canonical");
  const fallbackCanonical = buildCanonicalHref(loc.url.pathname, loc.url.origin);
  const uiLocaleBootstrap = uiLocaleBootstrapJson();
  const preconnectHints = collectPreconnectHints(loc.url.origin, loc.url.pathname);

  return (
    <>
      <title>{head.title}</title>

      {isAdmin ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : null}
      {!isAdmin && !hasCanonicalLink ? (
        <link rel="canonical" href={fallbackCanonical} />
      ) : null}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

      {/* Critical CSS: first paint + FOUC gate before Tailwind bundle loads */}
      <style id="critical-css" dangerouslySetInnerHTML={INLINE_CRITICAL_CSS} />
      
      {/* Warm connections for Google Fonts + cross-origin Laravel API /storage (see resource-hints.ts) */}
      {preconnectHints.map((hint, index) => (
        <link key={`preconnect-${index}`} {...preconnectLinkProps(hint)} />
      ))}
      {/* Font stylesheets are injected asynchronously in the bootstrap script below */}
      
      {/* Performance optimizations */}
      <meta name="theme-color" content="#ffffff" />
      <meta httpEquiv="x-dns-prefetch-control" content="on" />
      
      {/* Initialize theme and direction before page render to prevent flash */}
      <script
        dangerouslySetInnerHTML={buildDocumentBootstrapScript(uiLocaleBootstrap)}
      />

      {head.meta.map((m) => (
        <meta key={m.key} {...m} />
      ))}

      {head.links.map((l) => (
        <link key={l.key} {...l} />
      ))}

      {head.styles.map((s) => (
        <style
          key={s.key}
          {...s.props}
          {...(s.props?.dangerouslySetInnerHTML
            ? {}
            : { dangerouslySetInnerHTML: s.style })}
        />
      ))}

      {head.scripts.map((s) => (
        <script
          key={s.key}
          {...s.props}
          {...(s.props?.dangerouslySetInnerHTML
            ? {}
            : { dangerouslySetInnerHTML: s.script })}
        />
      ))}
    </>
  );
});
