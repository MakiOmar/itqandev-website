import { component$ } from '@builder.io/qwik';
import {
  buildFontFaceCss,
  buildTypographyBootstrapScript,
  buildTypographyCssVariables,
} from '~/lib/perf/typography';
import type { SiteTypography } from '~/types/typography';

/** Public marketing typography (props from layout loader — do not import route layout modules here). */
export const PublicShellTypographyHead = component$((props: { typography: SiteTypography }) => {
  const typo = props.typography;
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
