import { component$ } from '@builder.io/qwik';
import {
  columnSpanClassNames,
  isPageLayoutBand,
  normalizeColumnSpans,
} from '~/lib/marketing/page-layout-utils';
import type { PageLayoutBand, PageSectionNode } from '~/lib/marketing/appearance-types';
import { filterPageLayoutBandForDevice } from '~/lib/marketing/device-visibility';
import { useLayoutDevice } from '~/lib/marketing/layout-device-context';
import { ChromeKitView, type ChromeKitViewProps } from './ChromeKitView';

const GAP_CLASS: Record<number, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
};

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
 * Renders header/footer page-layout documents (band → row → column → chrome kits).
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
        return (
          <div
            key={band.id}
            class={[
              boxed ? 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8' : 'w-full',
              props.bandClass || '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {(band.rows || []).map((row) => {
              const gap = GAP_CLASS[Number(row.gap) || 4] || 'gap-4';
              const stack =
                row.stack_below === 'tablet'
                  ? 'grid-cols-1 md:grid-cols-12'
                  : row.stack_below === 'desktop'
                    ? 'grid-cols-1 lg:grid-cols-12'
                    : 'grid-cols-12';
              return (
                <div key={row.id} class={['grid', stack, gap].join(' ')}>
                  {(row.columns || []).map((col) => {
                    const spans = normalizeColumnSpans(col.span);
                    return (
                      <div key={col.id} class={columnSpanClassNames(spans)}>
                        {(col.blocks || []).map((block) => (
                          <ChromeKitView
                            key={block.id || block.type}
                            type={block.type}
                            settings={(block.settings || {}) as Record<string, unknown>}
                            uiLocale={props.uiLocale}
                            branding={props.branding}
                            session={props.session}
                            features={props.features}
                            contact={props.contact}
                            isDarkMode={props.isDarkMode}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
});
