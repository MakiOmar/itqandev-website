import { component$, Slot } from '@builder.io/qwik';
import { LayoutBackgroundLayer } from './LayoutBackgroundLayer';
import { hasVisibleBackground, readBuilderBackground } from '~/lib/marketing/builder-background';

export type LayoutNodeShellProps = {
  settings?: Record<string, unknown>;
  class?: string;
};

/** Relative wrapper with optional builder background behind slotted content. */
export const LayoutNodeShell = component$<LayoutNodeShellProps>((props) => {
  const bg = readBuilderBackground(props.settings);
  const hasBg = hasVisibleBackground(bg);

  return (
    <div class={['relative', hasBg ? 'overflow-hidden' : '', props.class || ''].join(' ')}>
      {hasBg ? <LayoutBackgroundLayer settings={props.settings} /> : null}
      <div class={hasBg ? 'relative z-[1]' : ''}>
        <Slot />
      </div>
    </div>
  );
});
