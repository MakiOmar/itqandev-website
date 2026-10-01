import { component$, useContextProvider, useStore } from '@builder.io/qwik';
import { usePublicSiteMeta } from '../../routes/[lang]/admin/layout';
import { BuilderKitColorsContext } from '~/lib/admin/builder-kit-colors';

/**
 * Provides kit colours to the inspector and returns the kit CSS for the canvas.
 * Call from a builder workspace rendered under the admin layout.
 */
export function useBuilderDesignKit(): { css: string } {
  const meta = usePublicSiteMeta();
  const store = useStore({ colors: meta.value.kit_colors ?? [] });
  useContextProvider(BuilderKitColorsContext, store);
  return { css: meta.value.design_kit_css ?? '' };
}

/** Kit custom properties; `:root,.light` / `.dark` blocks so the canvas theme scope picks the right values. */
export const BuilderKitStyle = component$<{ css: string }>((props) =>
  props.css && !props.css.includes('<') ? <style dangerouslySetInnerHTML={props.css} /> : null,
);
