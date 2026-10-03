import { SvgIcon } from '~/components/marketing/SvgIcon';
import { parseIconValue, type IconValue } from '~/lib/icons/icon-value';
import { parseHighlightedText } from '~/lib/marketing/highlighted-text';

/*
 * Inline components (not `component$`) so builder edits re-render with the hero section,
 * matching `SvgIcon`. Styles live in `widgets/hero-parts.css`, loaded by `HeroHomeSection`.
 */

export type HeroTechItem = { id: string; icon: IconValue; label: string };

/** Repeater rows → renderable items; rows without a valid icon are skipped. */
export function normalizeHeroTechItems(raw: unknown): HeroTechItem[] {
  if (!Array.isArray(raw)) return [];
  const items: HeroTechItem[] = [];
  raw.forEach((row, index) => {
    if (!row || typeof row !== 'object') return;
    const r = row as Record<string, unknown>;
    const icon = parseIconValue(r.icon);
    if (!icon) return;
    const label = typeof r.label === 'string' ? r.label.trim() : '';
    const id = typeof r.id === 'string' && r.id ? r.id : `tech_${index}`;
    items.push({ id, icon, label });
  });
  return items;
}

export const HeroBadge = (props: { text: string; icon: unknown }) => {
  const hasIcon = parseIconValue(props.icon) !== null;
  if (!props.text && !hasIcon) return null;
  return (
    <p class="hh-badge">
      {/* Optional leading icon, coloured via the Badge style group */}
      {hasIcon ? <SvgIcon value={props.icon} size={16} class="hh-badge-icon" /> : null}
      {props.text ? <span>{props.text}</span> : null}
    </p>
  );
};

/** Headline text with `[[...]]` runs wrapped in the highlight span. */
export const HeroHeadlineText = (props: { text: string }) => (
  <>
    {parseHighlightedText(props.text).map((segment, index) =>
      segment.highlight ? (
        <span key={index} class="hh-mark">
          {segment.text}
        </span>
      ) : (
        segment.text
      ),
    )}
  </>
);

export type HeroTechLayout = 'stacked' | 'inline';

/** Unknown or missing values keep the original stacked look. */
export function normalizeHeroTechLayout(raw: unknown): HeroTechLayout {
  return raw === 'inline' ? 'inline' : 'stacked';
}

export const HeroTechRow = (props: {
  label: string;
  divider: boolean;
  layout: HeroTechLayout;
  items: HeroTechItem[];
}) => {
  if (props.items.length === 0) return null;
  return (
    <div
      class={['hh-tech', props.divider ? 'hh-tech-divided' : '', props.layout === 'inline' ? 'hh-tech-inline' : '']
        .filter(Boolean)
        .join(' ')}
    >
      {/* Section label, e.g. "Tech ecosystem" */}
      {props.label ? <p class="hh-tech-label">{props.label}</p> : null}
      <ul class="hh-tech-list" aria-label={props.label || undefined}>
        {props.items.map((item) => (
          <li key={item.id} class="hh-tech-item" title={item.label || undefined}>
            <SvgIcon value={item.icon} size={28} class="hh-tech-icon" />
            {/* Icons are decorative SVGs; the label stays available to screen readers */}
            {item.label ? <span class="sr-only">{item.label}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
};
