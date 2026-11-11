import { component$, Slot } from '@builder.io/qwik';
import {
  builderDisplayClass,
  builderStyleCssVars,
  hoverAnimationClass,
  scopedCustomCss,
  type BuilderStyles,
} from '~/lib/marketing/builder-styles';
import { builderDarkStyleCss } from '~/lib/marketing/builder-dark-styles';
import { builderNodeDomId, normalizeCssClasses } from '~/lib/marketing/builder-node-attrs';
import '~/lib/marketing/builder-widget-styles.css';

export type StyledBuilderLeafProps = {
  id: string;
  styles?: BuilderStyles | null;
  settings?: Record<string, unknown> | null;
  /** Advanced → CSS ID; replaces `b-{id}` as the element id and style scope. */
  cssId?: string;
  /** Advanced → CSS classes (space-separated). */
  cssClasses?: string;
};

/** Public wrapper: CSS variables + optional scoped custom CSS and dark-mode overrides. */
export const StyledBuilderLeaf = component$<StyledBuilderLeafProps>((props) => {
  const domId = builderNodeDomId(props.id, props.cssId);
  const vars = builderStyleCssVars(props.styles, props.settings);
  const custom = scopedCustomCss(domId, props.styles);
  const dark = builderDarkStyleCss(domId, props.styles);
  const anim = hoverAnimationClass(props.styles);
  const className = [
    'b-styled',
    anim,
    builderDisplayClass(props.styles),
    normalizeCssClasses(props.cssClasses),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div id={domId} class={className} style={vars}>
      {dark ? <style dangerouslySetInnerHTML={dark} /> : null}
      {custom ? <style dangerouslySetInnerHTML={custom} /> : null}
      <Slot />
    </div>
  );
});
