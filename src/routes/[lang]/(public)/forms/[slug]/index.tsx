import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { useLocation } from '@builder.io/qwik-city';
import { FormRenderer } from '~/components/marketing/forms/FormRenderer';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { getConfig } from '~/lib/config';

export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const slug = decodeURIComponent(String(loc.params.slug ?? '').trim());

  if (!slug) {
    return null;
  }

  return (
    <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <FormRenderer slug={slug} contentLocale={uiLocale} />
    </div>
  );
});

export const head: DocumentHead = ({ params, url }) => {
  const slug = decodeURIComponent(String(params.slug ?? '').trim());
  const brand = getConfig().branding.name;
  const title = slug ? `${slug} — ${brand}` : brand;
  return {
    title,
    meta: [
      { name: 'description', content: `Contact form ${slug}` },
      { property: 'og:title', content: title },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url.href },
    ],
  };
};
