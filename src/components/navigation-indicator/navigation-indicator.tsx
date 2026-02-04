import { component$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';

export const NavigationIndicator = component$(() => {
  const loc = useLocation();

  return (
    <div
      class={[
        'nav-indicator',
        loc.isNavigating && 'nav-indicator--active',
      ]}
      aria-hidden="true"
    />
  );
});
