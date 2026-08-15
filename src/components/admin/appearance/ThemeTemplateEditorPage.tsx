/**
 * Theme Builder create / edit: conditions + Header / Body / Footer library slots.
 */
import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { Link, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '~/components/common/PageHeader';
import { BuilderImportExportButtons } from '~/components/admin/BuilderImportExportButtons';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import {
  adminBodyBuilderHref,
  adminFooterBuilderHref,
  adminHeaderBuilderHref,
  getLocalizedRoutes,
} from '~/lib/constants/routes';
import { fetchPublishedChromeOptionsFromBrowser } from '~/lib/admin/chrome-layout-actions';
import {
  createThemeTemplateFromBrowser,
  emptyThemeConditions,
  themeConditionsAllowBody,
  updateThemeTemplateFromBrowser,
} from '~/lib/admin/theme-template-actions';
import type {
  ChromeLayoutMeta,
  ThemeConditionRule,
  ThemeTemplateConditionsDoc,
  ThemeTemplateMeta,
  ThemeTemplateStatus,
} from '~/types/chrome-layout';
import {
  ADMIN_BACK_BUTTON_CLASS,
  ADMIN_CHECKBOX_CLASS,
  ADMIN_CHECKBOX_LABEL_CLASS,
  ADMIN_FORM_CARD_CLASS,
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '~/lib/admin/native-select-classes';

const GROUP_KEYS: Record<string, { key: string; label: string }[]> = {
  entire: [{ key: 'site', label: 'Entire site' }],
  singular: [
    { key: 'homepage', label: 'Homepage' },
    { key: 'page', label: 'CMS page' },
    { key: 'blog_post', label: 'Blog post' },
    { key: 'project', label: 'Project' },
    { key: 'service', label: 'Service' },
    { key: 'not_found', label: '404' },
  ],
  archive: [
    { key: 'blog_index', label: 'Blog index' },
    { key: 'portfolio_index', label: 'Portfolio index' },
    { key: 'services_index', label: 'Services index' },
  ],
  advanced: [
    { key: 'device', label: 'Device' },
    { key: 'role', label: 'Role' },
    { key: 'url_param', label: 'URL parameter' },
  ],
};

export const ThemeTemplateEditorPage = component$<{
  mode: 'create' | 'edit';
  initial?: ThemeTemplateMeta | null;
}>(({ mode, initial }) => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const nav = useNavigate();
  const { success, error: showError } = useSwal();
  const name = useSignal(initial?.name || '');
  const status = useSignal<ThemeTemplateStatus>(initial?.status || 'draft');
  const conditions = useSignal<ThemeTemplateConditionsDoc>(
    initial?.conditions ? { ...initial.conditions, rules: [...initial.conditions.rules] } : emptyThemeConditions(),
  );
  const headerId = useSignal<number | null>(initial?.header_layout_id ?? null);
  const footerId = useSignal<number | null>(initial?.footer_layout_id ?? null);
  const bodyId = useSignal<number | null>(initial?.body_layout_id ?? null);
  const headers = useSignal<ChromeLayoutMeta[]>([]);
  const footers = useSignal<ChromeLayoutMeta[]>([]);
  const bodies = useSignal<ChromeLayoutMeta[]>([]);
  const saving = useSignal(false);
  const loading = useSignal(true);
  const allowBody = useSignal(themeConditionsAllowBody(conditions.value));

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const [h, f, b] = await Promise.all([
        fetchPublishedChromeOptionsFromBrowser('header'),
        fetchPublishedChromeOptionsFromBrowser('footer'),
        fetchPublishedChromeOptionsFromBrowser('body'),
      ]);
      headers.value = h;
      footers.value = f;
      bodies.value = b;
    } catch (e) {
      await showError(String((e as Error)?.message || translateApp(lang, 'common.error')));
    } finally {
      loading.value = false;
    }
  });

  const syncBodyAllowed$ = $(() => {
    allowBody.value = themeConditionsAllowBody(conditions.value);
    if (!allowBody.value) {
      bodyId.value = null;
    }
  });

  const onSave$ = $(async () => {
    if (!name.value.trim()) {
      await showError(translateApp(lang, 'themeBuilder.nameRequired'));
      return;
    }
    saving.value = true;
    try {
      const payload = {
        name: name.value.trim(),
        status: status.value,
        conditions: conditions.value,
        header_layout_id: headerId.value,
        footer_layout_id: footerId.value,
        body_layout_id: allowBody.value ? bodyId.value : null,
      };
      if (mode === 'create') {
        const res = await createThemeTemplateFromBrowser(payload);
        if (!res.success || !res.id) {
          await showError(res.error || translateApp(lang, 'common.error'));
          return;
        }
        await success(translateApp(lang, 'common.created'));
        await nav(R.ADMIN.APPEARANCE_THEME_BUILDER);
      } else if (initial) {
        const res = await updateThemeTemplateFromBrowser(initial.id, payload);
        if (!res.success) {
          await showError(res.error || translateApp(lang, 'common.error'));
          return;
        }
        await success(translateApp(lang, 'common.saved'));
      }
    } finally {
      saving.value = false;
    }
  });

  const updateRule$ = $((index: number, patch: Partial<ThemeConditionRule>) => {
    const next = { ...conditions.value, rules: [...conditions.value.rules] };
    next.rules[index] = { ...next.rules[index], ...patch };
    if (patch.group) {
      const keys = GROUP_KEYS[patch.group] || GROUP_KEYS.entire;
      next.rules[index].key = keys[0]?.key || 'site';
      next.rules[index].value = null;
    }
    conditions.value = next;
    allowBody.value = themeConditionsAllowBody(next);
    if (!allowBody.value) bodyId.value = null;
  });

  if (loading.value) {
    return (
      <div class="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        {translateApp(lang, 'common.loading')}
      </div>
    );
  }

  return (
    <div class="space-y-4">
      <PageHeader
        title={
          mode === 'create'
            ? translateApp(lang, 'themeBuilder.createTitle')
            : name.value || translateApp(lang, 'sidebar.appearanceThemeBuilder')
        }
      >
        <Link href={R.ADMIN.APPEARANCE_THEME_BUILDER} class={ADMIN_BACK_BUTTON_CLASS}>
          {translateApp(lang, 'common.back')}
        </Link>
        {mode === 'edit' && initial ? (
          <BuilderImportExportButtons
            lang={lang}
            builder="theme"
            filenameBase={name.value || 'theme-template'}
            disabled={saving.value}
            getDocument$={$(() => ({
              name: name.value,
              status: status.value,
              conditions: conditions.value,
              header_layout_id: headerId.value,
              footer_layout_id: footerId.value,
              body_layout_id: bodyId.value,
            }))}
            applyDocument$={$((document) => {
              const d = document as Record<string, unknown>;
              if (typeof d.name === 'string' && d.name.trim()) name.value = d.name.trim();
              if (d.status === 'published' || d.status === 'draft') status.value = d.status;
              if (d.conditions && typeof d.conditions === 'object') {
                conditions.value = d.conditions as ThemeTemplateConditionsDoc;
              }
              headerId.value = d.header_layout_id == null ? null : Number(d.header_layout_id);
              footerId.value = d.footer_layout_id == null ? null : Number(d.footer_layout_id);
              bodyId.value = d.body_layout_id == null ? null : Number(d.body_layout_id);
              allowBody.value = themeConditionsAllowBody(conditions.value);
            })}
          />
        ) : null}
        <button type="button" class={ADMIN_PRIMARY_BUTTON_CLASS} disabled={saving.value} onClick$={onSave$}>
          {translateApp(lang, 'common.save')}
        </button>
      </PageHeader>

      <div class={`${ADMIN_FORM_CARD_CLASS} space-y-4 p-4`}>
        <label class={ADMIN_FORM_LABEL_CLASS}>
          {translateApp(lang, 'common.name')}
          <input
            class={ADMIN_FORM_INPUT_CLASS}
            value={name.value}
            onInput$={(e) => (name.value = (e.target as HTMLInputElement).value)}
          />
        </label>
        <label class={ADMIN_FORM_LABEL_CLASS}>
          {translateApp(lang, 'common.status')}
          <select
            class={ADMIN_NATIVE_SELECT_CLASS}
            value={status.value}
            onChange$={(e) => {
              status.value = (e.target as HTMLSelectElement).value === 'published' ? 'published' : 'draft';
            }}
          >
            <option class={ADMIN_NATIVE_OPTION_CLASS} value="draft">
              {translateApp(lang, 'common.statusDraft')}
            </option>
            <option class={ADMIN_NATIVE_OPTION_CLASS} value="published">
              {translateApp(lang, 'common.statusPublished')}
            </option>
          </select>
        </label>
      </div>

      {/* Conditions */}
      <div class={`${ADMIN_FORM_CARD_CLASS} space-y-3 p-4`}>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {translateApp(lang, 'themeBuilder.conditions')}
          </h2>
          <label class={ADMIN_FORM_LABEL_CLASS + ' !mb-0 max-w-xs'}>
            {translateApp(lang, 'themeBuilder.relation')}
            <select
              class={ADMIN_NATIVE_SELECT_CLASS}
              value={conditions.value.relation}
              onChange$={(e) => {
                conditions.value = {
                  ...conditions.value,
                  relation: (e.target as HTMLSelectElement).value === 'or' ? 'or' : 'and',
                };
              }}
            >
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="and">
                AND
              </option>
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="or">
                OR
              </option>
            </select>
          </label>
        </div>

        {conditions.value.rules.map((rule, index) => {
          const keys = GROUP_KEYS[rule.group] || GROUP_KEYS.entire;
          return (
            <div
              key={`rule-${index}`}
              class="grid gap-2 rounded border border-gray-200 p-3 dark:border-gray-700 md:grid-cols-5"
            >
              <label class={ADMIN_CHECKBOX_LABEL_CLASS}>
                <input
                  type="checkbox"
                  class={ADMIN_CHECKBOX_CLASS}
                  checked={rule.include}
                  onChange$={(e) =>
                    updateRule$(index, { include: (e.target as HTMLInputElement).checked })
                  }
                />
                {translateApp(lang, 'themeBuilder.include')}
              </label>
              <select
                class={ADMIN_NATIVE_SELECT_CLASS}
                value={rule.group}
                onChange$={(e) =>
                  updateRule$(index, {
                    group: (e.target as HTMLSelectElement).value as ThemeConditionRule['group'],
                  })
                }
              >
                {(['entire', 'singular', 'archive', 'advanced'] as const).map((g) => (
                  <option key={g} class={ADMIN_NATIVE_OPTION_CLASS} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <select
                class={ADMIN_NATIVE_SELECT_CLASS}
                value={rule.key}
                onChange$={(e) => updateRule$(index, { key: (e.target as HTMLSelectElement).value })}
              >
                {keys.map((k) => (
                  <option key={k.key} class={ADMIN_NATIVE_OPTION_CLASS} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </select>
              <input
                class={ADMIN_FORM_INPUT_CLASS}
                placeholder={translateApp(lang, 'themeBuilder.valueHint')}
                value={rule.value == null ? '' : String(rule.value)}
                onInput$={(e) => {
                  const v = (e.target as HTMLInputElement).value.trim();
                  updateRule$(index, { value: v === '' ? null : /^\d+$/.test(v) ? Number(v) : v });
                }}
              />
              <button
                type="button"
                class="text-sm text-red-600 hover:underline"
                disabled={conditions.value.rules.length <= 1}
                onClick$={() => {
                  const next = {
                    ...conditions.value,
                    rules: conditions.value.rules.filter((_, i) => i !== index),
                  };
                  conditions.value = next;
                  syncBodyAllowed$();
                }}
              >
                {translateApp(lang, 'common.delete')}
              </button>
            </div>
          );
        })}

        <button
          type="button"
          class="text-sm text-primary-600 hover:underline"
          onClick$={() => {
            conditions.value = {
              ...conditions.value,
              rules: [
                ...conditions.value.rules,
                { include: true, group: 'entire', key: 'site', value: null },
              ],
            };
            syncBodyAllowed$();
          }}
        >
          {translateApp(lang, 'themeBuilder.addCondition')}
        </button>
      </div>

      {/* Slots */}
      <div class="grid gap-4 md:grid-cols-3">
        {(
          [
            {
              key: 'header',
              label: translateApp(lang, 'themeBuilder.slotHeader'),
              options: headers.value,
              value: headerId,
              createHref: R.ADMIN.APPEARANCE_HEADER_NEW,
              builderHref: (id: number) => adminHeaderBuilderHref(lang, id),
              enabled: true,
            },
            {
              key: 'body',
              label: translateApp(lang, 'themeBuilder.slotBody'),
              options: bodies.value,
              value: bodyId,
              createHref: R.ADMIN.APPEARANCE_BODY_NEW,
              builderHref: (id: number) => adminBodyBuilderHref(lang, id),
              enabled: allowBody.value,
            },
            {
              key: 'footer',
              label: translateApp(lang, 'themeBuilder.slotFooter'),
              options: footers.value,
              value: footerId,
              createHref: R.ADMIN.APPEARANCE_FOOTER_NEW,
              builderHref: (id: number) => adminFooterBuilderHref(lang, id),
              enabled: true,
            },
          ] as const
        ).map((slot) => (
          <div key={slot.key} class={`${ADMIN_FORM_CARD_CLASS} space-y-3 p-4`}>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{slot.label}</h3>
            {!slot.enabled ? (
              <p class="text-xs text-gray-500">{translateApp(lang, 'themeBuilder.bodyNotApplicable')}</p>
            ) : (
              <>
                <select
                  class={ADMIN_NATIVE_SELECT_CLASS}
                  value={slot.value.value == null ? '' : String(slot.value.value)}
                  onChange$={(e) => {
                    const v = (e.target as HTMLSelectElement).value;
                    slot.value.value = v === '' ? null : Number(v);
                  }}
                >
                  <option class={ADMIN_NATIVE_OPTION_CLASS} value="">
                    {translateApp(lang, 'themeBuilder.inherit')}
                  </option>
                  {slot.options.map((opt) => (
                    <option key={opt.id} class={ADMIN_NATIVE_OPTION_CLASS} value={String(opt.id)}>
                      {opt.name}
                    </option>
                  ))}
                </select>
                <div class="flex flex-wrap gap-3 text-xs">
                  <Link href={slot.createHref} class="text-primary-600 hover:underline">
                    {translateApp(lang, 'themeBuilder.createLayout')}
                  </Link>
                  {slot.value.value ? (
                    <Link href={slot.builderHref(slot.value.value)} class="text-gray-600 hover:underline dark:text-gray-300">
                      {translateApp(lang, 'pages.openBuilder')}
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
