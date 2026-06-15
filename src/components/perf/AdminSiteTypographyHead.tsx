import { component$ } from '@builder.io/qwik';
import {
  buildFontFaceCss,
  buildTypographyBootstrapScript,
  buildTypographyCssVariables,
} from '~/lib/perf/typography';
import type { SiteTypography } from '~/types/typography';

/** Admin-only typography injection (props from layout loader — no route import cycle). */
export const AdminSiteTypographyHead = component$((props: { typography: SiteTypography }) => {
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
