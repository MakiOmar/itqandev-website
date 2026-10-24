import { $, component$, useSignal } from '@builder.io/qwik';
import { translateApp } from '../../lib/i18n/useTranslate';
import { MediaSelector } from '../common/MediaSelector';
import { SettingsFieldGlobe } from './SettingsFieldTranslations';
import {
  DEFAULT_TITLE_TEMPLATE,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_TEMPLATE_MAX,
  type SeoDefaultsBlock,
  type SeoTwitterCard,
} from '../../lib/seo/seo-defaults';
import {
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_TEXTAREA_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
} from '../../lib/admin/native-select-classes';
import type { Media } from '../../types';

const TWITTER_CARD_OPTIONS: Array<{ value: SeoTwitterCard; labelKey: string }> = [
  { value: 'summary', labelKey: 'seo.twitterCardSummary' },
  { value: 'summary_large_image', labelKey: 'seo.twitterCardLarge' },
];

/**
 * One `seo_defaults` block (global or a content type). Mutates the passed store in place;
 * localized fields also get a translation globe under `translationPath`.
 */
export const SeoDefaultsBlockFields = component$<{
  lang: string;
  idPrefix: string;
  block: SeoDefaultsBlock;
  /** e.g. `['seo_defaults']` or `['seo_defaults', 'types', 'page']`. */
  translationPath: string[];
  /** Global block shown as placeholders when this block inherits from it. */
  inheritFrom?: SeoDefaultsBlock;
}>((props) => {
  const { lang, idPrefix, block, inheritFrom } = props;
  const showPicker = useSignal(false);
  const globeLabel = translateApp(lang, 'contentTranslations.globeTitle');
  const titlePlaceholder = inheritFrom ? inheritFrom.title_template || DEFAULT_TITLE_TEMPLATE : DEFAULT_TITLE_TEMPLATE;
  const inheritLabel = translateApp(lang, 'settings.seoInherit');
  const defaultCardLabel = inheritFrom ? inheritLabel : translateApp(lang, 'seo.twitterCardDefault');

  return (
    <div class="space-y-4">
      {/* Title template: tokens are replaced on the public site */}
      <div>
        <label for={`${idPrefix}-title`} class={ADMIN_FORM_LABEL_CLASS}>
          {translateApp(lang, 'settings.seoTitleTemplate')}
        </label>
        <SettingsFieldGlobe
          path={[...props.translationPath, 'title_template']}
          globeAriaLabel={globeLabel}
          fallbackText={block.title_template || titlePlaceholder}
        >
          <input
            id={`${idPrefix}-title`}
            type="text"
            maxLength={SEO_TITLE_TEMPLATE_MAX}
            value={block.title_template}
            placeholder={titlePlaceholder}
            class={ADMIN_FORM_INPUT_CLASS}
            onInput$={(e) => {
              block.title_template = (e.target as HTMLInputElement).value;
            }}
          />
        </SettingsFieldGlobe>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {translateApp(lang, 'settings.seoTitleTemplateHint')}
        </p>
      </div>

      {/* Default meta description for this level */}
      <div>
        <label for={`${idPrefix}-description`} class={ADMIN_FORM_LABEL_CLASS}>
          {translateApp(lang, 'settings.seoDefaultDescription')}
        </label>
        <SettingsFieldGlobe
          path={[...props.translationPath, 'meta_description']}
          multiline
          globeAriaLabel={globeLabel}
          fallbackText={block.meta_description || inheritFrom?.meta_description || ''}
        >
          <textarea
            id={`${idPrefix}-description`}
            rows={3}
            maxLength={SEO_DESCRIPTION_MAX}
            value={block.meta_description}
            placeholder={inheritFrom?.meta_description || ''}
            class={ADMIN_FORM_TEXTAREA_CLASS}
            onInput$={(e) => {
              block.meta_description = (e.target as HTMLTextAreaElement).value;
            }}
          />
        </SettingsFieldGlobe>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        {/* Default social image from the media library */}
        <div>
          <span class={ADMIN_FORM_LABEL_CLASS}>{translateApp(lang, 'settings.seoDefaultOgImage')}</span>
          <div class="mb-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
            {block.og_image ? (
              <img src={block.og_image} alt="" width={192} height={96} class="max-h-20 max-w-full object-contain" />
            ) : (
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {inheritFrom?.og_image ? inheritLabel : translateApp(lang, 'settings.seoNoImage')}
              </span>
            )}
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
              onClick$={() => {
                showPicker.value = true;
              }}
            >
              {translateApp(lang, 'media.selectMedia')}
            </button>
            {block.og_image ? (
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick$={() => {
                  block.og_image = null;
                }}
              >
                {translateApp(lang, 'common.delete')}
              </button>
            ) : null}
          </div>
        </div>

        {/* Twitter card type; empty inherits (or picks automatically at the global level) */}
        <div>
          <label for={`${idPrefix}-twitter`} class={ADMIN_FORM_LABEL_CLASS}>
            {translateApp(lang, 'seo.twitterCard')}
          </label>
          <select
            id={`${idPrefix}-twitter`}
            class={ADMIN_NATIVE_SELECT_CLASS}
            onChange$={(e) => {
              const value = (e.target as HTMLSelectElement).value;
              block.twitter_card = value === 'summary' || value === 'summary_large_image' ? value : '';
            }}
          >
            <option class={ADMIN_NATIVE_OPTION_CLASS} value="" selected={block.twitter_card === ''}>
              {defaultCardLabel}
            </option>
            {TWITTER_CARD_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                class={ADMIN_NATIVE_OPTION_CLASS}
                value={opt.value}
                selected={block.twitter_card === opt.value}
              >
                {translateApp(lang, opt.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showPicker.value && (
        <MediaSelector
          title={translateApp(lang, 'settings.seoDefaultOgImage')}
          accept="image/*"
          onSelect={$((media: Media) => {
            block.og_image = media.url || media.thumbnailUrl || null;
            showPicker.value = false;
          })}
          onClose={$(() => {
            showPicker.value = false;
          })}
        />
      )}
    </div>
  );
});
