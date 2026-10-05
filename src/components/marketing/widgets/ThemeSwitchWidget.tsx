import { component$, useStyles$ } from '@builder.io/qwik';
import { SvgIcon } from '~/components/marketing/SvgIcon';
import { toggleDocumentTheme } from '~/lib/theme/theme-scope';
import {
  floatingCorner,
  floatingOffset,
  settingBool,
  settingText,
} from '~/components/marketing/widgets/floating-widget-settings';
import styles from './theme-switch.css?inline';

export type ThemeSwitchWidgetProps = {
  settings: Record<string, unknown>;
  /** Builder canvas: always inline so the block stays selectable where it was placed. */
  editorPreview?: boolean;
};

/**
 * `theme_switch` widget. The visible icon / label follow the theme scope in CSS, so the server
 * render is correct before hydration and no task runs on load.
 */
export const ThemeSwitchWidget = component$<ThemeSwitchWidgetProps>((props) => {
  useStyles$(styles);
  const s = props.settings;
  const variant = s.variant === 'switch' ? 'switch' : 'icon';
  const floating = settingBool(s.floating) && !props.editorPreview;
  const showLabel = settingBool(s.show_label);
  const lightLabel = settingText(s.light_label) || 'Dark mode';
  const darkLabel = settingText(s.dark_label) || 'Light mode';
  const labelClass = showLabel ? 'tsw-lbl' : 'sr-only';
  const icons = (
    <>
      <span class="tsw-ic" data-when="light" aria-hidden="true">
        <SvgIcon value={s.light_icon} />
      </span>
      <span class="tsw-ic" data-when="dark" aria-hidden="true">
        <SvgIcon value={s.dark_icon} />
      </span>
    </>
  );

  return (
    <div
      class="tsw"
      data-variant={variant}
      data-floating={floating ? '' : undefined}
      data-corner={floating ? floatingCorner(s.corner) : undefined}
      style={
        floating
          ? { '--tsw-ox': `${floatingOffset(s.offset_x)}px`, '--tsw-oy': `${floatingOffset(s.offset_y)}px` }
          : undefined
      }
    >
      {/* The label naming the mode it switches to doubles as the accessible name */}
      <button
        type="button"
        class="tsw-btn"
        data-labelled={showLabel ? '' : undefined}
        onClick$={() => {
          toggleDocumentTheme();
        }}
      >
        {variant === 'switch' ? (
          <span class="tsw-track" aria-hidden="true">
            <span class="tsw-knob">{icons}</span>
          </span>
        ) : (
          icons
        )}
        <span class={labelClass} data-when="light">
          {lightLabel}
        </span>
        <span class={labelClass} data-when="dark">
          {darkLabel}
        </span>
      </button>
    </div>
  );
});
