import { component$ } from '@builder.io/qwik';
import { Button } from '~/components/marketing/Button';
import { SiteLanguageSwitcher } from '~/components/common/SiteLanguageSwitcher';
import { UserDropdown } from '~/components/common/UserDropdown';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import type { AuthSession } from '~/lib/auth/types';
import type { SiteLanguageRow } from '~/types/site-language';

type LoginVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

const LOGIN_VARIANTS: ReadonlySet<string> = new Set(['primary', 'secondary', 'outline', 'ghost']);

/** `header_language_switcher` (and the language part of `header_actions`); empty with fewer than two languages. */
export const HeaderLanguageKit = component$<{
  languages?: SiteLanguageRow[] | null;
  showFlag?: boolean;
  showLabel?: boolean;
}>((props) => {
  const langs = props.languages ?? [];
  if (langs.length < 2) return null;
  return <SiteLanguageSwitcher languages={langs} showFlag={props.showFlag} showLabel={props.showLabel} />;
});

/** `header_account` (and the auth part of `header_actions`): user menu when signed in, login button otherwise. */
export const HeaderAccountKit = component$<{
  uiLocale: string;
  session?: Pick<AuthSession, 'user'> | null;
  loginLabel?: string;
  loginVariant?: string;
}>((props) => {
  const user = props.session?.user;
  if (user) return <UserDropdown user={user} />;
  const variant = (LOGIN_VARIANTS.has(props.loginVariant || '') ? props.loginVariant : 'outline') as LoginVariant;
  return (
    <Button href={getLocalizedRoutes(props.uiLocale).ADMIN.LOGIN} variant={variant} class="text-sm">
      {props.loginLabel?.trim() || 'Login'}
    </Button>
  );
});
