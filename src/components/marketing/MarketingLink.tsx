import { component$, Slot, useContext } from '@builder.io/qwik';
import { Link, type LinkProps } from '@builder.io/qwik-city';
import { PublicDocumentNavContext } from '~/lib/marketing/public-document-nav-context';

/**
 * Public marketing link — prefetch disabled in dev to avoid broken route .tsx preloads
 * (bracket paths like `[lang]` and admin layout chunks on hover).
 * On 404 / unknown public paths, render a real `<a>` so home navigation is a full
 * document load (Qwik City SPA from HTTP 404 to `/[lang]/` does not complete).
 */
export const MarketingLink = component$<LinkProps>((props) => {
  const documentNav = useContext(PublicDocumentNavContext);
  const { prefetch, reload, replaceState, scroll, ...rest } = props;
  const effectivePrefetch = import.meta.env.PROD ? prefetch : false;

  if (documentNav.value) {
    return (
      <a {...rest}>
        <Slot />
      </a>
    );
  }

  return (
    <Link {...rest} prefetch={effectivePrefetch} reload={reload} replaceState={replaceState} scroll={scroll}>
      <Slot />
    </Link>
  );
});
