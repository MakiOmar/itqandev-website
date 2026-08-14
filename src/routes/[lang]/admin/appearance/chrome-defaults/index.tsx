import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { PageHeader } from '~/components/common/PageHeader';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import {
  fetchChromeTypeDefaultsFromBrowser,
  fetchPublishedChromeOptionsFromBrowser,
  saveChromeTypeDefaultsFromBrowser,
} from '~/lib/admin/chrome-layout-actions';
import type { ChromeLayoutMeta, ChromeTypeDefaults } from '~/types/chrome-layout';
import {
  ADMIN_BACK_BUTTON_CLASS,
  ADMIN_FORM_CARD_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '~/lib/admin/native-select-classes';

const TYPES = ['homepage', 'page', 'project', 'blog_post', 'service'] as const;

function emptyDefaults(): ChromeTypeDefaults {
  return {
    homepage: { header_id: null, footer_id: null },
    page: { header_id: null, footer_id: null },
    project: { header_id: null, footer_id: null },
    blog_post: { header_id: null, footer_id: null },
    service: { header_id: null, footer_id: null },
  };
}

export default component$(() => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const { success, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const defaults = useSignal<ChromeTypeDefaults>(emptyDefaults());
  const headers = useSignal<ChromeLayoutMeta[]>([]);
  const footers = useSignal<ChromeLayoutMeta[]>([]);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const [d, h, f] = await Promise.all([
        fetchChromeTypeDefaultsFromBrowser(),
        fetchPublishedChromeOptionsFromBrowser('header'),
        fetchPublishedChromeOptionsFromBrowser('footer'),
      ]);
      defaults.value = { ...emptyDefaults(), ...d };
      headers.value = h;
      footers.value = f;
    } catch (e) {
      await showError(String((e as Error)?.message || translateApp(lang, 'common.error')));
    } finally {
      loading.value = false;
    }
  });

  const onSave$ = $(async () => {
    saving.value = true;
    try {
      const res = await saveChromeTypeDefaultsFromBrowser(defaults.value);
      if (!res.success) {
        await showError(res.error || translateApp(lang, 'common.error'));
        return;
      }
      if (res.data) defaults.value = res.data;
      await success(translateApp(lang, 'common.saved'));
    } finally {
      saving.value = false;
    }
  });

  const typeLabel = (type: (typeof TYPES)[number]) => {
    switch (type) {
      case 'homepage':
        return translateApp(lang, 'chromeLayouts.typeHomepage');
      case 'page':
        return translateApp(lang, 'chromeLayouts.typePage');
      case 'project':
        return translateApp(lang, 'chromeLayouts.typeProject');
      case 'blog_post':
        return translateApp(lang, 'chromeLayouts.typeBlogPost');
      case 'service':
        return translateApp(lang, 'chromeLayouts.typeService');
    }
  };

  return (
    <div class="space-y-4">
      <PageHeader title={translateApp(lang, 'chromeLayouts.typeDefaults')}>
        <Link href={R.ADMIN.APPEARANCE_HEADER} class={ADMIN_BACK_BUTTON_CLASS}>
          {translateApp(lang, 'sidebar.appearanceHeader')}
        </Link>
        <Link href={R.ADMIN.APPEARANCE_FOOTER} class={ADMIN_BACK_BUTTON_CLASS}>
          {translateApp(lang, 'sidebar.appearanceFooter')}
        </Link>
      </PageHeader>
      <p class="text-sm text-gray-600 dark:text-gray-300">{translateApp(lang, 'chromeLayouts.typeDefaultsHint')}</p>
      {loading.value ? (
        <p class="text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>
      ) : (
        <div class={`${ADMIN_FORM_CARD_CLASS} space-y-6 p-4`}>
          {TYPES.map((type) => (
            <div key={type} class="grid gap-3 md:grid-cols-3 md:items-end">
              <div class="font-medium text-gray-900 dark:text-gray-100">{typeLabel(type)}</div>
              <label class={ADMIN_FORM_LABEL_CLASS}>
                {translateApp(lang, 'chromeLayouts.headerLabel')}
                <select
                  class={ADMIN_NATIVE_SELECT_CLASS}
                  value={defaults.value[type].header_id ?? ''}
                  onChange$={(e) => {
                    const v = (e.target as HTMLSelectElement).value;
                    defaults.value = {
                      ...defaults.value,
                      [type]: {
                        ...defaults.value[type],
                        header_id: v ? Number(v) : null,
                      },
                    };
                  }}
                >
                  <option class={ADMIN_NATIVE_OPTION_CLASS} value="">
                    {translateApp(lang, 'chromeLayouts.useSiteDefault')}
                  </option>
                  {headers.value.map((h) => (
                    <option class={ADMIN_NATIVE_OPTION_CLASS} key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
              <label class={ADMIN_FORM_LABEL_CLASS}>
                {translateApp(lang, 'chromeLayouts.footerLabel')}
                <select
                  class={ADMIN_NATIVE_SELECT_CLASS}
                  value={defaults.value[type].footer_id ?? ''}
                  onChange$={(e) => {
                    const v = (e.target as HTMLSelectElement).value;
                    defaults.value = {
                      ...defaults.value,
                      [type]: {
                        ...defaults.value[type],
                        footer_id: v ? Number(v) : null,
                      },
                    };
                  }}
                >
                  <option class={ADMIN_NATIVE_OPTION_CLASS} value="">
                    {translateApp(lang, 'chromeLayouts.useSiteDefault')}
                  </option>
                  {footers.value.map((f) => (
                    <option class={ADMIN_NATIVE_OPTION_CLASS} key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
          <button type="button" class={ADMIN_PRIMARY_BUTTON_CLASS} disabled={saving.value} onClick$={onSave$}>
            {translateApp(lang, 'common.save')}
          </button>
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Chrome type defaults',
};
