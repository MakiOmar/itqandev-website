import { component$, useSignal, type QRL } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import { LINK_MODE_KEYS, linkModePatch, resolveLinkMode, type LinkMode } from '~/lib/admin/link-mode-fields';
import { ADMIN_CHECKBOX_CLASS, ADMIN_CHECKBOX_LABEL_CLASS } from '~/lib/admin/native-select-classes';
import { BuilderDynamicTagButton, type BuilderDynamicTag } from './BuilderDynamicTagButton';
import { INSPECTOR_INPUT, INSPECTOR_LABEL, INSPECTOR_ROW } from './inspector-classes';

export type LinkModeControlProps = {
  lang: string;
  url: string;
  newTab: boolean;
  lightbox: boolean;
  tags: BuilderDynamicTag[];
  /** Writes several setting keys at once. */
  onPatch$: QRL<(patch: Record<string, unknown>) => void>;
};

/** Link: None / Custom URL / Lightbox. Custom reveals the URL (with dynamic tags) and "Open in new window". */
export const LinkModeControl = component$<LinkModeControlProps>((props) => {
  const pendingCustom = useSignal(false);
  const t = (key: string) => translateApp(props.lang, `appearance.linkMode.${key}`);
  const mode = resolveLinkMode(props.url, props.lightbox, pendingCustom.value);

  return (
    <div class="flex flex-col gap-2">
      <div class={INSPECTOR_ROW}>
        <label for="setting-link-mode" class={INSPECTOR_LABEL}>
          {t('label')}
        </label>
        <select
          id="setting-link-mode"
          class={INSPECTOR_INPUT}
          value={mode}
          onChange$={async (e) => {
            const next = (e.target as HTMLSelectElement).value as LinkMode;
            pendingCustom.value = next === 'custom';
            await props.onPatch$(linkModePatch(next));
          }}
        >
          <option value="none" selected={mode === 'none'}>{t('none')}</option>
          <option value="custom" selected={mode === 'custom'}>{t('custom')}</option>
          <option value="lightbox" selected={mode === 'lightbox'}>{t('lightbox')}</option>
        </select>
      </div>
      {mode === 'custom' ? (
        <>
          {/* Custom URL with the dynamic-tag trigger */}
          <div class="relative">
            <input
              type="url"
              dir="ltr"
              class={[INSPECTOR_INPUT, props.tags.length ? 'pe-8' : ''].join(' ')}
              placeholder={translateApp(props.lang, 'appearance.urlPlaceholder')}
              aria-label={t('url')}
              value={props.url}
              onInput$={async (e) => {
                await props.onPatch$({ [LINK_MODE_KEYS.url]: (e.target as HTMLInputElement).value });
              }}
            />
            <BuilderDynamicTagButton
              tags={props.tags}
              lang={props.lang}
              onInsert$={async (token) => {
                await props.onPatch$({ [LINK_MODE_KEYS.url]: `${props.url}${token}` });
              }}
            />
          </div>
          <label class={`${ADMIN_CHECKBOX_LABEL_CLASS} text-xs`}>
            <input
              type="checkbox"
              class={ADMIN_CHECKBOX_CLASS}
              checked={props.newTab}
              onChange$={async (e) => {
                await props.onPatch$({ [LINK_MODE_KEYS.newTab]: (e.target as HTMLInputElement).checked });
              }}
            />
            {t('newTab')}
          </label>
        </>
      ) : null}
    </div>
  );
});
