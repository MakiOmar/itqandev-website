import { component$ } from '@builder.io/qwik';
import { parseIconValue } from '~/lib/icons/icon-value';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';

export type SvgIconProps = {
  /** Raw `icon` setting (legacy name, set icon object or uploaded SVG ref). */
  value: unknown;
  size?: number;
  class?: string;
};

/** Inline, self-hosted icon: no icon font, script or external request on the public site. */
export const SvgIcon = component$<SvgIconProps>((props) => {
  const icon = parseIconValue(props.value);
  if (!icon) return null;
  const size = props.size ?? 24;

  if (icon.library === 'svg') {
    return (
      <img
        src={resolveLaravelMediaUrl(icon.url) || icon.url}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        loading="lazy"
        class={['inline-block object-contain', props.class].filter(Boolean).join(' ')}
      />
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.view_box}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      class={['inline-block shrink-0', props.class].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={icon.body}
    />
  );
});
