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
import { WHATSAPP_SVG } from '~/components/marketing/widgets/whatsapp-icon';
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
