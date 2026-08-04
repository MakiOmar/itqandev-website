import { $, component$, type QRL, type Signal } from '@builder.io/qwik';
import {
  ContentEditingLanguageSelect,
  ContentPrimaryLanguageSelect,
} from './PerFieldContentTranslations';
import { translateApp } from '../../lib/i18n/useTranslate';
import { primaryLocaleForContent } from '../../lib/content-display-locale';
import type { SiteLanguageRow } from '../../types/site-language';

export type AdminContentLanguageFieldsProps = {
  lang: string;
  siteLanguages: SiteLanguageRow[];
  defaultLocale: string;
  /** Bound primary content language (`content_locale`), empty = site default. */
  contentLocale: Signal<string>;
  /** Bound editing/UI language for this form session. */
  editingLocale: Signal<string>;
  /** When false, only the editing-language control is shown (edit screens that omit primary). */
  showPrimary?: boolean;
  /**
   * Optional side effect after primary language changes (e.g. reset secondary translations JSON).
   * Primary signal is already updated before this runs.
   */
  onContentLocaleChange$?: QRL<(code: string) => void>;
};

/**
 * Language controls used atop admin content forms (Projects / Blog / Pages / etc.).
 * Must sit inside `grid gap-4 md:grid-cols-2` — the selects already use `md:col-span-2`.
 */
export const AdminContentLanguageFields = component$<AdminContentLanguageFieldsProps>((props) => {
  const showPrimary = props.showPrimary !== false;
  const effectivePrimary = primaryLocaleForContent(
    props.siteLanguages,
    props.defaultLocale,
    props.contentLocale.value.trim() !== '' ? props.contentLocale.value.trim() : null,
  );

  return (
    <>
      {showPrimary ? (
        <ContentPrimaryLanguageSelect
          siteLanguages={props.siteLanguages}
          defaultLocale={props.defaultLocale}
          value={props.contentLocale.value}
          label={translateApp(props.lang, 'contentTranslations.contentPrimaryLanguage')}
          hint={translateApp(props.lang, 'contentTranslations.contentPrimaryHint')}
          useSiteDefaultLabel={translateApp(props.lang, 'contentTranslations.useSiteDefault')}
          onChange$={$((code: string) => {
            props.contentLocale.value = code;
            void props.onContentLocaleChange$?.(code);
          })}
        />
      ) : null}
      <ContentEditingLanguageSelect
        siteLanguages={props.siteLanguages}
        value={props.editingLocale.value}
        effectivePrimaryLocale={effectivePrimary}
        label={translateApp(props.lang, 'contentTranslations.sectionTitle')}
        hintPrimary={translateApp(props.lang, 'contentTranslations.defaultHint')}
        hintSecondary={translateApp(props.lang, 'contentTranslations.fallbackPlaceholderHint')}
        secondarySavePrefix={translateApp(props.lang, 'contentTranslations.addTranslations')}
        onChange$={$((code: string) => {
          props.editingLocale.value = code;
        })}
      />
    </>
  );
});

/** Shared 2-col grid wrapper for language → title|slug → body fields. */
export const ADMIN_CONTENT_FIELDS_GRID_CLASS = 'grid gap-4 md:grid-cols-2';
