import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { PageHeader } from '~/components/common/PageHeader';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { getApiClient } from '~/lib/api/client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import {
  ADMIN_FORM_CARD_CLASS,
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '~/lib/admin/native-select-classes';

type DesignKit = {
  colors: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
    muted: string;
  };
  type_roles: Record<string, { weight: string; size: string; line_height: string }>;
};

export default component$(() => {
  const { lang } = useTranslate();
  const { success, error: showError } = useSwal();
  const kit = useSignal<DesignKit | null>(null);
  const saving = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const res = await getApiClient(null).get<DesignKit>(API_ENDPOINTS.APPEARANCE.DESIGN_KIT);
      kit.value = ((res as { data?: DesignKit }).data ?? res) as DesignKit;
    } catch (e) {
      showError(translateApp(lang, 'common.error'), { text: String((e as Error).message || '') });
    }
  });

  const onSave$ = $(async () => {
    if (!kit.value) return;
    saving.value = true;
    try {
      const res = await getApiClient(null).put(API_ENDPOINTS.APPEARANCE.DESIGN_KIT, kit.value);
      kit.value = (((res as { data?: DesignKit }).data ?? kit.value) as DesignKit);
      await success(translateApp(lang, 'common.saved'));
    } catch (e) {
      await showError(translateApp(lang, 'common.error'), { text: String((e as Error).message || '') });
    } finally {
      saving.value = false;
    }
  });

  if (!kit.value) {
    return <p class="p-6 text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>;
  }

  const colors = kit.value.colors;

  return (
    <div class="space-y-4">
      <PageHeader title={translateApp(lang, 'sidebar.appearanceDesignKit')} />
      <div class={`${ADMIN_FORM_CARD_CLASS} grid gap-4 p-4 md:grid-cols-2`}>
        {(['primary', 'secondary', 'text', 'accent', 'muted'] as const).map((key) => (
          <label key={key} class={ADMIN_FORM_LABEL_CLASS}>
            {key}
            <input
              class={ADMIN_FORM_INPUT_CLASS}
              type="color"
              value={colors[key]}
              onInput$={(e) => {
                const next = { ...kit.value! };
                next.colors = { ...next.colors, [key]: (e.target as HTMLInputElement).value };
                kit.value = next;
              }}
            />
          </label>
        ))}
        <button type="button" class={ADMIN_PRIMARY_BUTTON_CLASS} disabled={saving.value} onClick$={onSave$}>
          {translateApp(lang, 'common.save')}
        </button>
      </div>
    </div>
  );
});

export const head: DocumentHead = { title: 'Design kit' };
