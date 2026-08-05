import { component$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { ChromeLayoutRenderer } from '~/components/marketing/chrome/ChromeLayoutRenderer';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import type { FooterPublicPayload, PageSectionNode } from '~/lib/marketing/appearance-types';
import { defaultFooterSections } from '~/lib/marketing/chrome-defaults';

export interface FooterProps {
  contact?: { email?: string; socials?: { name: string; url: string }[] };
  branding?: { name: string; logo?: string; logoDark?: string; logoLight?: string } | null;
  footer?: FooterPublicPayload | null;
}

export const Footer = component$<FooterProps>((props) => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const fromShell = (props.footer?.sections || []) as PageSectionNode[];
  const sections = fromShell.length > 0 ? fromShell : defaultFooterSections();

  return (
    <footer class="mt-auto border-t border-slate-200 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-950/40">
      <ChromeLayoutRenderer
        sections={sections}
        uiLocale={uiLocale}
        branding={props.branding}
        contact={props.contact}
        bandClass="py-4"
      />
    </footer>
  );
});
