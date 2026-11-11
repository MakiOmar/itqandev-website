import { component$, type QRL } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import { isSamePageAnchor } from '~/lib/marketing/link-target';
import { INSPECTOR_INPUT, INSPECTOR_LABEL, INSPECTOR_ROW } from './inspector-classes';

export type LinkTargetSelectProps = {
  lang: string;
  id: string;
  /** Stored `open_in_new_tab`. */
  newTab: boolean;
  /** The link's URL, for the same-page anchor hint. */
  url?: string;
  onChange$: QRL<(newTab: boolean) => void>;
};

/** `open_in_new_tab` as Link target: current window (`_self`) / new window (`_blank`). */
export const LinkTargetSelect = component$<LinkTargetSelectProps>((props) => {
  const t = (key: string) => translateApp(props.lang, `appearance.linkTarget.${key}`);
  const anchor = isSamePageAnchor(props.url ?? '');
  return (
    <div class="flex flex-col gap-1">
      <div class={INSPECTOR_ROW}>
        <label for={props.id} class={INSPECTOR_LABEL}>
          {t('label')}
        </label>
        <select
          id={props.id}
          class={INSPECTOR_INPUT}
          value={props.newTab ? '_blank' : '_self'}
          onChange$={async (e) => {
            await props.onChange$((e.target as HTMLSelectElement).value === '_blank');
          }}
        >
          <option value="_self" selected={!props.newTab}>{t('self')}</option>
          <option value="_blank" selected={props.newTab}>{t('blank')}</option>
        </select>
      </div>
      {anchor ? <p class="text-[11px] text-gray-500 dark:text-gray-400">{t('anchorHint')}</p> : null}
    </div>
  );
});
