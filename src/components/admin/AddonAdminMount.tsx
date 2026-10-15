import { component$ } from '@builder.io/qwik';
import { addonAdminScreens } from 'virtual:itqandev-addon-admin';
import { translateApp, useTranslate } from '~/lib/i18n/useTranslate';

type AddonAdminMountProps = {
  module: string;
  path: string[];
  enabled: boolean;
};

/**
 * Renders the dashboard screen exported by an installed addon package. Only admin routes import this,
 * so addon admin code never joins the public graph.
 */
export const AddonAdminMount = component$<AddonAdminMountProps>((props) => {
  const { lang } = useTranslate();
  const Screen = props.enabled ? addonAdminScreens[props.module] : undefined;

  if (!Screen) {
    return (
      <>
        {/* Addon missing or its module is off */}
        <div class="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 class="text-xl font-semibold text-slate-900 dark:text-white">{translateApp(lang, 'addons.unavailableTitle')}</h1>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{translateApp(lang, 'addons.unavailableBody')}</p>
        </div>
      </>
    );
  }

  return <Screen uiLocale={lang} module={props.module} path={props.path} />;
});
