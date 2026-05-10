import { $, useSignal, type Signal } from '@builder.io/qwik';
import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

export type ContentSlugEntity = 'projects' | 'blog_posts' | 'services' | 'categories' | 'skills';

export type SuggestSlugOptions = {
  ignoreId?: number;
};

/**
 * Calls the Laravel suggest endpoint — server applies Str::slug() plus unique -2, -3, … suffixes.
 */
export async function suggestUniqueContentSlug(
  entity: ContentSlugEntity,
  source: string,
  options?: SuggestSlugOptions,
): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  const trimmed = String(source ?? '').trim();
  if (!trimmed) {
    return null;
  }
  try {
    const res = await (getApiClient(null) as { post<T>(path: string, body: unknown): Promise<{ data?: T }> }).post<{
      slug?: string;
    }>(API_ENDPOINTS.CONTENT_SLUGS.SUGGEST, {
      entity,
      source: trimmed,
      ignore_id: options?.ignoreId,
    });
    const body = res?.data;
    const slug = body?.slug != null ? String(body.slug) : '';
    return slug || null;
  } catch {
    return null;
  }
}

export async function applyUniqueContentSlugToDomInput(
  entity: ContentSlugEntity,
  source: string,
  slugSelector: string,
  options?: SuggestSlugOptions,
): Promise<void> {
  const slug = await suggestUniqueContentSlug(entity, source, options);
  if (!slug || typeof document === 'undefined') {
    return;
  }
  const el = document.querySelector(slugSelector) as HTMLInputElement | null;
  if (el) {
    el.value = slug;
  }
}

type FormWithSlug = { slug: string };

function normalizeIgnoreRecordId(signal: Signal<number | null | undefined> | undefined): number | undefined {
  if (!signal) {
    return undefined;
  }
  const v = signal.value;
  if (v == null) {
    return undefined;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Controlled forms with a dedicated title/name field — WordPress-style auto slug from title/name blur.
 *
 * @param ignoreRecordId Optional signal — use a reactive id (never a plain closure) so QRLs serialize.
 */
export function useContentSlugAutosuggestForm<T extends FormWithSlug>(
  entity: ContentSlugEntity,
  form: Signal<T>,
  titleKey: keyof T & string,
  ignoreRecordId?: Signal<number | null | undefined>,
) {
  /** When true, blurring the title field will not regenerate the slug from the title. */
  const slugLocked = useSignal(false);

  const resetSlugAutoLock$ = $(() => {
    slugLocked.value = false;
  });

  const onTitleBlurSuggestSlug$ = $(async () => {
    if (slugLocked.value) {
      return;
    }
    const raw = String(((form.value as T)[titleKey] as string | undefined) ?? '').trim();
    if (!raw) {
      return;
    }
    const slug = await suggestUniqueContentSlug(entity, raw, {
      ignoreId: normalizeIgnoreRecordId(ignoreRecordId),
    });
    if (slug) {
      form.value = { ...form.value, slug };
    }
  });

  const onSlugInputLocksAutoFromTitle$ = $(() => {
    slugLocked.value = true;
  });

  const onSlugBlurEnsureUnique$ = $(async () => {
    const raw = String(form.value.slug ?? '').trim();
    if (!raw) {
      return;
    }
    const slug = await suggestUniqueContentSlug(entity, raw, {
      ignoreId: normalizeIgnoreRecordId(ignoreRecordId),
    });
    if (slug) {
      form.value = { ...form.value, slug };
    }
  });

  return {
    slugLocked,
    resetSlugAutoLock$,
    onTitleBlurSuggestSlug$,
    onSlugInputLocksAutoFromTitle$,
    onSlugBlurEnsureUnique$,
  };
}

/**
 * Uncontrolled / native inputs identified by selectors (IDs or other query selectors).
 */
export function useContentSlugAutosuggestDom(args: {
  entity: ContentSlugEntity;
  ignoreId?: number;
}) {
  const slugLocked = useSignal(false);

  const onTitleBlur$ = $(async (ev: FocusEvent) => {
    if (slugLocked.value) {
      return;
    }
    const title = String((ev.target as HTMLInputElement).value ?? '').trim();
    if (!title) {
      return;
    }
    await applyUniqueContentSlugToDomInput(args.entity, title, '#slug', { ignoreId: args.ignoreId });
  });

  const onSlugInput$ = $(() => {
    slugLocked.value = true;
  });

  const onSlugBlur$ = $(async (ev: FocusEvent) => {
    const curr = String((ev.target as HTMLInputElement).value ?? '').trim();
    if (!curr) {
      return;
    }
    await applyUniqueContentSlugToDomInput(args.entity, curr, '#slug', { ignoreId: args.ignoreId });
  });

  return { onTitleBlur$, onSlugInput$, onSlugBlur$ };
}

/**
 * Two signals: title + slug (e.g. project/blog edit screens).
 */
export function useContentSlugAutosuggestTitleSlugSignals(args: {
  entity: ContentSlugEntity;
  title: Signal<string>;
  slug: Signal<string>;
  ignoreRecordId?: number;
}) {
  /** When true, blurring title will not overwrite slug (operator edited slug manually). */
  const slugLocked = useSignal(false);

  const resetSlugAutoLock$ = $(() => {
    slugLocked.value = false;
  });

  const onTitleBlurSuggestSlug$ = $(async () => {
    if (slugLocked.value) {
      return;
    }
    const raw = String(args.title.value ?? '').trim();
    if (!raw) {
      return;
    }
    const next = await suggestUniqueContentSlug(args.entity, raw, { ignoreId: args.ignoreRecordId });
    if (next) {
      args.slug.value = next;
    }
  });

  const onSlugInputLocksAutoFromTitle$ = $(() => {
    slugLocked.value = true;
  });

  const onSlugBlurEnsureUnique$ = $(async () => {
    const raw = String(args.slug.value ?? '').trim();
    if (!raw) {
      return;
    }
    const next = await suggestUniqueContentSlug(args.entity, raw, { ignoreId: args.ignoreRecordId });
    if (next) {
      args.slug.value = next;
    }
  });

  return {
    slugLocked,
    resetSlugAutoLock$,
    onTitleBlurSuggestSlug$,
    onSlugInputLocksAutoFromTitle$,
    onSlugBlurEnsureUnique$,
  };
}
