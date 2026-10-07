import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { UserForm } from '../../../../../components/admin/users/UserForm';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useAppRoutes } from '../../../../../lib/constants/routes';
import { adminApiClient } from '../../../../../lib/admin/admin-api-client';
import { loadRoles, type AdminRole } from '../../../../../lib/admin/user-actions';

export const useRolesForNewUser = routeLoader$(async ({ cookie, request, params }) => {
  try {
    return await loadRoles(adminApiClient(cookie, request, params.lang));
  } catch (err: unknown) {
    console.error('Failed to load roles:', err);
    return [] as AdminRole[];
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const roles = useRolesForNewUser();

  return (
    <>
      {/* Component: NewUserPage */}
      <PageHeader title={translateApp(lang, 'users.addNew')} description={translateApp(lang, 'users.subtitle')} />
      <UserForm lang={lang} roles={roles.value} user={null} isSelf={false} listHref={R.ADMIN.USERS} />
    </>
  );
});

export const head: DocumentHead = {
  title: 'New User - Dashboard',
};
