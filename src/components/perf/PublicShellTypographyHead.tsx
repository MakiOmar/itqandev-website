import { component$ } from '@builder.io/qwik';
import { usePublicShell } from '~/routes/[lang]/(public)/layout';
import { defaultSystemTypography } from '~/lib/perf/typography';
import {
  buildFontFaceCss,
  buildTypographyBootstrapScript,
  buildTypographyCssVariables,
} from '~/lib/perf/typography';

/** Public marketing typography from shell payload (no extra site-meta fetch). */
export const PublicShellTypographyHead = component$(() => {
  const shell = usePublicShell();
  const typo = shell.value.branding?.typography ?? defaultSystemTypography();
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
