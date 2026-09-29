import { normalizeResponsiveColumns, type ResponsiveColumns } from '~/lib/marketing/grid-columns';
import type { TestimonialCardVariant } from '~/components/marketing/TestimonialCard';

export const CAROUSEL_ARROWS_POSITIONS = [
  'sides',
  'top_left',
  'top_center',
  'top_right',
  'top_between',
  'bottom_left',
  'bottom_center',
  'bottom_right',
  'bottom_between',
] as const;

export type CarouselArrowsPosition = (typeof CAROUSEL_ARROWS_POSITIONS)[number];

export type TestimonialListOptions = {
  arrowsPosition: CarouselArrowsPosition;
  title: string;
  subtitle: string;
  layout: 'grid' | 'carousel';
  limit: number;
  columns: ResponsiveColumns;
  cardStyle: TestimonialCardVariant;
  showRating: boolean;
  showAvatar: boolean;
  showRole: boolean;
  showProject: boolean;
  autoplay: boolean;
  autoplayMs: number;
};

const DEFAULT_COLUMNS: ResponsiveColumns = { mobile: 1, tablet: 2, desktop: 3 };

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function flag(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === 1 || raw === '1' || raw === 'true') return true;
  if (raw === 0 || raw === '0' || raw === 'false') return false;
  return fallback;
}

/** Normalized `testimonial_list` widget settings (mirrors WidgetRegistry defaults). */
export function testimonialListOptions(settings: Record<string, unknown>): TestimonialListOptions {
  return {
    title: typeof settings.title === 'string' ? settings.title.trim() : '',
    subtitle: typeof settings.subtitle === 'string' ? settings.subtitle.trim() : '',
    layout: settings.layout === 'carousel' ? 'carousel' : 'grid',
    limit: clampInt(settings.limit, 1, 24, 6),
    columns: settings.columns ? normalizeResponsiveColumns(settings.columns) : { ...DEFAULT_COLUMNS },
    cardStyle: settings.card_style === 'minimal' ? 'minimal' : 'card',
    showRating: flag(settings.show_rating, true),
    showAvatar: flag(settings.show_avatar, true),
    showRole: flag(settings.show_role, true),
    showProject: flag(settings.show_project, true),
    autoplay: flag(settings.autoplay, false),
    autoplayMs: clampInt(settings.autoplay_seconds, 3, 15, 6) * 1000,
    arrowsPosition: (CAROUSEL_ARROWS_POSITIONS as readonly string[]).includes(String(settings.arrows_position))
      ? (settings.arrows_position as CarouselArrowsPosition)
      : 'sides',
  };
}
