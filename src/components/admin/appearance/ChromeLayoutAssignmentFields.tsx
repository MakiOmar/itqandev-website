import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { Signal } from '@builder.io/qwik';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { fetchPublishedChromeOptionsFromBrowser } from '~/lib/admin/chrome-layout-actions';
import type { ChromeLayoutMeta } from '~/types/chrome-layout';
import {
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
} from '~/lib/admin/native-select-classes';

/**
 * Published-only header/footer pickers for content edit forms.
 */
export const ChromeLayoutAssignmentFields = component$<{
  headerId: Signal<number | null>;
  footerId: Signal<number | null>;
}>((props) => {
  const { lang } = useTranslate();
  const headers = useSignal<ChromeLayoutMeta[]>([]);
  const footers = useSignal<ChromeLayoutMeta[]>([]);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const [h, f] = await Promise.all([
        fetchPublishedChromeOptionsFromBrowser('header'),
        fetchPublishedChromeOptionsFromBrowser('footer'),
      ]);
      headers.value = h;
      footers.value = f;
    } catch {
      headers.value = [];
      footers.value = [];
    }
  });

  return (
    <div class="grid gap-4 md:grid-cols-2">
      <label class={ADMIN_FORM_LABEL_CLASS}>
        {translateApp(lang, 'chromeLayouts.headerLabel')}
        <select
          class={ADMIN_NATIVE_SELECT_CLASS}
          name="header_layout_id"
          value={props.headerId.value ?? ''}
          onChange$={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            props.headerId.value = v ? Number(v) : null;
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
          name="footer_layout_id"
          value={props.footerId.value ?? ''}
          onChange$={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            props.footerId.value = v ? Number(v) : null;
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
  );
});
