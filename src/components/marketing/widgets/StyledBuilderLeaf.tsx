import { component$, Slot } from '@builder.io/qwik';
import {
  builderStyleCssVars,
  cssSafeBlockId,
  hoverAnimationClass,
  scopedCustomCss,
  type BuilderStyles,
} from '~/lib/marketing/builder-styles';
import { builderDarkStyleCss } from '~/lib/marketing/builder-dark-styles';
import '~/lib/marketing/builder-widget-styles.css';

export type StyledBuilderLeafProps = {
  id: string;
  styles?: BuilderStyles | null;
  settings?: Record<string, unknown> | null;
};

/** Public wrapper: CSS variables + optional scoped custom CSS and dark-mode overrides. */
export const StyledBuilderLeaf = component$<StyledBuilderLeafProps>((props) => {
  const safe = cssSafeBlockId(props.id);
  const vars = builderStyleCssVars(props.styles, props.settings);
  const custom = scopedCustomCss(props.id, props.styles);
  const dark = builderDarkStyleCss(props.id, props.styles);
  const anim = hoverAnimationClass(props.styles);
  const className = ['b-styled', anim].filter(Boolean).join(' ');

  return (
    <div id={`b-${safe}`} class={className} style={vars}>
      {dark ? <style dangerouslySetInnerHTML={dark} /> : null}
      {custom ? <style dangerouslySetInnerHTML={custom} /> : null}
      <Slot />
    </div>
  );
});
