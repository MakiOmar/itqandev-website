import { $, component$, useContext, type Signal } from '@builder.io/qwik';
import { translateApp } from '../../lib/i18n/useTranslate';
import type { ContentSeoDraft } from '../../types/content-seo';
import { ProjectSettingsContext } from '../../stores/project-settings-store';
import { isFeatureModuleEnabled } from '../../lib/api/project-settings';

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40';

/** What an empty field falls back to on the public site (shown as the input placeholder). */
export type ContentSeoPlaceholders = Partial<
  Record<'meta_title' | 'meta_description' | 'og_title' | 'og_description' | 'og_image', string>
>;

export type ContentSeoFieldsProps = {
  lang: string;
  idPrefix: string;
  draft: Signal<ContentSeoDraft>;
  placeholders?: ContentSeoPlaceholders;
};

/**
 * Full SEO morph fields (aligned with Laravel `seo_metas`). Head settings belong on create/edit
 * screens only, never inside a builder. Every field is optional: empty ones fall back to the
 * content and then to Settings → SEO defaults.
 */
export const ContentSeoFields = component$<ContentSeoFieldsProps>(({ lang, idPrefix, draft, placeholders }) => {
  const settings = useContext(ProjectSettingsContext);
  if (!isFeatureModuleEnabled(settings.settings?.features, 'seo')) {
    return <></>;
  }

  const p = `${idPrefix}-`;

  const patch = $((partial: Partial<ContentSeoDraft>) => {
    draft.value = { ...draft.value, ...partial };
  });

  return (
    <div class="space-y-4">
      {/* <!-- Empty fields are filled from the content and the SEO defaults --> */}
      <p class="text-xs text-gray-600 dark:text-gray-400">{translateApp(lang, 'seo.fallbackHint')}</p>
      <div>
        <label for={`${p}meta-title`} class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {translateApp(lang, 'seo.metaTitle')}
        </label>
        {/* <!-- Meta title for search snippets --> */}
        <input
          id={`${p}meta-title`}
          type="text"
          placeholder={placeholders?.meta_title || undefined}
          value={draft.value.meta_title}
          onInput$={(e) => patch({ meta_title: (e.target as HTMLInputElement).value })}
          class={inputCls}
        />
      </div>

      <div>
        <label for={`${p}meta-description`} class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {translateApp(lang, 'seo.metaDescription')}
        </label>
        <textarea
          id={`${p}meta-description`}
          rows={3}
          placeholder={placeholders?.meta_description || undefined}
          value={draft.value.meta_description}
          onInput$={(e) => patch({ meta_description: (e.target as HTMLTextAreaElement).value })}
          class={inputCls}
        />
      </div>

      <div>
        <label for={`${p}canonical`} class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {translateApp(lang, 'seo.canonicalUrl')}
        </label>
        <input
          id={`${p}canonical`}
          type="text"
          placeholder="https://… or /path"
          value={draft.value.canonical_url}
          onInput$={(e) => patch({ canonical_url: (e.target as HTMLInputElement).value })}
          class={inputCls}
        />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label for={`${p}og-title`} class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
            {translateApp(lang, 'seo.ogTitle')}
          </label>
          <input
            id={`${p}og-title`}
            type="text"
            placeholder={placeholders?.og_title || placeholders?.meta_title || undefined}
            value={draft.value.og_title}
            onInput$={(e) => patch({ og_title: (e.target as HTMLInputElement).value })}
            class={inputCls}
          />
        </div>
        <div class="md:col-span-1">
          <label for={`${p}twitter`} class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
            {translateApp(lang, 'seo.twitterCard')}
          </label>
          <select
            id={`${p}twitter`}
            value={draft.value.twitter_card}
            onChange$={(e) => patch({ twitter_card: (e.target as HTMLSelectElement).value })}
            class={inputCls}
          >
            <option value="">{translateApp(lang, 'seo.twitterCardDefault')}</option>
            <option value="summary">{translateApp(lang, 'seo.twitterCardSummary')}</option>
            <option value="summary_large_image">{translateApp(lang, 'seo.twitterCardLarge')}</option>
          </select>
        </div>
      </div>

      <div>
        <label for={`${p}og-description`} class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {translateApp(lang, 'seo.ogDescription')}
        </label>
        <textarea
          id={`${p}og-description`}
          rows={2}
          placeholder={placeholders?.og_description || placeholders?.meta_description || undefined}
          value={draft.value.og_description}
          onInput$={(e) => patch({ og_description: (e.target as HTMLTextAreaElement).value })}
          class={inputCls}
        />
      </div>

      <div>
        <label for={`${p}og-image`} class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {translateApp(lang, 'seo.ogImage')}
        </label>
        <input
          id={`${p}og-image`}
          type="url"
          placeholder={placeholders?.og_image || 'https://...'}
          value={draft.value.og_image}
          onInput$={(e) => patch({ og_image: (e.target as HTMLInputElement).value })}
          class={inputCls}
        />
      </div>

      <div>
        <label for={`${p}schema`} class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {translateApp(lang, 'seo.schema')}
        </label>
        <p class="mb-2 text-xs text-gray-600 dark:text-gray-400">{translateApp(lang, 'seo.schemaHint')}</p>
        <textarea
          id={`${p}schema`}
          rows={6}
          spellcheck={false}
          value={draft.value.schema_json}
          onInput$={(e) => patch({ schema_json: (e.target as HTMLTextAreaElement).value })}
          class={[inputCls, 'font-mono text-xs'].join(' ')}
        />
      </div>
    </div>
  );
});

export type ContentSeoCardProps = ContentSeoFieldsProps & {
  /** Card wrapper classes (e.g. `ADMIN_FORM_CARD_CLASS`). */
  class?: string;
};

/** Titled SEO card for create/edit screens; renders nothing when the `seo` module is off. */
export const ContentSeoCard = component$<ContentSeoCardProps>((props) => {
  const settings = useContext(ProjectSettingsContext);
  if (!isFeatureModuleEnabled(settings.settings?.features, 'seo')) {
    return <></>;
  }

  return (
    <section class={props.class}>
      <h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">{translateApp(props.lang, 'seo.title')}</h3>
      {/* <!-- SEO row per editing locale --> */}
      <p class="mb-3 text-xs text-gray-600 dark:text-gray-400">{translateApp(props.lang, 'seo.forEditingLocale')}</p>
      <ContentSeoFields
        lang={props.lang}
        idPrefix={props.idPrefix}
        draft={props.draft}
        placeholders={props.placeholders}
      />
    </section>
  );
});
