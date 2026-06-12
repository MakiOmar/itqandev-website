import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { useNavigate, Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { FontFormFields } from '../../../../../components/admin/FontFormFields';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { createFont } from '../../../../../lib/admin/font-api';
import { adminFontEditHref, useAppRoutes } from '../../../../../lib/constants/routes';
import { emptyFontForm, presentFontFormats } from '../../../../../types/font';

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const navigate = useNavigate();
  const { success, error: showError } = useSwal();
  const saving = useSignal(false);
  const form = useSignal(emptyFontForm());

  const handleSave = $(async () => {
    if (!form.value.name.trim() || !form.value.css_family.trim()) {
      await showError(String(translateApp(lang, 'fonts.validationRequired')));
      return;
    }
    if (presentFontFormats(form.value).length === 0) {
      await showError(String(translateApp(lang, 'fonts.validationFile')));
      return;
    }
    saving.value = true;
    try {
      const created = await createFont(form.value);
      await success(String(translateApp(lang, 'common.created')));
      await navigate(adminFontEditHref(lang, created.id));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(translateApp(lang, 'fonts.saveFailed'));
      await showError(msg);
    } finally {
      saving.value = false;
    }
  });

  return (
    <div>
      <PageHeader
        title={translateApp(lang, 'fonts.add')}
        description={translateApp(lang, 'fonts.addSubtitle')}
      />
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <FontFormFields
          form={form.value}
          onChange$={$((next) => {
            form.value = next;
          })}
        />
        <div class="mt-6 flex justify-end gap-2">
          <Link
            href={R.ADMIN.FONTS}
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
          >
            {translateApp(lang, 'common.cancel')}
          </Link>
          <button
            type="button"
            disabled={saving.value}
            onClick$={handleSave}
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.save')}
          </button>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Add Font - Dashboard',
};
