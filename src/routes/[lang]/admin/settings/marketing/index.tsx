import {
  component$,
  useContext,
  useSignal,
  useStore,
  useVisibleTask$,
  $,
} from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Form } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import {
  SettingsTranslationsRoot,
  settingsTranslationsContext,
} from '../../../../../components/admin/SettingsFieldTranslations';
import {
  marketingTranslation,
  secondarySiteLocales,
  serializeSettingsTranslations,
  setMarketingTranslation,
} from '../../../../../lib/admin/settings-translations';
import {
  parseMarketingSiteContent,
  serializeMarketingSiteContent,
  type MarketingSiteContentSettings,
} from '../../../../../lib/admin/marketing-site-content';
import type { FAQItem, PricingTier } from '../../../../../lib/marketing/types';
import type { SiteLanguageRow } from '../../../../../types/site-language';
import {
  SettingsSaveButton,
  useSettings,
  useUpdateSettings,
} from '../layout';

function cloneMarketing(src: MarketingSiteContentSettings): MarketingSiteContentSettings {
  return JSON.parse(JSON.stringify(src)) as MarketingSiteContentSettings;
}

const MarketingLocalePanels = component$<{
  locales: SiteLanguageRow[];
  primary: MarketingSiteContentSettings;
  fallbackHint: string;
  taglineLabel: string;
  missionLabel: string;
  addressLabel: string;
}>((props) => {
  const ctx = useContext(settingsTranslationsContext);

  return (
    <div class="space-y-4">
      {props.locales.map((loc) => (
        <details
          key={loc.code}
          class="rounded-lg border border-sky-100 bg-sky-50/30 p-4 dark:border-sky-900/40 dark:bg-sky-950/20"
        >
          <summary class="cursor-pointer text-sm font-semibold text-gray-900 dark:text-gray-100">
            {loc.native_label || loc.label} ({loc.code})
          </summary>
          <div class="mt-4 space-y-3" dir={loc.rtl ? 'rtl' : 'ltr'} lang={loc.code}>
            <label class="block text-sm font-medium">{props.taglineLabel}</label>
            <input
              type="text"
              value={marketingTranslation(ctx.store, loc.code, ['about', 'tagline'])}
              placeholder={props.primary.about?.tagline || props.fallbackHint}
              onInput$={(e) => {
                const el = e.target as HTMLInputElement;
                const next = setMarketingTranslation(ctx.store, loc.code, ['about', 'tagline'], el.value);
                Object.assign(ctx.store, next);
                ctx.hiddenJson.value = serializeSettingsTranslations(ctx.store);
              }}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
            />
            <label class="block text-sm font-medium">{props.missionLabel}</label>
            <textarea
              rows={2}
              value={marketingTranslation(ctx.store, loc.code, ['about', 'mission'])}
              placeholder={props.primary.about?.mission || props.fallbackHint}
              onInput$={(e) => {
                const el = e.target as HTMLTextAreaElement;
                const next = setMarketingTranslation(ctx.store, loc.code, ['about', 'mission'], el.value);
                Object.assign(ctx.store, next);
                ctx.hiddenJson.value = serializeSettingsTranslations(ctx.store);
              }}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
            />
            <label class="block text-sm font-medium">{props.addressLabel}</label>
            <input
              type="text"
              value={marketingTranslation(ctx.store, loc.code, ['contact', 'address'])}
              placeholder={props.primary.contact?.address || props.fallbackHint}
              onInput$={(e) => {
                const el = e.target as HTMLInputElement;
                const next = setMarketingTranslation(ctx.store, loc.code, ['contact', 'address'], el.value);
                Object.assign(ctx.store, next);
                ctx.hiddenJson.value = serializeSettingsTranslations(ctx.store);
              }}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>
        </details>
      ))}
    </div>
  );
});

export default component$(() => {
  const { lang } = useTranslate();
  const { success: showSuccess, error: showError } = useSwal();
  const settings = useSettings();
  const updateAction = useUpdateSettings();

  const secondaryLocales = secondarySiteLocales(
    settings.value.site_languages,
    settings.value.default_locale,
  );

  const initial = cloneMarketing(parseMarketingSiteContent(settings.value.marketing_site_content));
  const content = useStore<MarketingSiteContentSettings>(initial);
  const marketingJson = useSignal(serializeMarketingSiteContent(initial));

  const syncMarketingJson = $(() => {
    marketingJson.value = serializeMarketingSiteContent(content);
  });

  const successTitle = String(translateApp(lang, 'common.success'));
  const savedText = String(translateApp(lang, 'settings.saveSuccess'));
  const errorTitle = String(translateApp(lang, 'common.error'));
  const errorText = String(translateApp(lang, 'settings.saveFailed'));
  const removeLabel = String(translateApp(lang, 'common.delete'));

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const result = track(() => updateAction.value);
    if (!result) return;
    if ((result as any).success) {
      showSuccess(successTitle, {
        text: (result as any).message || savedText,
      });
    } else if ((result as any).error) {
      showError(errorTitle, {
        text: (result as any).error || errorText,
      });
    }
  });

  const addFaq = $(() => {
    content.faq = [...(content.faq ?? []), { question: '', answer: '' }];
    syncMarketingJson();
  });

  const removeFaq = $((index: number) => {
    content.faq = (content.faq ?? []).filter((_, i) => i !== index);
    syncMarketingJson();
  });

  const addTier = $(() => {
    const tiers = content.pricingTiers ?? [];
    content.pricingTiers = [
      ...tiers,
      {
        id: `tier-${tiers.length + 1}`,
        name: '',
        price: '',
        period: 'project',
        description: '',
        features: [],
        cta: '',
        highlighted: false,
      },
    ];
    syncMarketingJson();
  });

  const removeTier = $((index: number) => {
    content.pricingTiers = (content.pricingTiers ?? []).filter((_, i) => i !== index);
    syncMarketingJson();
  });

  return (
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <h2 class="mb-1 text-lg font-semibold">{translateApp(lang, 'settings.marketingTitle')}</h2>
      <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
        {translateApp(lang, 'settings.marketingSubtitle')}
      </p>

      <Form action={updateAction} class="space-y-8">
        <input type="hidden" name="marketing_site_content_json" value={marketingJson.value} />

        <SettingsTranslationsRoot
          locales={secondaryLocales}
          initialTranslations={settings.value.settings_translations}
          rtlBadge={translateApp(lang, 'contentTranslations.rtlBadge')}
          fallbackHintShort={translateApp(lang, 'contentTranslations.fallbackPlaceholderHint')}
        >
          <section class="space-y-4">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
              {translateApp(lang, 'settings.marketingAbout')}
            </h3>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.marketingTagline')}
              </label>
              <input
                type="text"
                value={content.about?.tagline ?? ''}
                onInput$={(e) => {
                  const el = e.target as HTMLInputElement;
                  if (!content.about) content.about = {};
                  content.about.tagline = el.value;
                  syncMarketingJson();
                }}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.marketingMission')}
              </label>
              <textarea
                rows={3}
                value={content.about?.mission ?? ''}
                onInput$={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  if (!content.about) content.about = {};
                  content.about.mission = el.value;
                  syncMarketingJson();
                }}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.marketingValues')}
              </label>
              <textarea
                rows={3}
                value={(content.about?.values ?? []).join('\n')}
                onInput$={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  if (!content.about) content.about = {};
                  content.about.values = el.value
                    .split('\n')
                    .map((v) => v.trim())
                    .filter(Boolean);
                  syncMarketingJson();
                }}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {translateApp(lang, 'settings.marketingOnePerLine')}
              </p>
            </div>
          </section>

          <section class="space-y-4">
            <div class="flex items-center justify-between gap-4">
              <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                {translateApp(lang, 'settings.marketingFaq')}
              </h3>
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                onClick$={addFaq}
              >
                {translateApp(lang, 'settings.marketingAddFaq')}
              </button>
            </div>
            {(content.faq ?? []).map((item: FAQItem, index: number) => (
              <div
                key={index}
                class="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div class="flex justify-end">
                  <button
                    type="button"
                    class="text-sm text-red-600 hover:underline dark:text-red-400"
                    onClick$={() => removeFaq(index)}
                  >
                    {removeLabel}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={String(translateApp(lang, 'settings.marketingFaqQuestion'))}
                  value={item.question}
                  onInput$={(e) => {
                    const el = e.target as HTMLInputElement;
                    const next = [...(content.faq ?? [])];
                    next[index] = { ...next[index], question: el.value };
                    content.faq = next;
                    syncMarketingJson();
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <textarea
                  rows={2}
                  placeholder={String(translateApp(lang, 'settings.marketingFaqAnswer'))}
                  value={item.answer}
                  onInput$={(e) => {
                    const el = e.target as HTMLTextAreaElement;
                    const next = [...(content.faq ?? [])];
                    next[index] = { ...next[index], answer: el.value };
                    content.faq = next;
                    syncMarketingJson();
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            ))}
          </section>

          <section class="space-y-4">
            <div class="flex items-center justify-between gap-4">
              <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                {translateApp(lang, 'settings.marketingPricing')}
              </h3>
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                onClick$={addTier}
              >
                {translateApp(lang, 'settings.marketingAddTier')}
              </button>
            </div>
            {(content.pricingTiers ?? []).map((tier: PricingTier, index: number) => (
              <div
                key={tier.id || index}
                class="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div class="flex justify-end">
                  <button
                    type="button"
                    class="text-sm text-red-600 hover:underline dark:text-red-400"
                    onClick$={() => removeTier(index)}
                  >
                    {removeLabel}
                  </button>
                </div>
                <div class="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder={String(translateApp(lang, 'settings.marketingTierName'))}
                    value={tier.name}
                    onInput$={(e) => {
                      const el = e.target as HTMLInputElement;
                      const next = [...(content.pricingTiers ?? [])];
                      next[index] = { ...next[index], name: el.value };
                      content.pricingTiers = next;
                      syncMarketingJson();
                    }}
                    class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="text"
                    placeholder={String(translateApp(lang, 'settings.marketingTierPrice'))}
                    value={tier.price}
                    onInput$={(e) => {
                      const el = e.target as HTMLInputElement;
                      const next = [...(content.pricingTiers ?? [])];
                      next[index] = { ...next[index], price: el.value };
                      content.pricingTiers = next;
                      syncMarketingJson();
                    }}
                    class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder={String(translateApp(lang, 'settings.marketingTierDescription'))}
                  value={tier.description}
                  onInput$={(e) => {
                    const el = e.target as HTMLTextAreaElement;
                    const next = [...(content.pricingTiers ?? [])];
                    next[index] = { ...next[index], description: el.value };
                    content.pricingTiers = next;
                    syncMarketingJson();
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <textarea
                  rows={2}
                  placeholder={String(translateApp(lang, 'settings.marketingTierFeatures'))}
                  value={(tier.features ?? []).join('\n')}
                  onInput$={(e) => {
                    const el = e.target as HTMLTextAreaElement;
                    const next = [...(content.pricingTiers ?? [])];
                    next[index] = {
                      ...next[index],
                      features: el.value
                        .split('\n')
                        .map((v) => v.trim())
                        .filter(Boolean),
                    };
                    content.pricingTiers = next;
                    syncMarketingJson();
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  placeholder={String(translateApp(lang, 'settings.marketingTierCta'))}
                  value={tier.cta}
                  onInput$={(e) => {
                    const el = e.target as HTMLInputElement;
                    const next = [...(content.pricingTiers ?? [])];
                    next[index] = { ...next[index], cta: el.value };
                    content.pricingTiers = next;
                    syncMarketingJson();
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            ))}
          </section>

          <section class="space-y-4">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
              {translateApp(lang, 'settings.marketingContact')}
            </h3>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.marketingContactAddress')}
              </label>
              <input
                type="text"
                value={content.contact?.address ?? ''}
                onInput$={(e) => {
                  const el = e.target as HTMLInputElement;
                  if (!content.contact) content.contact = {};
                  content.contact.address = el.value;
                  syncMarketingJson();
                }}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
          </section>

          {secondaryLocales.length > 0 ? (
            <section class="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">
              <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                {translateApp(lang, 'settings.marketingTranslations')}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {translateApp(lang, 'settings.marketingTranslationsHint')}
              </p>
              <MarketingLocalePanels
                locales={secondaryLocales}
                primary={content}
                fallbackHint={String(translateApp(lang, 'contentTranslations.fallbackPlaceholderHint'))}
                taglineLabel={String(translateApp(lang, 'settings.marketingTagline'))}
                missionLabel={String(translateApp(lang, 'settings.marketingMission'))}
                addressLabel={String(translateApp(lang, 'settings.marketingContactAddress'))}
              />
            </section>
          ) : null}
        </SettingsTranslationsRoot>

        <div class="flex justify-end">
          <SettingsSaveButton />
        </div>
      </Form>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Marketing Content Settings - Dashboard',
};
