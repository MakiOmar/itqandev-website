/**
 * Admin Style tab: generic group renderer for opted-in widget types.
 */
import { component$, $, type QRL } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import { ColorPickerField } from '~/components/admin/ColorPickerField';
import { InspectorAccordion } from '~/components/admin/InspectorAccordion';
import {
  ADMIN_CHECKBOX_CLASS,
  ADMIN_CHECKBOX_LABEL_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_COMPACT_CLASS,
} from '~/lib/admin/native-select-classes';
import {
  widgetStyleGroups,
  type BuilderStyles,
  type ButtonPart,
  type StyleBreakpoint,
  type StyleDimensions,
  type StyleFilters,
  type StyleLength,
  type StyleShadow,
} from '~/lib/marketing/builder-styles';
import {
  DEFAULT_DIMENSIONS,
  DEFAULT_FILTERS,
  DEFAULT_SHADOW,
  STYLE_DEVICES,
  STYLE_UNITS,
  controlsForWidget,
  inheritedValue,
  isOverride,
  patchStyleBag,
  readDimensions,
  readFilters,
  readLength,
  readShadow,
  type StyleControl,
} from '~/lib/admin/builder-style-controls';

const LENGTH_UNITS = STYLE_UNITS.filter((u) => u !== 'auto');

/** Shared `<details name>` so one Style section is open at a time, including Background/Shape dividers. */
export const STYLE_ACCORDION_GROUP = 'builder-style';

const GROUP_LABEL: Record<string, string> = {
  typography: 'builder.style.groupTypography',
  layout: 'builder.style.groupLayout',
  spacing: 'builder.style.groupSpacing',
  image: 'builder.style.groupImage',
  border: 'builder.style.groupBorder',
  hover: 'builder.style.groupHover',
  caption: 'builder.style.groupCaption',
  title: 'builder.style.groupTitle',
  subtitle: 'builder.style.groupSubtitle',
  btn_primary: 'builder.style.groupBtnPrimary',
  btn_secondary: 'builder.style.groupBtnSecondary',
  tabs: 'builder.style.groupTabs',
  nav_buttons: 'builder.style.groupNavButtons',
  link: 'builder.style.groupLink',
  card_box: 'builder.style.groupCardBox',
  card_category: 'builder.style.groupCardCategory',
  card_title: 'builder.style.groupCardTitle',
  card_summary: 'builder.style.groupCardSummary',
  card_chips: 'builder.style.groupCardChips',
  btn_card: 'builder.style.groupBtnCard',
  rating: 'builder.style.groupRating',
  quote: 'builder.style.groupQuote',
  author_name: 'builder.style.groupAuthorName',
  author_meta: 'builder.style.groupAuthorMeta',
  avatar: 'builder.style.groupAvatar',
  custom: 'builder.style.groupCustom',
};

const KEY_LABEL: Record<string, string> = {
  type_role: 'builder.style.typeRole',
  font_size: 'builder.style.fontSize',
  font_weight: 'builder.style.fontWeight',
  line_height: 'builder.style.lineHeight',
  letter_spacing: 'builder.style.letterSpacing',
  text_color: 'builder.style.textColor',
  text_transform: 'builder.style.transform',
  align: 'builder.style.align',
  width: 'builder.style.width',
  max_width: 'builder.style.maxWidth',
  height: 'builder.style.height',
  object_fit: 'builder.style.objectFit',
  object_position: 'builder.style.objectPosition',
  overflow: 'builder.style.overflow',
  z_index: 'builder.style.zIndex',
  margin: 'builder.style.margin',
  padding: 'builder.style.padding',
  opacity: 'builder.style.opacity',
  filters: 'builder.style.filters',
  border_style: 'builder.style.borderStyle',
  border_width: 'builder.style.borderWidth',
  border_color: 'builder.style.borderColor',
  radius: 'builder.style.radius',
  box_shadow: 'builder.style.boxShadow',
  hover_opacity: 'builder.style.hoverOpacity',
  hover_filters: 'builder.style.hoverFilters',
  hover_transition: 'builder.style.hoverTransition',
  hover_animation: 'builder.style.hoverAnimation',
  hover_box_shadow: 'builder.style.hoverShadow',
  caption_align: 'builder.style.captionAlign',
  caption_color: 'builder.style.captionColor',
  caption_font_size: 'builder.style.fontSize',
  caption_font_weight: 'builder.style.fontWeight',
  caption_transform: 'builder.style.transform',
  caption_font_style: 'builder.style.fontStyle',
  caption_decoration: 'builder.style.decoration',
  caption_line_height: 'builder.style.lineHeight',
  caption_letter_spacing: 'builder.style.letterSpacing',
  caption_spacing: 'builder.style.captionSpacing',
  custom_css: 'builder.style.customCss',
  tab_font_size: 'builder.style.fontSize',
  tab_font_weight: 'builder.style.fontWeight',
  tab_color: 'builder.style.textColor',
  tab_bg: 'builder.style.background',
  tab_hover_color: 'builder.style.hoverTextColor',
  tab_hover_bg: 'builder.style.hoverBackground',
  tab_active_color: 'builder.style.activeTextColor',
  tab_active_bg: 'builder.style.activeBackground',
  tab_indicator_color: 'builder.style.activeIndicator',
  tab_radius: 'builder.style.radius',
  nav_size: 'builder.style.buttonSize',
  nav_icon_size: 'builder.style.iconSize',
  nav_color: 'builder.style.iconColor',
  nav_bg: 'builder.style.background',
  nav_border_color: 'builder.style.borderColor',
  nav_hover_color: 'builder.style.hoverIconColor',
  nav_hover_bg: 'builder.style.hoverBackground',
  nav_radius: 'builder.style.radius',
  link_font_size: 'builder.style.fontSize',
  link_font_weight: 'builder.style.fontWeight',
  link_transform: 'builder.style.transform',
  link_letter_spacing: 'builder.style.letterSpacing',
  link_color: 'builder.style.textColor',
  link_hover_color: 'builder.style.hoverTextColor',
  ...sectionTextLabels('title'),
  ...sectionTextLabels('subtitle'),
  ...buttonLabels('btn_primary'),
  ...buttonLabels('btn_secondary'),
  ...buttonLabels('btn_card'),
  card_bg: 'builder.style.background',
  card_border_color: 'builder.style.borderColor',
  card_hover_border_color: 'builder.style.hoverBorderColor',
  card_border_width: 'builder.style.borderWidth',
  card_radius: 'builder.style.radius',
  card_padding: 'builder.style.padding',
  card_shadow: 'builder.style.boxShadow',
  card_hover_shadow: 'builder.style.hoverShadow',
  card_cat_font_size: 'builder.style.fontSize',
  card_cat_font_weight: 'builder.style.fontWeight',
  card_cat_transform: 'builder.style.transform',
  card_cat_letter_spacing: 'builder.style.letterSpacing',
  card_cat_color: 'builder.style.textColor',
  card_cat_bg: 'builder.style.background',
  card_cat_radius: 'builder.style.radius',
  card_title_font_size: 'builder.style.fontSize',
  card_title_font_weight: 'builder.style.fontWeight',
  card_title_line_height: 'builder.style.lineHeight',
  card_title_letter_spacing: 'builder.style.letterSpacing',
  card_title_transform: 'builder.style.transform',
  card_title_color: 'builder.style.textColor',
  card_title_hover_color: 'builder.style.cardHoverTextColor',
  card_summary_font_size: 'builder.style.fontSize',
  card_summary_font_weight: 'builder.style.fontWeight',
  card_summary_line_height: 'builder.style.lineHeight',
  card_summary_color: 'builder.style.textColor',
  card_chip_font_size: 'builder.style.fontSize',
  card_chip_font_weight: 'builder.style.fontWeight',
  card_chip_color: 'builder.style.textColor',
  card_chip_bg: 'builder.style.background',
  card_chip_border_color: 'builder.style.borderColor',
  card_chip_radius: 'builder.style.radius',
  rating_color: 'builder.style.starColor',
  rating_empty_color: 'builder.style.starEmptyColor',
  rating_size: 'builder.style.starSize',
  quote_font_size: 'builder.style.fontSize',
  quote_font_weight: 'builder.style.fontWeight',
  quote_line_height: 'builder.style.lineHeight',
  quote_letter_spacing: 'builder.style.letterSpacing',
  quote_font_style: 'builder.style.fontStyle',
  quote_color: 'builder.style.textColor',
  author_name_font_size: 'builder.style.fontSize',
  author_name_font_weight: 'builder.style.fontWeight',
  author_name_transform: 'builder.style.transform',
  author_name_letter_spacing: 'builder.style.letterSpacing',
  author_name_color: 'builder.style.textColor',
  author_divider_color: 'builder.style.dividerColor',
  author_meta_font_size: 'builder.style.fontSize',
  author_meta_font_weight: 'builder.style.fontWeight',
  author_meta_color: 'builder.style.textColor',
  avatar_size: 'builder.style.avatarSize',
  avatar_radius: 'builder.style.radius',
  avatar_ring_width: 'builder.style.ringWidth',
  avatar_ring_color: 'builder.style.ringColor',
};

function buttonLabels(part: ButtonPart): Record<string, string> {
  return {
    [`${part}_font_size`]: 'builder.style.fontSize',
    [`${part}_font_weight`]: 'builder.style.fontWeight',
    [`${part}_transform`]: 'builder.style.transform',
    [`${part}_letter_spacing`]: 'builder.style.letterSpacing',
    [`${part}_color`]: 'builder.style.textColor',
    [`${part}_bg`]: 'builder.style.background',
    [`${part}_border_color`]: 'builder.style.borderColor',
    [`${part}_hover_color`]: 'builder.style.hoverTextColor',
    [`${part}_hover_bg`]: 'builder.style.hoverBackground',
    [`${part}_hover_border_color`]: 'builder.style.hoverBorderColor',
    [`${part}_border_width`]: 'builder.style.borderWidth',
    [`${part}_radius`]: 'builder.style.radius',
    [`${part}_padding_y`]: 'builder.style.paddingY',
    [`${part}_padding_x`]: 'builder.style.paddingX',
    [`${part}_min_width`]: 'builder.style.minWidth',
    [`${part}_shadow`]: 'builder.style.boxShadow',
    [`${part}_hover_shadow`]: 'builder.style.hoverShadow',
  };
}

function sectionTextLabels(part: 'title' | 'subtitle'): Record<string, string> {
  return {
    [`${part}_font_size`]: 'builder.style.fontSize',
    [`${part}_font_weight`]: 'builder.style.fontWeight',
    [`${part}_line_height`]: 'builder.style.lineHeight',
    [`${part}_letter_spacing`]: 'builder.style.letterSpacing',
    [`${part}_transform`]: 'builder.style.transform',
    [`${part}_color`]: 'builder.style.textColor',
  };
}

type PatchQrl = QRL<(key: string, value: unknown) => void | Promise<void>>;

const fieldLabel = (lang: string, key: string) =>
  translateApp(lang, KEY_LABEL[key] || key);

const ResetBtn = component$<{
  lang: string;
  show: boolean;
  onReset$: QRL<() => void>;
}>((props) => {
  if (!props.show) return null;
  return (
    <button
      type="button"
      class="text-[10px] font-medium text-primary-600 hover:underline dark:text-primary-400"
      onClick$={props.onReset$}
    >
      {translateApp(props.lang, 'builder.style.reset')}
    </button>
  );
});

const StyleDeviceBtn = component$<{
  lang: string;
  device: StyleBreakpoint;
  active: boolean;
  onDevice$: QRL<(device: StyleBreakpoint) => void>;
}>((props) => {
  return (
    <button
      type="button"
      class={[
        'flex-1 rounded-md px-2 py-1 text-[11px] font-medium',
        props.active
          ? 'bg-primary-600 text-white'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
      ].join(' ')}
      onClick$={() => props.onDevice$(props.device)}
    >
      {translateApp(props.lang, `pages.device.${props.device}`)}
    </button>
  );
});

const StyleDeviceSwitcher = component$<{
  lang: string;
  device: StyleBreakpoint;
  onDevice$: QRL<(device: StyleBreakpoint) => void>;
}>((props) => {
  return (
    <div class="inline-flex w-full rounded-lg border border-gray-300 p-0.5 dark:border-gray-600">
      {STYLE_DEVICES.map((device) => (
        <StyleDeviceBtn
          key={device}
          lang={props.lang}
          device={device}
          active={props.device === device}
          onDevice$={props.onDevice$}
        />
      ))}
    </div>
  );
});

const ChooseOptionBtn = component$<{
  lang: string;
  controlKey: string;
  optionValue: string;
  labelKey: string;
  selected: boolean;
  onPatch$: PatchQrl;
}>((props) => {
  return (
    <button
      type="button"
      class={[
        'rounded border px-2 py-1 text-[11px] font-medium',
        props.selected
          ? 'border-primary-500 bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-100'
          : 'border-gray-300 text-gray-700 hover:border-primary-400 dark:border-gray-600 dark:text-gray-200',
      ].join(' ')}
      onClick$={() => props.onPatch$(props.controlKey, props.optionValue)}
    >
      {translateApp(props.lang, props.labelKey)}
    </button>
  );
});

const ChooseControl = component$<{
  lang: string;
  control: StyleControl;
  value: string;
  override: boolean;
  onPatch$: PatchQrl;
}>((props) => {
  return (
    <div>
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
          {fieldLabel(props.lang, props.control.key)}
        </span>
        <ResetBtn
          lang={props.lang}
          show={props.override}
          onReset$={$(() => props.onPatch$(props.control.key, undefined))}
        />
      </div>
      <div class="flex flex-wrap gap-1">
        {(props.control.options || []).map((opt) => (
          <ChooseOptionBtn
            key={opt.value}
            lang={props.lang}
            controlKey={props.control.key}
            optionValue={opt.value}
            labelKey={opt.labelKey}
            selected={props.value === opt.value}
            onPatch$={props.onPatch$}
          />
        ))}
      </div>
    </div>
  );
});

const SelectControl = component$<{
  lang: string;
  control: StyleControl;
  value: string;
  override: boolean;
  onPatch$: PatchQrl;
}>((props) => {
  return (
    <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
      <span class="mb-1 flex items-center justify-between gap-2">
        {fieldLabel(props.lang, props.control.key)}
        <ResetBtn
          lang={props.lang}
          show={props.override}
          onReset$={$(() => props.onPatch$(props.control.key, undefined))}
        />
      </span>
      <select
        class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-1 w-full`}
        value={props.value}
        onChange$={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          props.onPatch$(props.control.key, v === '' ? undefined : v);
        }}
      >
        <option class={ADMIN_NATIVE_OPTION_CLASS} value="">
          {translateApp(props.lang, 'builder.style.inherit')}
        </option>
        {(props.control.options || []).map((opt) => (
          <option class={ADMIN_NATIVE_OPTION_CLASS} key={opt.value} value={opt.value}>
            {translateApp(props.lang, opt.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
});

const LengthControl = component$<{
  lang: string;
  control: StyleControl;
  value: StyleLength | null;
  override: boolean;
  allowAuto: boolean;
  onPatch$: PatchQrl;
}>((props) => {
  const unit = props.value?.unit || 'px';
  const units = props.allowAuto ? STYLE_UNITS : LENGTH_UNITS;
  return (
    <div>
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
          {fieldLabel(props.lang, props.control.key)}
        </span>
        <ResetBtn
          lang={props.lang}
          show={props.override}
          onReset$={$(() => props.onPatch$(props.control.key, undefined))}
        />
      </div>
      <div class="flex gap-1">
        <input
          type="number"
          class="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-950"
          min={props.control.min}
          max={props.control.max}
          step={props.control.step || 1}
          disabled={unit === 'auto'}
          placeholder={translateApp(props.lang, 'builder.style.inherit')}
          value={unit === 'auto' ? '' : props.value ? String(props.value.value) : ''}
          onInput$={(e) => {
            const raw = (e.target as HTMLInputElement).value;
            if (raw === '') {
              props.onPatch$(props.control.key, undefined);
              return;
            }
            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            props.onPatch$(props.control.key, { value: n, unit: unit === 'auto' ? 'px' : unit });
          }}
        />
        <select
          class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} w-[4.5rem]`}
          value={unit}
          onChange$={(e) => {
            const nextUnit = (e.target as HTMLSelectElement).value;
            if (nextUnit === 'auto') {
              props.onPatch$(props.control.key, { value: 0, unit: 'auto' });
              return;
            }
            const n = props.value?.value ?? 0;
            props.onPatch$(props.control.key, { value: n, unit: nextUnit });
          }}
        >
          {units.map((u) => (
            <option class={ADMIN_NATIVE_OPTION_CLASS} key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
});

const DimensionsControl = component$<{
  lang: string;
  control: StyleControl;
  value: StyleDimensions | null;
  override: boolean;
  onPatch$: PatchQrl;
}>((props) => {
  const d = props.value || DEFAULT_DIMENSIONS;
  const write = $((patch: Partial<StyleDimensions>) => {
    const base = props.value || { ...DEFAULT_DIMENSIONS };
    const next: StyleDimensions = { ...base, ...patch };
    if (next.linked && (patch.top !== undefined || patch.right !== undefined || patch.bottom !== undefined || patch.left !== undefined)) {
      const v = patch.top ?? patch.right ?? patch.bottom ?? patch.left ?? next.top;
      next.top = v;
      next.right = v;
      next.bottom = v;
      next.left = v;
    }
    props.onPatch$(props.control.key, next);
  });
  return (
    <div>
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
          {fieldLabel(props.lang, props.control.key)}
        </span>
        <ResetBtn
          lang={props.lang}
          show={props.override}
          onReset$={$(() => props.onPatch$(props.control.key, undefined))}
        />
      </div>
      <div class="mb-1 flex items-center justify-between gap-2">
        <label class={ADMIN_CHECKBOX_LABEL_CLASS}>
          <input
            type="checkbox"
            class={ADMIN_CHECKBOX_CLASS}
            checked={d.linked !== false}
            onChange$={(e) => write({ linked: (e.target as HTMLInputElement).checked })}
          />
          {translateApp(props.lang, 'builder.style.linked')}
        </label>
        <select
          class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} w-[4.5rem]`}
          value={d.unit}
          onChange$={(e) => write({ unit: (e.target as HTMLSelectElement).value })}
        >
          {LENGTH_UNITS.map((u) => (
            <option class={ADMIN_NATIVE_OPTION_CLASS} key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      <div class="grid grid-cols-4 gap-1">
        <DimSide label="T" value={d.top} side="top" write$={write} />
        <DimSide label="R" value={d.right} side="right" write$={write} />
        <DimSide label="B" value={d.bottom} side="bottom" write$={write} />
        <DimSide label="L" value={d.left} side="left" write$={write} />
      </div>
    </div>
  );
});

const DimSide = component$<{
  label: string;
  value: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  write$: QRL<(patch: Partial<StyleDimensions>) => void>;
}>((props) => {
  return (
    <label class="block text-center text-[10px] text-gray-500">
      {props.label}
      <input
        type="number"
        class="mt-0.5 w-full rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-600 dark:bg-slate-950"
        value={props.value}
        onInput$={(e) => {
          const n = Number((e.target as HTMLInputElement).value);
          if (!Number.isFinite(n)) return;
          props.write$({ [props.side]: n } as Partial<StyleDimensions>);
        }}
      />
    </label>
  );
});

const ColorControl = component$<{
  lang: string;
  control: StyleControl;
  value: string;
  override: boolean;
  onPatch$: PatchQrl;
}>((props) => {
  const hex =
    typeof props.value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(props.value.trim())
      ? props.value.trim().toLowerCase()
      : '';
  const pickerValue =
    hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex.slice(0, 7) || '#0389a1';
  return (
    <div>
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
          {fieldLabel(props.lang, props.control.key)}
        </span>
        <ResetBtn
          lang={props.lang}
          show={props.override}
          onReset$={$(() => props.onPatch$(props.control.key, undefined))}
        />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ColorPickerField
          value={hex}
          fallback={pickerValue}
          lang={props.lang}
          label={fieldLabel(props.lang, props.control.key)}
          onChange$={(next) => props.onPatch$(props.control.key, next === '' ? undefined : next)}
        />
        <input
          type="text"
          placeholder={translateApp(props.lang, 'builder.style.inherit')}
          class="min-w-[7rem] flex-1 rounded border px-2 py-1.5 text-sm dark:bg-gray-900"
          value={hex}
          onInput$={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            props.onPatch$(props.control.key, v === '' ? undefined : v);
          }}
        />
      </div>
    </div>
  );
});

const SliderControl = component$<{
  lang: string;
  control: StyleControl;
  value: number | null;
  override: boolean;
  onPatch$: PatchQrl;
}>((props) => {
  const min = props.control.min ?? 0;
  const max = props.control.max ?? 1;
  const shown = props.value == null ? max : props.value;
  return (
    <div>
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
          {fieldLabel(props.lang, props.control.key)}
          {props.value != null ? ` (${props.value})` : ''}
        </span>
        <ResetBtn
          lang={props.lang}
          show={props.override}
          onReset$={$(() => props.onPatch$(props.control.key, undefined))}
        />
      </div>
      <input
        type="range"
        class="w-full"
        min={min}
        max={max}
        step={props.control.step ?? 0.05}
        value={shown}
        onInput$={(e) => props.onPatch$(props.control.key, Number((e.target as HTMLInputElement).value))}
      />
    </div>
  );
});

const NumberControl = component$<{
  lang: string;
  control: StyleControl;
  value: number | null;
  override: boolean;
  onPatch$: PatchQrl;
}>((props) => {
  return (
    <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
      <span class="mb-1 flex items-center justify-between gap-2">
        {fieldLabel(props.lang, props.control.key)}
        <ResetBtn
          lang={props.lang}
          show={props.override}
          onReset$={$(() => props.onPatch$(props.control.key, undefined))}
        />
      </span>
      <input
        type="number"
        class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-950"
        min={props.control.min}
        max={props.control.max}
        step={props.control.step || 1}
        placeholder={translateApp(props.lang, 'builder.style.inherit')}
        value={props.value == null ? '' : String(props.value)}
        onInput$={(e) => {
          const raw = (e.target as HTMLInputElement).value;
          if (raw === '') {
            props.onPatch$(props.control.key, undefined);
            return;
          }
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          props.onPatch$(props.control.key, n);
        }}
      />
    </label>
  );
});

const FiltersControl = component$<{
  lang: string;
  control: StyleControl;
  value: StyleFilters | null;
  override: boolean;
  onPatch$: PatchQrl;
}>((props) => {
  const f = props.value || DEFAULT_FILTERS;
  const write = $((patch: Partial<StyleFilters>) => {
    props.onPatch$(props.control.key, { ...(props.value || DEFAULT_FILTERS), ...patch });
  });
  return (
    <div class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
          {fieldLabel(props.lang, props.control.key)}
        </span>
        <ResetBtn
          lang={props.lang}
          show={props.override}
          onReset$={$(() => props.onPatch$(props.control.key, undefined))}
        />
      </div>
      <FilterSlider lang={props.lang} labelKey="builder.style.filterBlur" field="blur" min={0} max={50} value={f.blur} write$={write} />
      <FilterSlider lang={props.lang} labelKey="builder.style.filterBrightness" field="brightness" min={0} max={200} value={f.brightness} write$={write} />
      <FilterSlider lang={props.lang} labelKey="builder.style.filterContrast" field="contrast" min={0} max={200} value={f.contrast} write$={write} />
      <FilterSlider lang={props.lang} labelKey="builder.style.filterSaturate" field="saturate" min={0} max={200} value={f.saturate} write$={write} />
      <FilterSlider lang={props.lang} labelKey="builder.style.filterHue" field="hue" min={-180} max={180} value={f.hue} write$={write} />
    </div>
  );
});

const FilterSlider = component$<{
  lang: string;
  labelKey: string;
  field: keyof StyleFilters;
  min: number;
  max: number;
  value: number;
  write$: QRL<(patch: Partial<StyleFilters>) => void>;
}>((props) => {
  return (
    <label class="block text-[11px] text-gray-500">
      {translateApp(props.lang, props.labelKey)} ({props.value})
      <input
        type="range"
        class="w-full"
        min={props.min}
        max={props.max}
        step={1}
        value={props.value}
        onInput$={(e) => props.write$({ [props.field]: Number((e.target as HTMLInputElement).value) })}
      />
    </label>
  );
});

const ShadowControl = component$<{
  lang: string;
  control: StyleControl;
  value: StyleShadow | null;
  override: boolean;
  onPatch$: PatchQrl;
}>((props) => {
  const s = props.value || DEFAULT_SHADOW;
  const write = $((patch: Partial<StyleShadow>) => {
    props.onPatch$(props.control.key, { ...(props.value || DEFAULT_SHADOW), ...patch });
  });
  return (
    <div class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
          {fieldLabel(props.lang, props.control.key)}
        </span>
        <ResetBtn
          lang={props.lang}
          show={props.override}
          onReset$={$(() => props.onPatch$(props.control.key, undefined))}
        />
      </div>
      <div class="flex items-center gap-2">
        <ColorPickerField
          value={s.color}
          lang={props.lang}
          class="h-8 w-10"
          label={fieldLabel(props.lang, props.control.key)}
          onChange$={(next) => write({ color: next || '#00000066' })}
        />
        <input
          type="text"
          class="min-w-0 flex-1 rounded border px-2 py-1 text-xs dark:bg-gray-900"
          value={s.color}
          onInput$={(e) => write({ color: (e.target as HTMLInputElement).value })}
        />
      </div>
      <div class="grid grid-cols-4 gap-1">
        <ShadowNum label="h" field="h" value={s.h} write$={write} />
        <ShadowNum label="v" field="v" value={s.v} write$={write} />
        <ShadowNum label="blur" field="blur" value={s.blur} write$={write} />
        <ShadowNum label="spread" field="spread" value={s.spread} write$={write} />
      </div>
      <label class={ADMIN_CHECKBOX_LABEL_CLASS}>
        <input
          type="checkbox"
          class={ADMIN_CHECKBOX_CLASS}
          checked={!!s.inset}
          onChange$={(e) => write({ inset: (e.target as HTMLInputElement).checked })}
        />
        {translateApp(props.lang, 'builder.style.inset')}
      </label>
    </div>
  );
});

const ShadowNum = component$<{
  label: string;
  field: 'h' | 'v' | 'blur' | 'spread';
  value: number;
  write$: QRL<(patch: Partial<StyleShadow>) => void>;
}>((props) => {
  return (
    <label class="block text-center text-[10px] text-gray-500">
      {props.label}
      <input
        type="number"
        class="mt-0.5 w-full rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-600 dark:bg-slate-950"
        value={props.value}
        onInput$={(e) => {
          const n = Number((e.target as HTMLInputElement).value);
          if (!Number.isFinite(n)) return;
          props.write$({ [props.field]: n });
        }}
      />
    </label>
  );
});

const TextareaControl = component$<{
  lang: string;
  control: StyleControl;
  value: string;
  override: boolean;
  onPatch$: PatchQrl;
}>((props) => {
  return (
    <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
      <span class="mb-1 flex items-center justify-between gap-2">
        {fieldLabel(props.lang, props.control.key)}
        <ResetBtn
          lang={props.lang}
          show={props.override}
          onReset$={$(() => props.onPatch$(props.control.key, undefined))}
        />
      </span>
      <textarea
        class="mt-1 min-h-[7rem] w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-xs dark:border-gray-600 dark:bg-slate-950"
        placeholder={'selector { ... }'}
        value={props.value}
        onInput$={(e) => {
          const v = (e.target as HTMLTextAreaElement).value;
          props.onPatch$(props.control.key, v.trim() === '' ? undefined : v);
        }}
      />
      <span class="mt-1 block text-[11px] font-normal leading-snug text-gray-500">
        {translateApp(props.lang, 'builder.style.customCssHint')}
      </span>
    </label>
  );
});

const StyleControlRow = component$<{
  lang: string;
  control: StyleControl;
  styles: BuilderStyles | null | undefined;
  device: StyleBreakpoint;
  onPatch$: PatchQrl;
}>((props) => {
  const raw = inheritedValue(props.styles, props.device, props.control.key);
  const override = isOverride(props.styles, props.device, props.control.key);
  const c = props.control;
  if (c.type === 'choose') {
    return (
      <ChooseControl
        lang={props.lang}
        control={c}
        value={typeof raw === 'string' ? raw : ''}
        override={override}
        onPatch$={props.onPatch$}
      />
    );
  }
  if (c.type === 'select') {
    return (
      <SelectControl
        lang={props.lang}
        control={c}
        value={typeof raw === 'string' ? raw : ''}
        override={override}
        onPatch$={props.onPatch$}
      />
    );
  }
  if (c.type === 'length') {
    return (
      <LengthControl
        lang={props.lang}
        control={c}
        value={readLength(raw)}
        override={override}
        allowAuto={c.key === 'width' || c.key === 'max_width' || c.key === 'height'}
        onPatch$={props.onPatch$}
      />
    );
  }
  if (c.type === 'dimensions') {
    return (
      <DimensionsControl
        lang={props.lang}
        control={c}
        value={readDimensions(raw)}
        override={override}
        onPatch$={props.onPatch$}
      />
    );
  }
  if (c.type === 'color') {
    return (
      <ColorControl
        lang={props.lang}
        control={c}
        value={typeof raw === 'string' ? raw : ''}
        override={override}
        onPatch$={props.onPatch$}
      />
    );
  }
  if (c.type === 'slider') {
    return (
      <SliderControl
        lang={props.lang}
        control={c}
        value={typeof raw === 'number' ? raw : null}
        override={override}
        onPatch$={props.onPatch$}
      />
    );
  }
  if (c.type === 'number') {
    return (
      <NumberControl
        lang={props.lang}
        control={c}
        value={typeof raw === 'number' ? raw : null}
        override={override}
        onPatch$={props.onPatch$}
      />
    );
  }
  if (c.type === 'filters') {
    return (
      <FiltersControl
        lang={props.lang}
        control={c}
        value={readFilters(raw)}
        override={override}
        onPatch$={props.onPatch$}
      />
    );
  }
  if (c.type === 'shadow') {
    return (
      <ShadowControl
        lang={props.lang}
        control={c}
        value={readShadow(raw)}
        override={override}
        onPatch$={props.onPatch$}
      />
    );
  }
  return (
    <TextareaControl
      lang={props.lang}
      control={c}
      value={typeof raw === 'string' ? raw : ''}
      override={override}
      onPatch$={props.onPatch$}
    />
  );
});

export const BuilderStylePanel = component$<{
  lang: string;
  widgetType: string;
  styles: BuilderStyles | null | undefined;
  device: StyleBreakpoint;
  onDevice$: QRL<(device: StyleBreakpoint) => void>;
  onChange$: QRL<(next: BuilderStyles) => void | Promise<void>>;
  /** Open the first group; off when sections above it (e.g. Background) already open one. */
  openFirst?: boolean;
}>((props) => {
  const groups = widgetStyleGroups(props.widgetType);
  if (groups.length === 0) {
    return (
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {translateApp(props.lang, 'builder.style.empty')}
      </p>
    );
  }

  const onPatch$ = $(async (key: string, value: unknown) => {
    const device: StyleBreakpoint = key === 'custom_css' ? 'desktop' : props.device;
    await props.onChange$(patchStyleBag(props.styles, device, key, value));
  });

  const controls = controlsForWidget(props.widgetType);

  return (
    <div class="space-y-4">
      {/* Device matches the canvas preview so WYSIWYG stays in sync. */}
      <StyleDeviceSwitcher lang={props.lang} device={props.device} onDevice$={props.onDevice$} />
      <p class="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
        {translateApp(props.lang, 'builder.style.inheritHint')}
      </p>
      <div>
        {groups.map((group, index) => (
          <InspectorAccordion
            key={group}
            title={translateApp(props.lang, GROUP_LABEL[group] || group)}
            group={STYLE_ACCORDION_GROUP}
            open={index === 0 && props.openFirst !== false}
          >
            {controls
              .filter((c) => c.group === group)
              .map((control) => (
                <StyleControlRow
                  key={control.key}
                  lang={props.lang}
                  control={control}
                  styles={props.styles}
                  device={group === 'custom' ? 'desktop' : props.device}
                  onPatch$={onPatch$}
                />
              ))}
          </InspectorAccordion>
        ))}
      </div>
    </div>
  );
});
