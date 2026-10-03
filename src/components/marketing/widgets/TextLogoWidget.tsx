import { component$, useStyles$ } from '@builder.io/qwik';
import { SvgIcon } from '~/components/marketing/SvgIcon';
import { marketingRoutes } from '~/lib/marketing/constants';
import { parseHighlightedText, stripHighlightMarkers } from '~/lib/marketing/highlighted-text';
import styles from './text-logo.css?inline';

/** Script-capable schemes never reach `href`; anything else (relative, http(s), mailto, tel) passes. */
const UNSAFE_HREF_RE = /^\s*(?:javascript|data|vbscript):/i;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function logoHref(raw: unknown, uiLocale: string): string {
  const url = text(raw);
  return url && !UNSAFE_HREF_RE.test(url) ? url : marketingRoutes(uiLocale).home;
}

/** `text_logo` widget: mark tile (short text or icon), brand name with an emphasised `[[run]]`, tagline. */
export const TextLogoWidget = component$<{ settings: Record<string, unknown>; uiLocale: string }>((props) => {
  useStyles$(styles);
  const s = props.settings;
  const name = text(s.name);
  const tagline = text(s.tagline);
  const markType = s.mark_type === 'icon' || s.mark_type === 'none' ? s.mark_type : 'text';
  const markText = text(s.mark_text).slice(0, 4);
  const hasIcon = markType === 'icon' && s.mark_icon != null && s.mark_icon !== '';
  const showMark = hasIcon || (markType === 'text' && markText !== '');
  if (!name && !tagline && !showMark) return null;

  return (
    <a
      href={logoHref(s.link_url, props.uiLocale)}
      class="tl"
      data-layout={s.layout === 'stacked' ? 'stacked' : 'inline'}
      aria-label={stripHighlightMarkers(name) || undefined}
    >
      {/* Mark tile is decorative; the name carries the accessible label */}
      {showMark ? (
        <span class="tl-mark" aria-hidden="true">
          {hasIcon ? <SvgIcon value={s.mark_icon} /> : markText}
        </span>
      ) : null}
      {name || tagline ? (
        <span class="tl-text">
          {name ? (
            <span class="tl-name">
              {parseHighlightedText(name).map((seg, i) =>
                seg.highlight ? (
                  <span key={i} class="tl-em">
                    {seg.text}
                  </span>
                ) : (
                  seg.text
                ),
              )}
            </span>
          ) : null}
          {tagline ? <span class="tl-tagline">{tagline}</span> : null}
        </span>
      ) : null}
    </a>
  );
});
