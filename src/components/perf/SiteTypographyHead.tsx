import { component$ } from '@builder.io/qwik';
import { useSiteTypography } from '~/lib/loaders/site-typography';
import {
  buildFontFaceCss,
  buildTypographyBootstrapScript,
  buildTypographyCssVariables,
} from '~/lib/perf/typography';

/**
 * Injects self-hosted @font-face rules, CSS variables, and async Google Font loading policy.
 * Mounted from `[lang]/layout.tsx` so all localized public and admin routes share typography.
 */
export const SiteTypographyHead = component$(() => {
  const typography = useSiteTypography();
  const typo = typography.value;
  const fontFaceCss = buildFontFaceCss(typo);
  const cssVars = buildTypographyCssVariables(typo);
  const bootstrapScript = buildTypographyBootstrapScript(JSON.stringify(typo));

  return (
    <>
      <style id="site-font-vars" dangerouslySetInnerHTML={cssVars} />
      {fontFaceCss ? <style id="site-font-faces" dangerouslySetInnerHTML={fontFaceCss} /> : null}
      <script id="site-typography-bootstrap" dangerouslySetInnerHTML={bootstrapScript} />
    </>
  );
});
