import { component$, useSignal, type QRL } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import { LINK_MODE_KEYS, linkModePatch, resolveLinkMode, type LinkMode } from '~/lib/admin/link-mode-fields';
import type { DynamicTagCatalog } from '~/lib/admin/appearance-actions';
import { LinkTargetSelect } from './LinkTargetSelect';
import { BuilderDynamicTagButton } from './BuilderDynamicTagButton';
import { BuilderLinkSearchButton } from './BuilderLinkSearchButton';
import { INSPECTOR_INPUT, INSPECTOR_LABEL, INSPECTOR_ROW } from './inspector-classes';

export type LinkModeControlProps = {
  lang: string;
  url: string;
  newTab: boolean;
  lightbox: boolean;
  catalog: DynamicTagCatalog;
  /** Writes several setting keys at once. */
  onPatch$: QRL<(patch: Record<string, unknown>) => void>;
};

/** Link: None / Custom URL / Lightbox. Custom reveals the URL (with dynamic tags) and the link target. */
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
          {/* Custom URL with the content-link and dynamic-tag triggers */}
          <div class="relative">
            <input
              type="url"
              dir="ltr"
              class={[INSPECTOR_INPUT, props.catalog.tags.length ? 'pe-14' : 'pe-8'].join(' ')}
              placeholder={translateApp(props.lang, 'appearance.urlPlaceholder')}
              aria-label={t('url')}
              value={props.url}
              onInput$={async (e) => {
                await props.onPatch$({ [LINK_MODE_KEYS.url]: (e.target as HTMLInputElement).value });
              }}
            />
            <BuilderLinkSearchButton
              lang={props.lang}
              shifted={props.catalog.tags.length > 0}
              onPick$={async (path) => {
                await props.onPatch$({ [LINK_MODE_KEYS.url]: path });
              }}
            />
            <BuilderDynamicTagButton
              catalog={props.catalog}
              lang={props.lang}
              onInsert$={async (token) => {
                await props.onPatch$({ [LINK_MODE_KEYS.url]: `${props.url}${token}` });
              }}
            />
          </div>
          <LinkTargetSelect
            lang={props.lang}
            id="setting-link-target"
            newTab={props.newTab}
            url={props.url}
            onChange$={async (newTab) => {
              await props.onPatch$({ [LINK_MODE_KEYS.newTab]: newTab });
            }}
          />
        </>
      ) : null}
    </div>
  );
});
