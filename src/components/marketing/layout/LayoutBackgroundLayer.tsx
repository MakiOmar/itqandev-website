import { component$ } from '@builder.io/qwik';
import {
  builderBackgroundInlineStyle,
  hasInteractiveBackground,
  hasVisibleBackground,
  readBuilderBackground,
  type BuilderBackground,
} from '~/lib/marketing/builder-background';
import { LazyParticlesBackground } from '~/components/marketing/LazyParticlesBackground';
import { RainLinesBackground } from './RainLinesBackground';

export type LayoutBackgroundLayerProps = {
  settings?: Record<string, unknown>;
  class?: string;
};

export const LayoutBackgroundLayer = component$<LayoutBackgroundLayerProps>((props) => {
  const bg = readBuilderBackground(props.settings);
  if (!hasVisibleBackground(bg)) return null;

  const inline = builderBackgroundInlineStyle(bg);
  const interactive = hasInteractiveBackground(bg);

  return (
    <div
      class={[
        'pointer-events-none absolute inset-0 overflow-hidden',
        props.class || '',
      ].join(' ')}
      aria-hidden="true"
    >
      {inline ? <div class="absolute inset-0" style={inline} /> : null}
      {bg.type === 'particles' ? (
        <LazyParticlesBackground
          density={bg.particles_density}
          speed={bg.particles_speed}
          opacity={bg.particles_opacity}
          size={bg.particles_size}
          color={bg.particles_color}
          layout="contained"
        />
      ) : null}
      {bg.type === 'animated_rain' ? (
        <RainLinesBackground
          color={bg.rain_color}
          speed={bg.rain_speed}
          density={bg.rain_density}
          direction={bg.rain_direction}
        />
      ) : null}
    </div>
  );
});

/** Merge background into node settings for admin updates. */
export function writeBuilderBackground(
  settings: Record<string, unknown> | undefined,
  background: BuilderBackground,
): Record<string, unknown> {
  return { ...(settings ?? {}), background };
}
