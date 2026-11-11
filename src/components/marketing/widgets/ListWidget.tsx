import { component$, useStyles$ } from '@builder.io/qwik';
import { SvgIcon } from '~/components/marketing/SvgIcon';
import { localizeInAppHref } from '~/lib/i18n/ui-locale-path';
import { linkTargetAttrs } from '~/lib/marketing/link-target';
import styles from './list-widget.css?inline';

type ListItem = { text?: unknown; url?: unknown; open_in_new_tab?: unknown };

function isDynamic(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * `list` widget: manual or dynamic (current record's relation) items. Markers, layout and item boxes come
 * from the Style tab (`list-widget.css`); a marker icon replaces the CSS markers.
 */
export const ListWidget = component$<{ settings: Record<string, unknown>; uiLocale: string }>((props) => {
  useStyles$(styles);
  const s = props.settings;
  const Tag = s.style === 'ol' ? 'ol' : 'ul';
  const icon = s.marker_icon != null && s.marker_icon !== '' ? s.marker_icon : null;
  const marker = icon ? (
    <span class="awl-icon" aria-hidden="true">
      <SvgIcon value={icon} />
    </span>
  ) : null;

  // Dynamic items are filled server-side; unresolved (builder without a preview record) shows the source tag.
  if (isDynamic(s.dynamic_items) && s.items_resolved !== true) {
    const source = typeof s.items_source === 'string' ? s.items_source.split(':')[0] : '';
    return (
      <Tag class="awl">
        <li class="opacity-60">
          {marker}
          {`{{${source || '…'}}}`}
        </li>
      </Tag>
    );
  }

  const items = Array.isArray(s.items) ? (s.items as ListItem[]) : [];
  if (items.length === 0) return null;
  return (
    <Tag class="awl">
      {items.map((it, i) => {
        const text = String(it.text ?? '');
        const href = it.url ? localizeInAppHref(props.uiLocale, String(it.url)) : '';
        return (
          <li key={i}>
            {marker}
            {href ? (
              <a href={href} {...linkTargetAttrs(href, it.open_in_new_tab)}>
                {text}
              </a>
            ) : (
              <span>{text}</span>
            )}
          </li>
        );
      })}
    </Tag>
  );
});
