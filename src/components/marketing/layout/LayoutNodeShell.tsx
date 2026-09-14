import { component$, Slot } from '@builder.io/qwik';
import { LayoutBackgroundLayer } from './LayoutBackgroundLayer';
import { hasVisibleBackground, readBuilderBackground } from '~/lib/marketing/builder-background';
import {
  builderStyleCssVars,
  cssSafeBlockId,
  hasAnyStyles,
  scopedCustomCss,
  type BuilderStyles,
} from '~/lib/marketing/builder-styles';
import { ShapeDividerLayer, type ShapeDividerEdge } from './ShapeDividerLayer';

export type LayoutNodeShellProps = {
  /** Stable id for scoped custom CSS (`#b-{id}`). */
  id?: string;
  settings?: Record<string, unknown>;
  /** Container Style tab bags (layout / spacing / border / custom). */
  styles?: BuilderStyles | null;
  class?: string;
};

/**
 * Band / row / column shell: optional background + optional `.b-styled` chrome.
 * `w-full min-w-0` keeps grid columns from overflowing; callers add `h-full` on
 * columns so backgrounds stretch to the row height (CSS grid default stretch).
 */
export const LayoutNodeShell = component$<LayoutNodeShellProps>((props) => {
  const bg = readBuilderBackground(props.settings);
  const hasBg = hasVisibleBackground(bg);
  const styled = hasAnyStyles(props.styles);
  const safe = cssSafeBlockId(props.id || 'layout');
  const vars = styled ? builderStyleCssVars(props.styles, props.settings) : undefined;
  const custom = styled ? scopedCustomCss(safe, props.styles) : null;

  const sticky = props.settings?.sticky === true;
  const stickyOffset = Number(props.settings?.sticky_offset ?? 0);
  const dividers = (props.settings?.shape_dividers || null) as
    | { top?: ShapeDividerEdge; bottom?: ShapeDividerEdge }
    | null;

  return (
    <div
      id={styled || custom ? `b-${safe}` : undefined}
      class={[
        'relative w-full min-w-0',
        styled ? 'b-styled' : '',
        hasBg ? 'overflow-hidden' : '',
        sticky ? 'sticky z-30' : '',
        props.class || '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...(vars || {}),
        ...(sticky ? { top: `${Number.isFinite(stickyOffset) ? stickyOffset : 0}px` } : {}),
      }}
    >
      {custom ? <style dangerouslySetInnerHTML={custom} /> : null}
      {hasBg ? <LayoutBackgroundLayer settings={props.settings} /> : null}
      {dividers?.top ? <ShapeDividerLayer edge="top" divider={dividers.top} /> : null}
      <div class={hasBg ? 'relative z-[1] h-full min-h-0 w-full' : 'h-full w-full min-w-0'}>
        <Slot />
      </div>
      {dividers?.bottom ? <ShapeDividerLayer edge="bottom" divider={dividers.bottom} /> : null}
    </div>
  );
});
