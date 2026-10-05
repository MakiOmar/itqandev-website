import { $, component$, useId, useSignal, useStyles$ } from '@builder.io/qwik';
import { SvgIcon } from '~/components/marketing/SvgIcon';
import { FormRenderer } from '~/components/marketing/forms/FormRenderer';
import { marketingRoutes } from '~/lib/marketing/constants';
import { translateApp } from '~/lib/i18n/translate-app';
import {
  floatingCorner,
  floatingOffset,
  settingBool,
  settingText,
  whatsappHref,
} from '~/components/marketing/widgets/floating-widget-settings';
import styles from './contact-float.css?inline';

export type ContactFloatWidgetProps = {
  settings: Record<string, unknown>;
  uiLocale: string;
  /** Forms module on: the "leave a message" button opens the chosen form inside the panel. */
  formsEnabled: boolean;
  /** Builder canvas: in the flow with the panel open, so it can be selected and styled. */
  editorPreview?: boolean;
};

const STROKE = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"';
const CLOSE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${STROKE} d="M18 6L6 18M6 6l12 12"/></svg>`;
const BACK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${STROKE} d="m15 18l-6-6l6-6"/></svg>`;
const MAIL_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><g ${STROKE}><path d="m22 7l-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect width="20" height="16" x="2" y="4" rx="2"/></g></svg>`;
/* Simple Icons "whatsapp" (CC0), shipped inline so the site makes no third-party request. */
const WHATSAPP_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967c-.273-.099-.471-.148-.67.15c-.197.297-.767.966-.94 1.164c-.173.199-.347.223-.644.075c-.297-.15-1.255-.463-2.39-1.475c-.883-.788-1.48-1.761-1.653-2.059c-.173-.297-.018-.458.13-.606c.134-.133.298-.347.446-.52s.198-.298.298-.497c.099-.198.05-.371-.025-.52s-.669-1.612-.916-2.207c-.242-.579-.487-.5-.669-.51a13 13 0 0 0-.57-.01c-.198 0-.52.074-.792.372c-.272.297-1.04 1.016-1.04 2.479c0 1.462 1.065 2.875 1.213 3.074s2.096 3.2 5.077 4.487c.709.306 1.262.489 1.694.625c.712.227 1.36.195 1.871.118c.571-.085 1.758-.719 2.006-1.413s.248-1.289.173-1.413c-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214l-3.741.982l.998-3.648l-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884c2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413"/></svg>';

/**
 * `contact_float` widget: launcher button that opens a panel with a WhatsApp chat link and a
 * "leave a message" form. The form mounts (and fetches) only when the visitor asks for it.
 */
export const ContactFloatWidget = component$<ContactFloatWidgetProps>((props) => {
  useStyles$(styles);
  const open = useSignal(false);
  const showForm = useSignal(false);
  const launcherRef = useSignal<HTMLButtonElement>();
  const closeRef = useSignal<HTMLButtonElement>();
  const uid = useId();
  const panelId = `cf-panel-${uid}`;
  const titleId = `cf-title-${uid}`;

  const s = props.settings;
  const preview = props.editorPreview === true;
  const lang = props.uiLocale;
  const title = settingText(s.panel_title);
  const intro = settingText(s.panel_text);
  const launcherLabel = settingText(s.launcher_label);
  const waEnabled = settingBool(s.whatsapp_enabled, true);
  const waLabel = settingText(s.whatsapp_label) || 'WhatsApp';
  const waHref = whatsappHref(s.whatsapp_number, settingText(s.whatsapp_message));
  const msgEnabled = settingBool(s.message_enabled, true);
  const msgLabel = settingText(s.message_label) || translateApp(lang, 'floatingWidgets.contactPage');
  const formSlug = props.formsEnabled ? settingText(s.form_slug) : '';
  const showWhatsapp = waEnabled && (waHref !== null || preview);
  const panelOpen = open.value || preview;

  const close$ = $(() => {
    open.value = false;
    showForm.value = false;
    launcherRef.value?.focus();
  });

  return (
    <div
      class="cf"
      data-corner={floatingCorner(s.corner)}
      data-preview={preview ? '' : undefined}
      style={{
        '--cf-ox': `${floatingOffset(s.offset_x)}px`,
        '--cf-oy': `${floatingOffset(s.offset_y)}px`,
      }}
      onKeyDown$={(event) => {
        if (event.key === 'Escape' && open.value) close$();
      }}
    >
      {panelOpen ? (
        /* Non-modal panel: the page stays usable; Escape or the close button dismisses it */
        <div class="cf-panel" id={panelId} role="dialog" aria-labelledby={title ? titleId : undefined}>
          <div class="cf-head">
            <div>
              {title ? (
                <p class="cf-title" id={titleId}>
                  {title}
                </p>
              ) : null}
              {intro ? <p class="cf-text">{intro}</p> : null}
            </div>
            <button
              type="button"
              ref={closeRef}
              class="cf-close"
              aria-label={translateApp(lang, 'floatingWidgets.closePanel')}
              onClick$={close$}
              dangerouslySetInnerHTML={CLOSE_SVG}
            />
          </div>
          <div class="cf-body">
            {showForm.value && formSlug ? (
              <>
                <button type="button" class="cf-back" onClick$={() => (showForm.value = false)}>
                  <span class="inline-flex" dangerouslySetInnerHTML={BACK_SVG} />
                  {translateApp(lang, 'floatingWidgets.backToOptions')}
                </button>
                <FormRenderer slug={formSlug} contentLocale={lang} class="w-full" />
              </>
            ) : (
              <>
                {showWhatsapp ? (
                  <a
                    class="cf-action cf-wa"
                    href={waHref ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span class="inline-flex" dangerouslySetInnerHTML={WHATSAPP_SVG} />
                    {waLabel}
                  </a>
                ) : null}
                {msgEnabled && formSlug ? (
                  <button type="button" class="cf-action cf-msg" onClick$={() => (showForm.value = true)}>
                    <span class="inline-flex" dangerouslySetInnerHTML={MAIL_SVG} />
                    {msgLabel}
                  </button>
                ) : null}
                {msgEnabled && !formSlug ? (
                  <a class="cf-action cf-msg" href={marketingRoutes(lang).contact}>
                    <span class="inline-flex" dangerouslySetInnerHTML={MAIL_SVG} />
                    {msgLabel}
                  </a>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        ref={launcherRef}
        class="cf-launcher"
        data-labelled={launcherLabel ? '' : undefined}
        aria-expanded={panelOpen ? 'true' : 'false'}
        aria-controls={panelOpen ? panelId : undefined}
        aria-label={launcherLabel ? undefined : title || translateApp(lang, 'floatingWidgets.openContact')}
        onClick$={() => {
          if (open.value) {
            close$();
            return;
          }
          open.value = true;
          requestAnimationFrame(() => closeRef.value?.focus());
        }}
      >
        <SvgIcon value={s.launcher_icon} />
        {launcherLabel ? <span>{launcherLabel}</span> : null}
      </button>
    </div>
  );
});
