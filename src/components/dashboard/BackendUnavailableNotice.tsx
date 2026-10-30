import { component$, useVisibleTask$ } from "@builder.io/qwik";
import { translateApp, useTranslate } from "../../lib/i18n/useTranslate";
import { showError } from "../../lib/utils/toast";

/** Dashboard banner + toast when neither settings nor site-meta could be read from the API. */
export const BackendUnavailableNotice = component$(() => {
  const { lang } = useTranslate();

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    showError(translateApp(lang, "dashboard.backendUnavailableTitle"), 6000);
  });

  return (
    <>
      {/* Component: BackendUnavailableNotice */}
      <div
        role="alert"
        class="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100"
      >
        <p class="font-semibold">
          {translateApp(lang, "dashboard.backendUnavailableTitle")}
        </p>
        <p class="mt-1 text-sm">
          {translateApp(lang, "dashboard.backendUnavailableBody")}
        </p>
      </div>
    </>
  );
});
