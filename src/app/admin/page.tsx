import { getSupabase } from '@/lib/supabase';

export default async function AdminHome() {
  const supabase = getSupabase();
  const { data: users } = await supabase
    .from('users')
    .select('telegram_user_id, phone_number, consented, allowed, created_at')
    .order('created_at', { ascending: false });
  const { data: tx } = await supabase
    .from('transactions')
    .select('user_id, type, amount')
    .limit(2000);

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
    const supabase = getSupabase();
    await supabase.from('users').update({ allowed }).eq('telegram_user_id', telegram_user_id);
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <section>
        <h2 className="text-xl font-semibold mb-2">Users</h2>
        <div className="overflow-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Telegram ID</th>
                <th className="p-2 border">Phone</th>
                <th className="p-2 border">Consented</th>
                <th className="p-2 border">Allowed</th>
                <th className="p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.telegram_user_id}>
                  <td className="p-2 border">{u.telegram_user_id}</td>
                  <td className="p-2 border">{u.phone_number || '-'}</td>
                  <td className="p-2 border">{u.consented ? 'Yes' : 'No'}</td>
                  <td className="p-2 border">{u.allowed ? 'Yes' : 'No'}</td>
                  <td className="p-2 border">
                    <form action={toggleUser}>
                      <input type="hidden" name="telegram_user_id" value={u.telegram_user_id} />
                      <input type="hidden" name="allowed" value={(!u.allowed).toString()} />
                      <button className="px-2 py-1 bg-blue-600 text-white rounded">
                        {u.allowed ? 'Revoke' : 'Allow'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Per-User Totals</h2>
        <div className="overflow-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Telegram ID</th>
                <th className="p-2 border">Income</th>
                <th className="p-2 border">Expense</th>
                <th className="p-2 border">Savings</th>
                <th className="p-2 border">Balance</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(aggregated).map(([id, sums]) => {
                const balance = sums.income - sums.expense - sums.savings;
                return (
                  <tr key={id}>
                    <td className="p-2 border">{id}</td>
                    <td className="p-2 border">{sums.income.toFixed(2)}</td>
                    <td className="p-2 border">{sums.expense.toFixed(2)}</td>
                    <td className="p-2 border">{sums.savings.toFixed(2)}</td>
                    <td className="p-2 border">{balance.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
