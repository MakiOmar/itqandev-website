import { component$, $, useSignal } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { useTranslate } from '../../../../../lib/i18n/useTranslate';
import { auth } from '../../../../../lib/auth';
import { routesFromPreferredCookie } from '../../../../../lib/constants/routes';
import { getApiClient, extractCookieHeader } from '../../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';

type ProposalRow = {
  id: number;
  target_type: string;
  target_id: number;
  locale?: string | null;
  action: string;
  status: string;
  created_at?: string;
};

export const usePromotionProposals = routeLoader$(async ({ cookie, request, redirect: redirectFn }) => {
  const R = routesFromPreferredCookie(cookie);
  const session = await auth.getSession(cookie);
  const perms = session?.user?.permissions ?? [];
  const role = session?.user?.role;
  const allowed =
    session &&
    (role === 'admin' ||
      role === 'super_admin' ||
      role === 'company' ||
      role === 'editor' ||
      perms.includes('manage promotion'));
  if (!allowed) {
    throw redirectFn(302, R.ADMIN.HOME);
  }

  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const client = getApiClient(cookieHeader);
    const res = await client.get<{
      data?: { data?: ProposalRow[] } | ProposalRow[];
    }>(`${API_ENDPOINTS.PROMOTION.PROPOSALS}?status=pending&per_page=50`);

    const payload = res.data as { data?: ProposalRow[] | { data?: ProposalRow[] } };
    const inner = payload?.data;
    const rows = Array.isArray(inner)
      ? inner
      : Array.isArray((inner as { data?: ProposalRow[] })?.data)
        ? (inner as { data: ProposalRow[] }).data
        : [];
    return { proposals: rows };
  } catch {
    return { proposals: [] as ProposalRow[] };
  }
});

export default component$(() => {
  const data = usePromotionProposals();
  const { lang } = useTranslate();
  const proposals = useSignal(data.value.proposals);
  const busyId = useSignal<number | null>(null);
  const message = useSignal('');

  const decide = $(async (id: number, decision: 'approve' | 'reject') => {
    busyId.value = id;
    message.value = '';
    try {
      const client = getApiClient(null);
      await client.post(API_ENDPOINTS.PROMOTION.APPROVE(id), { decision });
      if (decision === 'approve') {
        await client.post(API_ENDPOINTS.PROMOTION.APPLY(id), {});
      }
      proposals.value = proposals.value.filter((p) => p.id !== id);
      message.value = decision === 'approve' ? 'Approved and applied.' : 'Rejected.';
    } catch (e) {
      message.value = e instanceof Error ? e.message : 'Request failed';
    } finally {
      busyId.value = null;
    }
  });

  return (
    <div class="space-y-6">
      <PageHeader
        title={lang === 'ar' ? 'اقتراحات الترويج' : 'Promotion proposals'}
        description={
          lang === 'ar'
            ? 'مراجعة اقتراحات النشر أو الكتابة فوق حقول SEO من وكلاء الترويج.'
            : 'Review publish / SEO overwrite proposals from promotion agents.'
        }
      />

      {message.value && (
        <p class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {message.value}
        </p>
      )}

      {proposals.value.length === 0 ? (
        <p class="text-sm text-slate-600 dark:text-slate-400">No pending proposals.</p>
      ) : (
        <ul class="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {proposals.value.map((p) => (
            <li
              key={p.id}
              class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="text-sm text-slate-800 dark:text-slate-100">
                <p class="font-medium">
                  #{p.id} · {p.action} · {p.target_type} #{p.target_id}
                </p>
                <p class="mt-1 text-slate-500 dark:text-slate-400">
                  {p.locale ? `locale ${p.locale}` : 'no locale'} · {p.status}
                  {p.created_at ? ` · ${p.created_at}` : ''}
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  disabled={busyId.value === p.id}
                  onClick$={() => decide(p.id, 'approve')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200 disabled:opacity-50"
                  disabled={busyId.value === p.id}
                  onClick$={() => decide(p.id, 'reject')}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Promotion proposals',
};
