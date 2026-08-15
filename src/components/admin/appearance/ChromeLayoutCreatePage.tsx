import { component$, useSignal, $ } from '@builder.io/qwik';
import { Link, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '~/components/common/PageHeader';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import {
  adminBodyBuilderHref,
  adminFooterBuilderHref,
  adminHeaderBuilderHref,
  getLocalizedRoutes,
} from '~/lib/constants/routes';
import { createChromeLayoutFromBrowser } from '~/lib/admin/chrome-layout-actions';
import { useContentSlugAutosuggestTitleSlugSignals } from '~/lib/slug/content-slug-auto';
import type { ChromeLayoutKind, ChromeLayoutStatus } from '~/types/chrome-layout';
import {
  ADMIN_BACK_BUTTON_CLASS,
  ADMIN_FORM_CARD_CLASS,
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '~/lib/admin/native-select-classes';

function chromeSlugEntity(kind: ChromeLayoutKind) {
  return kind === 'header'
    ? ('chrome_headers' as const)
    : kind === 'footer'
      ? ('chrome_footers' as const)
      : ('chrome_bodies' as const);
}

export const ChromeLayoutCreatePage = component$<{ kind: ChromeLayoutKind }>(({ kind }) => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const nav = useNavigate();
  const { success, error: showError } = useSwal();
  const name = useSignal('');
  const slug = useSignal('');
  const status = useSignal<ChromeLayoutStatus>('draft');
  const saving = useSignal(false);
  const slugAuto = useContentSlugAutosuggestTitleSlugSignals({
    entity: chromeSlugEntity(kind),
    title: name,
    slug,
  });
  const listHref =
    kind === 'header'
      ? R.ADMIN.APPEARANCE_HEADER
      : kind === 'footer'
        ? R.ADMIN.APPEARANCE_FOOTER
        : R.ADMIN.APPEARANCE_BODY;
  const title =
    kind === 'header'
      ? translateApp(lang, 'chromeLayouts.createHeader')
      : kind === 'footer'
        ? translateApp(lang, 'chromeLayouts.createFooter')
        : translateApp(lang, 'chromeLayouts.createBody');

  const onSave$ = $(async () => {
    if (!name.value.trim()) {
      await showError(translateApp(lang, 'chromeLayouts.nameRequired'));
      return;
    }
    saving.value = true;
    try {
      const res = await createChromeLayoutFromBrowser(kind, {
        name: name.value.trim(),
        slug: slug.value.trim() || undefined,
        status: status.value,
      });
      if (!res.success || !res.id) {
        await showError(res.error || translateApp(lang, 'common.error'));
        return;
      }
      await success(translateApp(lang, 'common.created'));
      const href =
        kind === 'header'
          ? adminHeaderBuilderHref(lang, res.id)
          : kind === 'footer'
            ? adminFooterBuilderHref(lang, res.id)
            : adminBodyBuilderHref(lang, res.id);
      await nav(href);
    } finally {
      saving.value = false;
    }
  });

  return (
    <div class="space-y-4">
      <PageHeader title={title}>
        <Link href={listHref} class={ADMIN_BACK_BUTTON_CLASS}>
          {translateApp(lang, 'common.back')}
        </Link>
      </PageHeader>
      <div class={`${ADMIN_FORM_CARD_CLASS} space-y-4 p-4`}>
        <label class={ADMIN_FORM_LABEL_CLASS}>
          {translateApp(lang, 'common.name')}
          {/* Name — blur auto-fills a unique slug */}
          <input
            class={ADMIN_FORM_INPUT_CLASS}
            value={name.value}
            onInput$={(e) => (name.value = (e.target as HTMLInputElement).value)}
            onBlur$={slugAuto.onTitleBlurSuggestSlug$}
          />
        </label>
        <label class={ADMIN_FORM_LABEL_CLASS}>
          {translateApp(lang, 'common.slug')}
          {/* Optional override; locks auto-from-title once edited */}
          <input
            class={`${ADMIN_FORM_INPUT_CLASS} font-mono text-xs`}
            value={slug.value}
            onInput$={(e) => {
              slugAuto.slugLocked.value = true;
              slug.value = (e.target as HTMLInputElement).value;
            }}
            onBlur$={slugAuto.onSlugBlurEnsureUnique$}
          />
        </label>
        <label class={ADMIN_FORM_LABEL_CLASS}>
          {translateApp(lang, 'common.status')}
          <select
            class={ADMIN_NATIVE_SELECT_CLASS}
            value={status.value}
            onChange$={(e) => {
              status.value = (e.target as HTMLSelectElement).value === 'published' ? 'published' : 'draft';
            }}
          >
            <option class={ADMIN_NATIVE_OPTION_CLASS} value="draft">
              {translateApp(lang, 'common.statusDraft')}
            </option>
            <option class={ADMIN_NATIVE_OPTION_CLASS} value="published">
              {translateApp(lang, 'common.statusPublished')}
            </option>
          </select>
        </label>
        <button type="button" class={ADMIN_PRIMARY_BUTTON_CLASS} disabled={saving.value} onClick$={onSave$}>
          {translateApp(lang, 'common.create')}
        </button>
      </div>
    </div>
  );
});
