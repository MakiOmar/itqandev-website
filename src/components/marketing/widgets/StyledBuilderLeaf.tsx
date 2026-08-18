import { component$, Slot } from '@builder.io/qwik';
import {
  builderStyleCssVars,
  cssSafeBlockId,
  hoverAnimationClass,
  scopedCustomCss,
  type BuilderStyles,
} from '~/lib/marketing/builder-styles';
import '~/lib/marketing/builder-widget-styles.css';

export type StyledBuilderLeafProps = {
  id: string;
  styles?: BuilderStyles | null;
  settings?: Record<string, unknown> | null;
};

/** Public wrapper: CSS variables + optional scoped custom CSS. */
export const StyledBuilderLeaf = component$<StyledBuilderLeafProps>((props) => {
  const safe = cssSafeBlockId(props.id);
  const vars = builderStyleCssVars(props.styles, props.settings);
  const custom = scopedCustomCss(props.id, props.styles);
  const anim = hoverAnimationClass(props.styles);
  const className = ['b-styled', anim].filter(Boolean).join(' ');

  return (
    <div id={`b-${safe}`} class={className} style={vars}>
      {custom ? <style dangerouslySetInnerHTML={custom} /> : null}
      <Slot />
    </div>
  );
});
