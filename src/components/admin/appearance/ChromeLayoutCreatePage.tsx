import { component$, useSignal, $ } from '@builder.io/qwik';
import { Link, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '~/components/common/PageHeader';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import {
  adminFooterBuilderHref,
  adminHeaderBuilderHref,
  getLocalizedRoutes,
} from '~/lib/constants/routes';
import { createChromeLayoutFromBrowser } from '~/lib/admin/chrome-layout-actions';
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

export const ChromeLayoutCreatePage = component$<{ kind: ChromeLayoutKind }>(({ kind }) => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const nav = useNavigate();
  const { success, error: showError } = useSwal();
  const name = useSignal('');
  const slug = useSignal('');
  const status = useSignal<ChromeLayoutStatus>('draft');
  const saving = useSignal(false);
  const listHref = kind === 'header' ? R.ADMIN.APPEARANCE_HEADER : R.ADMIN.APPEARANCE_FOOTER;
  const title =
    kind === 'header'
      ? translateApp(lang, 'chromeLayouts.createHeader')
      : translateApp(lang, 'chromeLayouts.createFooter');

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
      await nav(
        kind === 'header' ? adminHeaderBuilderHref(lang, res.id) : adminFooterBuilderHref(lang, res.id),
      );
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
          <input class={ADMIN_FORM_INPUT_CLASS} value={name.value} onInput$={(e) => (name.value = (e.target as HTMLInputElement).value)} />
        </label>
        <label class={ADMIN_FORM_LABEL_CLASS}>
          {translateApp(lang, 'common.slug')}
          <input class={ADMIN_FORM_INPUT_CLASS} value={slug.value} onInput$={(e) => (slug.value = (e.target as HTMLInputElement).value)} />
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
              draft
            </option>
            <option class={ADMIN_NATIVE_OPTION_CLASS} value="published">
              published
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
