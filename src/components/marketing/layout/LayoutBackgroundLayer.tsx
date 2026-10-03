import { component$ } from '@builder.io/qwik';
import {
  builderBackgroundBackdropStyle,
  builderBackgroundLayerId,
  builderBackgroundOverlayStyle,
  builderBackgroundPaintStyle,
  builderBackgroundVars,
  builderDarkBackgroundCss,
  hasVisibleBackground,
  isLazyImageBackground,
  readBuilderBackground,
  type BuilderBackground,
} from '~/lib/marketing/builder-background';
import { LazyBackgroundImage } from './LazyBackgroundImage';
import { LazyParticlesBackground } from '~/components/marketing/LazyParticlesBackground';
import { particlesConfigKey } from '~/lib/marketing/hero-particles';
import { RainLinesBackground } from './RainLinesBackground';

export type LayoutBackgroundLayerProps = {
  settings?: Record<string, unknown>;
  /** Layout node id; required for dark-mode background overrides (scoped by `#bg-{id}`). */
  nodeId?: string;
  class?: string;
};

export const LayoutBackgroundLayer = component$<LayoutBackgroundLayerProps>((props) => {
  const bg = readBuilderBackground(props.settings);
  if (!hasVisibleBackground(bg)) return null;

  const layerId = props.nodeId ? builderBackgroundLayerId(props.nodeId) : undefined;
  const darkCss = layerId ? builderDarkBackgroundCss(layerId, bg) : null;
  const paint = builderBackgroundPaintStyle(bg);
  const overlay = builderBackgroundOverlayStyle(bg);
  const backdrop = builderBackgroundBackdropStyle(bg);

  return (
    <div
      id={layerId}
      class={[
        // rounded-[inherit]: follows the node's Style → radius even when the node does not clip.
        'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]',
        props.class || '',
      ].join(' ')}
      style={{ ...builderBackgroundVars(bg), ...(backdrop || {}) }}
      aria-hidden="true"
    >
      {darkCss ? <style dangerouslySetInnerHTML={darkCss} /> : null}
      {paint && isLazyImageBackground(bg) ? (
        <LazyBackgroundImage style={paint} />
      ) : paint ? (
        <div class="absolute inset-0" style={paint} />
      ) : null}
      {overlay ? <div class="absolute inset-0" style={overlay} /> : null}
      {bg.type === 'particles' ? (
        <LazyParticlesBackground
          key={particlesConfigKey({
            density: bg.particles_density,
            speed: bg.particles_speed,
            opacity: bg.particles_opacity,
            size: bg.particles_size,
            color: bg.particles_color,
            colorDark: bg.dark?.particles_color,
          })}
          density={bg.particles_density}
          speed={bg.particles_speed}
          opacity={bg.particles_opacity}
          size={bg.particles_size}
          color={bg.particles_color}
          colorDark={bg.dark?.particles_color}
          layout="contained"
        />
      ) : null}
      {bg.type === 'animated_rain' ? (
        <RainLinesBackground
          color={bg.rain_color}
          colorDark={bg.dark?.rain_color}
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
