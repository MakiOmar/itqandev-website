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
import { builderDarkStyleCss } from '~/lib/marketing/builder-dark-styles';
import { ShapeDividerLayer, type ShapeDividerEdge } from './ShapeDividerLayer';
// `.b-styled` rules for container Style tabs; header/footer shells render on pages without widgets.
import '~/lib/marketing/builder-widget-styles.css';

export type LayoutNodeShellProps = {
  /** Stable id for scoped custom CSS (`#b-{id}`). */
  id?: string;
  settings?: Record<string, unknown>;
  /** Container Style tab bags (layout / spacing / border / custom). */
  styles?: BuilderStyles | null;
  /** Shell classes. No `space-*` utilities: background/divider overlays are direct children and would get margins. */
  class?: string;
  /**
   * Clip content to the node when it has a background (default). Header/footer shells pass false so
   * dropdown menus can hang below the bar; the background layer clips itself either way.
   */
  clipContent?: boolean;
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
  const dark = styled ? builderDarkStyleCss(safe, props.styles) : null;

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
        hasBg && props.clipContent !== false ? 'overflow-hidden' : '',
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
      {dark ? <style dangerouslySetInnerHTML={dark} /> : null}
      {custom ? <style dangerouslySetInnerHTML={custom} /> : null}
      {hasBg ? <LayoutBackgroundLayer settings={props.settings} nodeId={props.id} /> : null}
      {dividers?.top ? <ShapeDividerLayer edge="top" divider={dividers.top} /> : null}
      <div class={hasBg ? 'relative z-[1] h-full min-h-0 w-full' : 'h-full w-full min-w-0'}>
        <Slot />
      </div>
      {dividers?.bottom ? <ShapeDividerLayer edge="bottom" divider={dividers.bottom} /> : null}
    </div>
  );
});
