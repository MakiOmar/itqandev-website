import { component$, useStyles$ } from '@builder.io/qwik';
import { SvgIcon } from '~/components/marketing/SvgIcon';
import styles from './trust-badges.css?inline';

type TrustBadge = { key: string; icon: unknown; text: string };

/** Only plain colour tokens may reach the style attribute (no url(), expressions, or declarations). */
const SAFE_COLOR_RE =
  /^(#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([\d\s.,%/+-]+\)|var\(--[a-z0-9-]+\)|[a-z]{3,20})$/i;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

function readBadges(raw: unknown): TrustBadge[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row, i) => ({
      key: typeof row.id === 'string' && row.id ? row.id : `badge-${i}`,
      icon: row.icon,
      text: typeof row.text === 'string' ? row.text.trim() : '',
    }))
    .filter((b) => b.text !== '' || (b.icon !== '' && b.icon != null));
}

/** `trust_badges` page-builder widget: icon + text badges with responsive layout and row dividers. */
export const TrustBadgesWidget = component$<{ settings: Record<string, unknown> }>((props) => {
  useStyles$(styles);
  const s = props.settings;
  const badges = readBadges(s.badges);
  if (badges.length === 0) return null;

  const iconSize = clampNumber(s.icon_size, 16, 96, 28);
  const dividerColor = typeof s.divider_color === 'string' ? s.divider_color.trim() : '';
  const cssVars: Record<string, string> = {
    '--tb-divider-h': `${clampNumber(s.divider_height, 8, 120, 32)}px`,
  };
  if (dividerColor && SAFE_COLOR_RE.test(dividerColor)) {
    cssVars['--tb-divider-color'] = dividerColor;
  }

  return (
    <ul
      class="tb-list"
      data-icon={pick(s.icon_position, ['inline', 'stacked'] as const, 'inline')}
      data-align={pick(s.align, ['start', 'center', 'end'] as const, 'center')}
      data-mobile={pick(s.mobile_layout, ['stacked', 'two_columns'] as const, 'stacked')}
      data-tablet={pick(s.tablet_layout, ['inline', 'two_columns'] as const, 'inline')}
      data-divider={pick(s.divider_style, ['solid', 'dashed', 'dotted', 'dash_dot'] as const, 'solid')}
      data-dividers={s.show_dividers === false ? undefined : ''}
      style={cssVars}
    >
      {badges.map((badge) => (
        <li key={badge.key} class="tb-item">
          {/* Icon is decorative; the text carries the meaning */}
          {badge.icon ? (
            <span class="shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true">
              <SvgIcon value={badge.icon} size={iconSize} />
            </span>
          ) : null}
          {badge.text ? (
            <span class="text-sm font-medium text-slate-800 dark:text-slate-100">{badge.text}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
});
