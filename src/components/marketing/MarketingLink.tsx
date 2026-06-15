import { component$, Slot } from '@builder.io/qwik';
import { Link, type LinkProps } from '@builder.io/qwik-city';

/**
 * Public marketing link — prefetch disabled in dev to avoid broken route .tsx preloads
 * (bracket paths like `[lang]` and admin layout chunks on hover).
 */
export const MarketingLink = component$<LinkProps>((props) => {
  const { prefetch, ...rest } = props;
  const effectivePrefetch = import.meta.env.PROD ? prefetch : false;

  return (
    <Link {...rest} prefetch={effectivePrefetch}>
      <Slot />
    </Link>
  );
});
