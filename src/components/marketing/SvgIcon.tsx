import { parseIconValue } from '~/lib/icons/icon-value';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';

export type SvgIconProps = {
  /** Raw `icon` setting (legacy name, set icon object or uploaded SVG ref). */
  value: unknown;
  size?: number;
  class?: string;
};

/**
 * Inline, self-hosted icon: no icon font, script or external request on the public site.
 * Inline component (not `component$`) so builder edits to icon/colour re-render with the parent;
 * callers often pass loop items, whose member props Qwik would otherwise freeze.
 */
export const SvgIcon = (props: SvgIconProps) => {
  const icon = parseIconValue(props.value);
  if (!icon) return null;
  const size = icon.size ?? props.size ?? 24;
  // Inline so a size picked on the icon beats widget CSS (e.g. `.tl-mark svg { width: … }`).
  const sizeStyle = icon.size ? { width: `${icon.size}px`, height: `${icon.size}px` } : {};

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
        style={icon.size ? sizeStyle : undefined}
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
      style={icon.color || icon.size ? { ...sizeStyle, ...(icon.color ? { color: icon.color } : {}) } : undefined}
      dangerouslySetInnerHTML={icon.body}
    />
  );
};
