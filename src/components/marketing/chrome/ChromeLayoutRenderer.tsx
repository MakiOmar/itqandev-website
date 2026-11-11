import { component$ } from '@builder.io/qwik';
import {
  columnBlockWrapperClass,
  columnContentLayout,
  columnSpanClassNames,
  isPageLayoutBand,
  normalizeColumnSpans,
  rowFlexStyle,
  rowGapClass,
} from '~/lib/marketing/page-layout-utils';
import type { PageLayoutBand, PageSectionNode } from '~/lib/marketing/appearance-types';
import { filterPageLayoutBandForDevice, hideOnClass } from '~/lib/marketing/device-visibility';
import { builderDisplayClass } from '~/lib/marketing/builder-styles';
import { normalizeCssClasses, normalizeCssId } from '~/lib/marketing/builder-node-attrs';
import { isChromeKitType } from '~/lib/marketing/chrome-blocks';
import { useLayoutDevice } from '~/lib/marketing/layout-device-context';
import { LayoutNodeShell } from '~/components/marketing/layout/LayoutNodeShell';
import { ChromeKitView, type ChromeKitViewProps } from './ChromeKitView';

export type ChromeLayoutRendererProps = {
  sections: PageSectionNode[];
  uiLocale: string;
  branding?: ChromeKitViewProps['branding'];
  session?: ChromeKitViewProps['session'];
  features?: ChromeKitViewProps['features'];
  contact?: ChromeKitViewProps['contact'];
  isDarkMode?: boolean;
  /** Extra classes on each band wrapper */
  bandClass?: string;
};

/**
 * Renders header/footer page-layout documents (band → row → column → chrome kits) with the same
 * shells as the builder canvas: row justify/align/wrap, plus Style and Background on every node.
 * Respects Advanced → hide_on via UA/layout device (omits nodes; not CSS hide).
 */
export const ChromeLayoutRenderer = component$<ChromeLayoutRendererProps>((props) => {
  const device = useLayoutDevice();
  const bands = ((props.sections || []).filter(isPageLayoutBand) as PageLayoutBand[])
    .map((band) => filterPageLayoutBandForDevice(band, device))
    .filter((b): b is PageLayoutBand => b != null);

  return (
    <>
      {bands.map((band) => {
        const boxed = (band.layout_width || 'boxed') !== 'full';
        const widthClass = boxed ? 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8' : 'w-full';
        const bandSettings = band.settings;
        const bandStyles = band.styles;
        return (
          <div key={band.id} class={[widthClass, props.bandClass || '', hideOnClass(band.hide_on)].filter(Boolean).join(' ')}>
            <LayoutNodeShell
              id={band.id}
              settings={bandSettings}
              styles={bandStyles}
              cssId={band.css_id}
              cssClasses={band.css_classes}
              clipContent={false}
            >
              {(band.rows || []).map((row) => {
                const stack =
                  row.stack_below === 'tablet'
                    ? 'grid-cols-1 md:grid-cols-12'
                    : row.stack_below === 'desktop'
                      ? 'grid-cols-1 lg:grid-cols-12'
                      : 'grid-cols-12';
                const rowSettings = row.settings;
                const rowStyles = row.styles;
                return (
                  <LayoutNodeShell
                    key={row.id}
                    id={row.id}
                    settings={rowSettings}
                    styles={rowStyles}
                    cssId={row.css_id}
                    cssClasses={row.css_classes}
                    clipContent={false}
                    class={hideOnClass(row.hide_on)}
                  >
                    <div
                      class={[
                        // h-full: fill a row Style → Height so Vertical align uses the whole row.
                        'grid h-full',
                        stack,
                        rowGapClass(row.gap),
                        row.direction === 'column' ? 'flex flex-col' : '',
                      ].join(' ')}
                      style={rowFlexStyle(row)}
                    >
                      {(row.columns || []).map((col) => {
                        const spans = normalizeColumnSpans(col.span);
                        const colSettings = col.settings;
                        const colStyles = col.styles;
                        const content = columnContentLayout(row, col, '');
                        return (
                          <LayoutNodeShell
                            key={col.id}
                            id={col.id}
                            settings={colSettings}
                            styles={colStyles}
                            cssId={col.css_id}
                            cssClasses={col.css_classes}
                            clipContent={false}
                            class={`${columnSpanClassNames(spans)} h-full ${hideOnClass(col.hide_on)}`}
                          >
                            <div class={content.class} style={content.style}>
                            {(col.blocks || []).map((block) => {
                              const view = (
                                <ChromeKitView
                                  key={block.id || block.type}
                                  type={block.type}
                                  settings={(block.settings || {}) as Record<string, unknown>}
                                  block={block}
                                  uiLocale={props.uiLocale}
                                  branding={props.branding}
                                  session={props.session}
                                  features={props.features}
                                  contact={props.contact}
                                  isDarkMode={props.isDarkMode}
                                />
                              );
                              // Page widgets carry their CSS ID / classes on the styled leaf; chrome kits have none, so the wrapper does.
                              const chromeKit = isChromeKitType(block.type);
                              const kitCssId = chromeKit ? normalizeCssId(block.css_id) : '';
                              const wrapperClass = [
                                columnBlockWrapperClass(
                                  col,
                                  hideOnClass(block.hide_on),
                                  builderDisplayClass(block.styles),
                                ),
                                chromeKit ? normalizeCssClasses(block.css_classes) : '',
                              ]
                                .filter(Boolean)
                                .join(' ');
                              return wrapperClass || kitCssId ? (
                                <div
                                  key={block.id || block.type}
                                  id={kitCssId || undefined}
                                  class={wrapperClass || undefined}
                                >
                                  {view}
                                </div>
                              ) : (
                                view
                              );
                            })}
                            </div>
                          </LayoutNodeShell>
                        );
                      })}
                    </div>
                  </LayoutNodeShell>
                );
              })}
            </LayoutNodeShell>
          </div>
        );
      })}
    </>
  );
});
