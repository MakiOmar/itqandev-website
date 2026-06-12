import { component$ } from '@builder.io/qwik';
import { usePublicSiteMeta } from '~/lib/loaders/public-site-meta';
import {
  buildFontFaceCss,
  buildTypographyBootstrapScript,
  buildTypographyCssVariables,
} from '~/lib/perf/typography';

/** Admin-only typography injection from unified public site-meta loader. */
export const AdminSiteTypographyHead = component$(() => {
  const meta = usePublicSiteMeta();
  const typo = meta.value.typography;
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
