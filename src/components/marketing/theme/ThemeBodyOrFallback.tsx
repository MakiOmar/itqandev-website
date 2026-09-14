import { component$, Slot } from '@builder.io/qwik';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import type { HomepageSectionsRendererProps } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';

/**
 * Render a Theme Builder body when published; otherwise keep the route’s hardcoded template.
 */
export const ThemeBodyOrFallback = component$<{
  themeBody?: PageSectionNode[] | null;
  renderer: Omit<HomepageSectionsRendererProps, 'sections' | 'layoutAware' | 'allowDefaultSections'>;
}>((props) => {
  if (props.themeBody && props.themeBody.length > 0) {
    return (
      <HomepageSectionsRenderer
        {...props.renderer}
        sections={props.themeBody}
        layoutAware={true}
        allowDefaultSections={false}
      />
    );
  }
  return <Slot />;
});
