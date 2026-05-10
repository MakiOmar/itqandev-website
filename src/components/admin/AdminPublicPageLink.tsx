import { component$ } from '@builder.io/qwik';
import { translateApp } from '../../lib/i18n/translate-app';
import { adminPublicAbsoluteUrl, adminPublicDetailPath, type AdminPublicDetailKind } from '../../lib/admin/public-content-url';

export type AdminPublicPageLinkProps = {
  /** UI locale (route prefix), e.g. en */
  lang: string;
  kind: AdminPublicDetailKind;
  slug: string | null | undefined;
};

/**
 * Shown below the slug input: clickable link + URL text for the public detail page when slug is non-empty.
 */
export const AdminPublicPageLink = component$((props: AdminPublicPageLinkProps) => {
  const path = adminPublicDetailPath(props.lang, props.kind, props.slug ?? '');
  if (!path) {
    return null;
  }
  const href = adminPublicAbsoluteUrl(path);
  const label = translateApp(props.lang, 'common.viewPublicPage');

  return (
    <div class="mt-1.5 space-y-0.5">
      {/* Opens the canonical public URL in a new browser tab */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex text-sm font-medium text-primary-600 underline decoration-primary-300 underline-offset-2 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
      >
        {label}
      </a>
      {/* Path preview for copying / reassurance */}
      <p class="truncate text-xs text-gray-500 dark:text-gray-400" title={href}>
        {href}
      </p>
    </div>
  );
});
