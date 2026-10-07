import { component$, useSignal, $ } from '@builder.io/qwik';
import { Link, useNavigate } from '@builder.io/qwik-city';
import { translateApp } from '../../../lib/i18n/useTranslate';
import { showError as showErrorToast, showSuccess as showSuccessToast } from '../../../lib/utils/toast';
import {
  ADMIN_CHECKBOX_CLASS,
  ADMIN_CHECKBOX_LABEL_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
} from '../../../lib/admin/native-select-classes';
import {
  runUserSaveFromBrowser,
  type AdminRole,
  type AdminUser,
  type AdminUserStatus,
} from '../../../lib/admin/user-actions';

interface UserFormProps {
  lang: string;
  roles: AdminRole[];
  /** `null` renders the create form. */
  user: AdminUser | null;
  /** Editing your own account: the API refuses self-deactivation. */
  isSelf: boolean;
  listHref: string;
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40';
const LABEL_CLASS = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200';

/**
 * Shared create/edit form for `users/new` and `users/[id]`.
 */
export const UserForm = component$<UserFormProps>(({ lang, roles, user, isSelf, listHref }) => {
  const navigate = useNavigate();
  const userId = user?.id ?? null;

  const name = useSignal(user?.name ?? '');
  const email = useSignal(user?.email ?? '');
  const password = useSignal('');
  const status = useSignal<AdminUserStatus>(user?.status ?? 'active');
  const roleIds = useSignal<number[]>(user?.roles.map((r) => r.id) ?? []);
  const saving = useSignal(false);

  const savedText = String(translateApp(lang, userId ? 'users.updated' : 'users.created'));
  const passwordTooShort = String(translateApp(lang, 'users.passwordMin'));

  const toggleRole = $((id: number) => {
    roleIds.value = roleIds.value.includes(id) ? roleIds.value.filter((r) => r !== id) : [...roleIds.value, id];
  });

  const handleSubmit = $(async () => {
    if (saving.value) return;
    if ((!userId || password.value) && password.value.length < 8) {
      showErrorToast(passwordTooShort);
      return;
    }
    saving.value = true;
    const result = await runUserSaveFromBrowser(userId, {
      name: name.value,
      email: email.value,
      password: password.value,
      status: status.value,
      roleIds: roleIds.value,
    });
    saving.value = false;
    if (!result.ok) {
      showErrorToast(result.message);
      return;
    }
    showSuccessToast(savedText);
    await navigate(listHref);
  });

  return (
    <>
      {/* Component: UserForm */}
      <form
        preventdefault:submit
        onSubmit$={handleSubmit}
        class="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800"
      >
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label for="user-name" class={LABEL_CLASS}>
              {translateApp(lang, 'users.name')}
            </label>
            <input
              id="user-name"
              type="text"
              required
              maxLength={255}
              autocomplete="name"
              value={name.value}
              onInput$={(e) => (name.value = (e.target as HTMLInputElement).value)}
              class={INPUT_CLASS}
            />
          </div>
          <div>
            <label for="user-email" class={LABEL_CLASS}>
              {translateApp(lang, 'users.email')}
            </label>
            <input
              id="user-email"
              type="email"
              required
              autocomplete="email"
              value={email.value}
              onInput$={(e) => (email.value = (e.target as HTMLInputElement).value)}
              class={INPUT_CLASS}
            />
          </div>
          <div>
            <label for="user-password" class={LABEL_CLASS}>
              {translateApp(lang, 'users.password')} {userId ? translateApp(lang, 'users.passwordHint') : ''}
            </label>
            <input
              id="user-password"
              type="password"
              required={!userId}
              minLength={8}
              autocomplete="new-password"
              value={password.value}
              onInput$={(e) => (password.value = (e.target as HTMLInputElement).value)}
              class={INPUT_CLASS}
            />
          </div>
          <div>
            <label for="user-status" class={LABEL_CLASS}>
              {translateApp(lang, 'users.status')}
            </label>
            <select
              id="user-status"
              disabled={isSelf}
              value={status.value}
              onChange$={(e) => (status.value = (e.target as HTMLSelectElement).value as AdminUserStatus)}
              class={ADMIN_NATIVE_SELECT_CLASS}
            >
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="active" selected={status.value === 'active'}>
                {translateApp(lang, 'users.statusActive')}
              </option>
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="inactive" selected={status.value === 'inactive'}>
                {translateApp(lang, 'users.statusInactive')}
              </option>
            </select>
            {isSelf && (
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{translateApp(lang, 'users.selfStatusHint')}</p>
            )}
          </div>
        </div>

        {/* Roles */}
        <fieldset>
          <legend class={LABEL_CLASS}>{translateApp(lang, 'users.roles')}</legend>
          {roles.length === 0 ? (
            <p class="text-sm text-gray-500 dark:text-gray-400">{translateApp(lang, 'users.noRoles')}</p>
          ) : (
            <div class="flex flex-wrap gap-4">
              {roles.map((role) => (
                <label key={role.id} class={ADMIN_CHECKBOX_LABEL_CLASS}>
                  <input
                    type="checkbox"
                    class={ADMIN_CHECKBOX_CLASS}
                    checked={roleIds.value.includes(role.id)}
                    onChange$={() => toggleRole(role.id)}
                  />
                  {role.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div class="flex gap-2">
          <button
            type="submit"
            disabled={saving.value}
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
          >
            {saving.value
              ? translateApp(lang, 'common.loading')
              : translateApp(lang, userId ? 'common.update' : 'common.add')}
          </button>
          <Link
            href={listHref}
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            {translateApp(lang, 'common.cancel')}
          </Link>
        </div>
      </form>
    </>
  );
});
