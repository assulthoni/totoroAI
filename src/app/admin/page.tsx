import { getSupabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const supabase = getSupabase({ serviceRole: true });
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('telegram_user_id, phone_number, consented, allowed, created_at')
    .order('created_at', { ascending: false });
  const { data: tx } = await supabase
    .from('transactions')
    .select('user_id, type, amount')

  type Totals = { income: number; expense: number; savings: number };
  const aggregated: Record<string, Totals> = {};
  for (const t of tx || []) {
    const id = String((t as any).user_id);
    const type = String((t as any).type) as keyof Totals;
    const amount = Number((t as any).amount);
    if (!aggregated[id]) aggregated[id] = { income: 0, expense: 0, savings: 0 };
    if (type in aggregated[id]) {
      (aggregated[id][type] as number) += amount;
    }
  }

  async function toggleUser(formData: FormData) {
    'use server';
    const telegram_user_id = formData.get('telegram_user_id') as string;
    const allowed = formData.get('allowed') === 'true';
    const supabase = getSupabase({ serviceRole: true });
    await supabase.from('users').update({ allowed }).eq('telegram_user_id', telegram_user_id);
  }

  async function addUser(formData: FormData) {
    'use server';
    const telegram_user_id = String(formData.get('telegram_user_id') || '').trim();
    const phone_number = String(formData.get('phone_number') || '').trim() || null;
    const consented = formData.get('consented') === 'on';
    const allowed = formData.get('allowed') === 'on';
    if (!telegram_user_id) return;
    const supabase = getSupabase({ serviceRole: true });
    await supabase.from('users').upsert(
      { telegram_user_id, phone_number, consented, allowed },
      { onConflict: 'telegram_user_id' }
    );
  }

  async function deleteUser(formData: FormData) {
    'use server';
    const telegram_user_id = String(formData.get('telegram_user_id') || '').trim();
    if (!telegram_user_id) return;
    const supabase = getSupabase({ serviceRole: true });
    await supabase.from('users').delete().eq('telegram_user_id', telegram_user_id);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto max-w-7xl p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">
            Manage users, approvals, and view aggregated transaction metrics.
          </p>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-neutral-800">
            <h2 className="text-lg font-medium">Users</h2>
          </div>
          <div className="px-4 py-4 border-b border-gray-200 dark:border-neutral-800">
            <form action={addUser} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <input
                name="telegram_user_id"
                placeholder="Telegram ID"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
              <input
                name="phone_number"
                placeholder="Phone (optional)"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="consented" className="accent-blue-600" /> Consented
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="allowed" className="accent-blue-600" /> Allowed
              </label>
              <button
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                type="submit"
              >
                Add / Upsert
              </button>
            </form>
            {usersError && (
              <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                Failed to load users: {usersError.message}
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300">
                <tr>
                  <th className="px-4 py-2 text-left">Telegram ID</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-left">Consented</th>
                  <th className="px-4 py-2 text-left">Allowed</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                {users?.map((u) => (
                  <tr key={u.telegram_user_id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/60">
                    <td className="px-4 py-2 font-mono text-xs">{u.telegram_user_id}</td>
                    <td className="px-4 py-2">{u.phone_number || <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs ' +
                          (u.consented
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300')
                        }
                      >
                        {u.consented ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs ' +
                          (u.allowed
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300')
                        }
                      >
                        {u.allowed ? 'Allowed' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <form action={toggleUser}>
                        <input type="hidden" name="telegram_user_id" value={u.telegram_user_id} />
                        <input type="hidden" name="allowed" value={(!u.allowed).toString()} />
                        <button
                          className={
                            'rounded-md px-3 py-1 text-sm font-medium ring-1 ring-inset transition-colors ' +
                            (u.allowed
                              ? 'bg-white text-rose-700 ring-rose-200 hover:bg-rose-50 dark:bg-neutral-900 dark:text-rose-300 dark:ring-rose-800/50 dark:hover:bg-neutral-800'
                              : 'bg-white text-emerald-700 ring-emerald-200 hover:bg-emerald-50 dark:bg-neutral-900 dark:text-emerald-300 dark:ring-emerald-800/50 dark:hover:bg-neutral-800')
                          }
                        >
                          {u.allowed ? 'Revoke' : 'Allow'}
                        </button>
                      </form>
                      <form action={deleteUser} className="mt-1">
                        <input type="hidden" name="telegram_user_id" value={u.telegram_user_id} />
                        <button
                          className="rounded-md px-3 py-1 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 dark:text-rose-300 dark:ring-rose-800/50 dark:hover:bg-neutral-800"
                          type="submit"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-neutral-800">
            <h2 className="text-lg font-medium">Per-User Totals</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300">
                <tr>
                  <th className="px-4 py-2 text-left">Telegram ID</th>
                  <th className="px-4 py-2 text-left">Income</th>
                  <th className="px-4 py-2 text-left">Expense</th>
                  <th className="px-4 py-2 text-left">Savings</th>
                  <th className="px-4 py-2 text-left">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                {Object.entries(aggregated).map(([id, sums]) => {
                  const balance = sums.income - sums.expense - sums.savings;
                  return (
                    <tr key={id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/60">
                      <td className="px-4 py-2 font-mono text-xs">{id}</td>
                      <td className="px-4 py-2 text-emerald-600 dark:text-emerald-400">{sums.income.toFixed(2)}</td>
                      <td className="px-4 py-2 text-rose-600 dark:text-rose-400">{sums.expense.toFixed(2)}</td>
                      <td className="px-4 py-2 text-indigo-600 dark:text-indigo-400">{sums.savings.toFixed(2)}</td>
                      <td
                        className={
                          'px-4 py-2 ' +
                          (balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                        }
                      >
                        {balance.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
