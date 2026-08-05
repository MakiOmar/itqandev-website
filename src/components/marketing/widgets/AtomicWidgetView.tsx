import { component$ } from '@builder.io/qwik';
import { Button } from '~/components/marketing/Button';
import { MarketingImageLightbox } from '~/components/marketing/MarketingImageLightbox';
import { marketingRoutes } from '~/lib/marketing/constants';

export type AtomicWidgetProps = {
  type: string;
  settings: Record<string, unknown>;
  uiLocale: string;
};

function str(s: Record<string, unknown>, key: string, fallback = ''): string {
  const v = s[key];
  return typeof v === 'string' ? v : v != null ? String(v) : fallback;
}

function num(s: Record<string, unknown>, key: string, fallback: number): number {
  const v = Number(s[key]);
  return Number.isFinite(v) ? v : fallback;
}

function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const ALIGN: Record<string, string> = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
};

const RADIUS: Record<string, string> = {
  none: 'rounded-none',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/**
 * Public atomic page-builder widgets.
 */
export const AtomicWidgetView = component$<AtomicWidgetProps>((props) => {
  const s = props.settings;
  switch (props.type) {
    case 'heading': {
      const level = str(s, 'level', 'h2');
      const text = str(s, 'text', 'Heading');
      const align = ALIGN[str(s, 'align', 'start')] || ALIGN.start;
      const cls = `font-bold tracking-tight text-slate-900 dark:text-white ${align} ${
        level === 'h1' ? 'text-4xl sm:text-5xl' : level === 'h3' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
      }`;
      if (level === 'h1') return <h1 class={cls}>{text}</h1>;
      if (level === 'h3') return <h3 class={cls}>{text}</h3>;
      if (level === 'h4') return <h4 class={cls}>{text}</h4>;
      if (level === 'h5') return <h5 class={cls}>{text}</h5>;
      if (level === 'h6') return <h6 class={cls}>{text}</h6>;
      return <h2 class={cls}>{text}</h2>;
    }
    case 'text': {
      const align = ALIGN[str(s, 'align', 'start')] || ALIGN.start;
      return (
        <p class={`whitespace-pre-wrap text-slate-600 dark:text-slate-300 ${align}`}>
          {str(s, 'content')}
        </p>
      );
    }
    case 'rich_text':
      return (
        <div
          class="prose prose-slate max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={str(s, 'html')}
        />
      );
    case 'list': {
      const items = Array.isArray(s.items) ? (s.items as Array<{ text?: string }>) : [];
      const Tag = str(s, 'style', 'ul') === 'ol' ? 'ol' : 'ul';
      return (
        <Tag class={Tag === 'ol' ? 'list-decimal space-y-1 ps-5' : 'list-disc space-y-1 ps-5'}>
          {items.map((it, i) => (
            <li key={i}>{String(it.text ?? '')}</li>
          ))}
        </Tag>
      );
    }
    case 'quote':
      return (
        <blockquote class="border-s-4 border-primary-500 ps-4 italic text-slate-700 dark:text-slate-200">
          <p>{str(s, 'quote')}</p>
          {str(s, 'cite') ? (
            <cite class="mt-2 block text-sm not-italic text-slate-500">— {str(s, 'cite')}</cite>
          ) : null}
        </blockquote>
      );
    case 'badge':
      return (
        <span class="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
          {str(s, 'text', 'Badge')}
        </span>
      );
    case 'image': {
      const url = str(s, 'image') || str(s, 'image_url');
      if (!url) return null;
      const radius = RADIUS[str(s, 'radius', 'lg')] || RADIUS.lg;
      const fit = str(s, 'object_fit', 'cover') === 'contain' ? 'object-contain' : 'object-cover';
      const img = (
        <img
          src={url}
          alt={str(s, 'alt') || str(s, 'image_alt') || ''}
          class={`w-full ${radius} ${fit}`}
          loading="lazy"
        />
      );
      const link = str(s, 'link_url');
      return (
        <figure>
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer">
              {img}
            </a>
          ) : (
            img
          )}
          {str(s, 'caption') ? (
            <figcaption class="mt-2 text-center text-sm text-slate-500">{str(s, 'caption')}</figcaption>
          ) : null}
        </figure>
      );
    }
    case 'gallery': {
      const images = Array.isArray(s.images) ? (s.images as Array<Record<string, unknown>>) : [];
      const urls = images
        .map((img) => ({
          src: String(img.image ?? img.url ?? ''),
          alt: String(img.alt ?? ''),
        }))
        .filter((x) => x.src);
      if (!urls.length) return null;
      return (
        <MarketingImageLightbox class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {urls.map((img, i) => (
            <img
              key={i}
              src={img.src}
              alt={img.alt}
              class="h-40 w-full cursor-zoom-in rounded-lg object-cover"
              loading="lazy"
            />
          ))}
        </MarketingImageLightbox>
      );
    }
    case 'video': {
      const raw = str(s, 'video_url');
      const embed = youtubeEmbed(raw);
      if (!embed && !raw) return null;
      const aspect = str(s, 'aspect', '16:9');
      const pad =
        aspect === '1:1' ? 'pb-[100%]' : aspect === '4:3' ? 'pb-[75%]' : 'pb-[56.25%]';
      return (
        <div class={`relative w-full overflow-hidden rounded-lg ${pad}`}>
          <iframe
            class="absolute inset-0 h-full w-full"
            src={embed || raw}
            title="Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullscreen
            loading="lazy"
          />
        </div>
      );
    }
    case 'icon': {
      const name = str(s, 'icon', '★');
      const size = num(s, 'size', 32);
      return (
        <span class="inline-flex text-primary-600 dark:text-primary-400" style={{ fontSize: `${size}px` }} aria-hidden="true">
          {name === 'star' ? '★' : name === 'check' ? '✓' : name === 'heart' ? '♥' : name}
        </span>
      );
    }
    case 'embed': {
      const html = str(s, 'html');
      if (!html || !/<iframe\b/i.test(html)) return null;
      return <div class="overflow-hidden rounded-lg" dangerouslySetInnerHTML={html} />;
    }
    case 'button': {
      const style = str(s, 'style', 'primary') as 'primary' | 'secondary' | 'outline' | 'ghost';
      const href = str(s, 'url') || '#';
      return (
        <Button href={href} variant={style}>
          {str(s, 'label', 'Button')}
        </Button>
      );
    }
    case 'button_group': {
      const buttons = Array.isArray(s.buttons) ? (s.buttons as Array<Record<string, unknown>>) : [];
      return (
        <div class="flex flex-wrap gap-3">
          {buttons.map((b, i) => (
            <Button
              key={i}
              href={String(b.url || '#')}
              variant={(String(b.style || 'primary') as 'primary') || 'primary'}
            >
              {String(b.label || 'Button')}
            </Button>
          ))}
        </div>
      );
    }
    case 'spacer':
      return <div aria-hidden="true" style={{ height: `${num(s, 'height', 48)}px` }} />;
    case 'divider': {
      const spacing = num(s, 'spacing', 24);
      const dashed = str(s, 'style', 'line') === 'dashed';
      return (
        <hr
          class={dashed ? 'border-dashed border-slate-300 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700'}
          style={{ marginTop: `${spacing}px`, marginBottom: `${spacing}px` }}
        />
      );
    }
    case 'anchor': {
      const id = str(s, 'anchor_id', 'section').replace(/[^a-zA-Z0-9_-]/g, '');
      return <div id={id || undefined} class="scroll-mt-24" />;
    }
    case 'breadcrumb': {
      const homeLabel = str(s, 'home_label', 'Home');
      const items = Array.isArray(s.items) ? (s.items as Array<Record<string, unknown>>) : [];
      const homeHref = marketingRoutes(props.uiLocale).home;
      const crumbs = [
        { label: homeLabel, href: homeHref },
        ...items
          .filter((c) => String(c.label || '').trim())
          .map((c) => ({
            label: String(c.label || ''),
            href: String(c.url || '').trim() || undefined,
          })),
      ];
      return (
        <nav aria-label="Breadcrumb">
          <ol class="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            {crumbs.map((c, i) => (
              <li key={i} class="flex items-center gap-1">
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {c.href && i < crumbs.length - 1 ? (
                  <a href={c.href} class="hover:text-primary-600 dark:hover:text-primary-400">
                    {c.label}
                  </a>
                ) : (
                  <span
                    class={
                      i === crumbs.length - 1
                        ? 'font-medium text-slate-800 dark:text-slate-100'
                        : undefined
                    }
                    aria-current={i === crumbs.length - 1 ? 'page' : undefined}
                  >
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      );
    }
    case 'map': {
      const url = str(s, 'embed_url');
      if (!url) return null;
      return (
        <iframe
          src={url}
          title="Map"
          class="w-full rounded-lg border-0"
          style={{ height: `${num(s, 'height', 320)}px` }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      );
    }
    case 'social_links': {
      const links = Array.isArray(s.links) ? (s.links as Array<Record<string, unknown>>) : [];
      return (
        <ul class="flex flex-wrap gap-3">
          {links
            .filter((l) => String(l.url || ''))
            .map((l, i) => (
              <li key={i}>
                <a
                  href={String(l.url)}
                  class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {String(l.label || l.url)}
                </a>
              </li>
            ))}
        </ul>
      );
    }
    default:
      return null;
  }
});
