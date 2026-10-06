import type { PageSectionNode } from './appearance-types';
import { hasVisibleBackground, readBuilderBackground } from './builder-background';
import { isPageLayoutBand } from './page-layout-utils';

/**
 * True when an enabled footer band paints its own background (light or dark). The site footer
 * wrapper then drops its fallback colour and padding so the builder controls the whole area.
 */
export function footerOwnsBackground(sections: PageSectionNode[]): boolean {
  return sections.some(
    (node) =>
      isPageLayoutBand(node) &&
      node.enabled !== false &&
      hasVisibleBackground(readBuilderBackground(node.settings as Record<string, unknown> | undefined)),
  );
}
