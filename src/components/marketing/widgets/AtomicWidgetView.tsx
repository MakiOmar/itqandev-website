import { component$ } from '@builder.io/qwik';
import { Button } from '~/components/marketing/Button';
import { MarketingImageLightbox } from '~/components/marketing/MarketingImageLightbox';
import { LottiePlayer } from '~/components/marketing/widgets/LottiePlayer';

export type AtomicWidgetProps = {
  type: string;
  settings: Record<string, unknown>;
  uiLocale: string;
  /** When true, image fit/radius come from the Style wrapper CSS variables. */
  styled?: boolean;
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
      const styled = props.styled === true;
      const radius = styled ? '' : RADIUS[str(s, 'radius', 'lg')] || RADIUS.lg;
      const fit = styled
        ? ''
        : str(s, 'object_fit', 'cover') === 'contain'
          ? 'object-contain'
          : 'object-cover';
      const img = (
        <img
          src={url}
          alt={str(s, 'alt') || str(s, 'image_alt') || ''}
          class={styled ? 'b-styled-media' : `w-full ${radius} ${fit}`}
          loading="lazy"
        />
      );
      const link = str(s, 'link_url');
      const lightbox = s.lightbox === true;
      const wrapped = lightbox ? <MarketingImageLightbox>{img}</MarketingImageLightbox> : img;
      return (
        <figure>
          {link && !lightbox ? (
            <a
              href={link}
              target={s.open_in_new_tab ? '_blank' : undefined}
              rel={s.open_in_new_tab ? 'noopener noreferrer' : undefined}
            >
              {img}
            </a>
          ) : (
            wrapped
          )}
          {str(s, 'caption') ? (
            <figcaption
              class={styled ? 'b-styled-caption' : 'mt-2 text-center text-sm text-slate-500'}
            >
              {str(s, 'caption')}
            </figcaption>
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
      const overlayId = Number(s.overlay_id);
      const href = str(s, 'url') || '#';
      const extra =
        Number.isInteger(overlayId) && overlayId > 0
          ? { 'data-overlay-id': String(overlayId) }
          : {};
      return (
        <Button href={href} variant={style} {...extra}>
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
        <div class="overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm ring-1 ring-slate-900/5 dark:border-slate-700/80 dark:ring-white/5">
          <iframe
            src={url}
            title="Map"
            class="w-full border-0"
            style={{ height: `${num(s, 'height', 360)}px` }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
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
    case 'lottie': {
      const src = str(s, 'url') || str(s, 'media_url') || str(s, 'src');
      if (!src) return <div class="b-lottie rounded-xl bg-slate-100 p-8 text-center text-sm text-slate-500 dark:bg-slate-800">Lottie</div>;
      return (
        <LottiePlayer
          src={src}
          loop={s.loop !== false}
          autoplay={s.autoplay !== false}
          speed={num(s, 'speed', 1)}
          playInView={s.play_in_view !== false}
        />
      );
    }
    case 'flip_box':
      return (
        <div class="b-flip group relative h-56 w-full" tabIndex={0}>
          <div class="b-flip-inner relative h-full w-full rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 backface-hidden">
              <p class="text-lg font-semibold text-slate-900 dark:text-white">{str(s, 'front_heading', 'Front')}</p>
              <p class="text-sm text-slate-600 dark:text-slate-300">{str(s, 'front_text')}</p>
            </div>
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 [transform:rotateY(180deg)] backface-hidden">
              <p class="text-lg font-semibold text-slate-900 dark:text-white">{str(s, 'back_heading', 'Back')}</p>
              <p class="text-sm text-slate-600 dark:text-slate-300">{str(s, 'back_text')}</p>
              {str(s, 'back_url') ? (
                <a class="text-sm font-medium text-primary-600" href={str(s, 'back_url')}>
                  {str(s, 'back_label', 'Learn more')}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      );
    case 'post_title':
      return <h1 class="text-3xl font-bold text-slate-900 dark:text-white">{str(s, 'text') || str(s, 'fallback', 'Title')}</h1>;
    case 'post_excerpt':
      return <p class="text-lg text-slate-600 dark:text-slate-300">{str(s, 'text') || str(s, 'fallback')}</p>;
    case 'post_content':
      return (
        <div class="prose prose-slate max-w-none dark:prose-invert" dangerouslySetInnerHTML={str(s, 'html') || str(s, 'content') || str(s, 'fallback')} />
      );
    case 'post_featured_image': {
      const url = str(s, 'image') || str(s, 'url');
      if (!url) return null;
      return <img src={url} alt="" class="w-full rounded-xl" loading="lazy" />;
    }
    case 'post_info':
      return (
        <p class="text-sm text-slate-500">
          {s.show_date !== false ? str(s, 'date') : ''}
          {s.show_terms !== false && str(s, 'terms') ? ` · ${str(s, 'terms')}` : ''}
        </p>
      );
    case 'archive_title':
      return <h1 class="text-3xl font-bold text-slate-900 dark:text-white">{str(s, 'text') || str(s, 'fallback', 'Archive')}</h1>;
    case 'loop_grid': {
      const items = Array.isArray(s.items) ? (s.items as Array<Record<string, unknown>>) : [];
      const mode = str(s, 'mode', 'grid');
      return (
        <div class={mode === 'carousel' ? 'flex gap-4 overflow-x-auto' : 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'}>
          {items.map((item, i) => (
            <a
              key={i}
              href={String(item.url || '#')}
              class="block rounded-xl border border-slate-200 p-4 hover:border-primary-400 dark:border-slate-700"
            >
              <h3 class="font-semibold text-slate-900 dark:text-white">{String(item.title || '')}</h3>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{String(item.excerpt || '')}</p>
            </a>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
});
