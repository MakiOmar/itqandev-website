import { component$, useStyles$ } from '@builder.io/qwik';
import { localizeInAppHref } from '~/lib/i18n/ui-locale-path';
import { linkTargetAttrs } from '~/lib/marketing/link-target';
import styles from './button-widget.css?inline';

const VARIANTS = new Set(['primary', 'secondary', 'outline', 'ghost']);

type ButtonRow = {
  label?: unknown;
  url?: unknown;
  style?: unknown;
  overlay_id?: unknown;
  open_in_new_tab?: unknown;
  rel?: unknown;
};

function variantClass(style: unknown): string {
  const v = typeof style === 'string' && VARIANTS.has(style) ? style : 'primary';
  return `awb awb-${v}`;
}

function overlayAttrs(value: unknown): Record<string, string> {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? { 'data-overlay-id': String(id) } : {};
}

/**
 * `button` and `button_group` widgets. Colours, hover, border, size and shadow come from the Style tab
 * (`btn_primary_*` → button-widget.css); the variant only picks the defaults.
 */
export const ButtonWidget = component$<{ type: string; settings: Record<string, unknown>; uiLocale: string }>(
  (props) => {
    useStyles$(styles);
    const s = props.settings;
    const rows: ButtonRow[] =
      props.type === 'button_group'
        ? Array.isArray(s.buttons)
          ? (s.buttons as ButtonRow[])
          : []
        : [
            {
              label: s.label,
              url: s.url,
              style: s.style,
              overlay_id: s.overlay_id,
              open_in_new_tab: s.open_in_new_tab,
              rel: s.rel,
            },
          ];

    const links = rows.map((b, i) => {
      const href = localizeInAppHref(props.uiLocale, String(b.url ?? '')) || '#';
      return (
        <a
          key={i}
          href={href}
          class={variantClass(b.style)}
          {...linkTargetAttrs(href, b.open_in_new_tab, b.rel)}
          {...overlayAttrs(b.overlay_id)}
        >
          {String(b.label || 'Button')}
        </a>
      );
    });

    return props.type === 'button_group' ? <div class="flex flex-wrap gap-3">{links}</div> : links[0];
  },
);
