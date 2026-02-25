'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    savings: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount');

      if (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
        return;
      }

      const totals = data.reduce(
        (acc, transaction) => {
          if (transaction.type === 'income') acc.income += Number(transaction.amount);
          if (transaction.type === 'expense') acc.expense += Number(transaction.amount);
          if (transaction.type === 'savings') acc.savings += Number(transaction.amount);
          return acc;
        },
        { income: 0, expense: 0, savings: 0 }
      );

      setStats({
        ...totals,
        balance: totals.income - totals.expense - totals.savings,
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-10">
          Personal Finance Tracker Dashboard
        </h1>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Balance</dt>
              <dd className="mt-1 text-3xl font-semibold text-blue-600">${stats.balance.toFixed(2)}</dd>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <dt className="text-sm font-medium text-gray-500 truncate">Income</dt>
              <dd className="mt-1 text-3xl font-semibold text-green-600">${stats.income.toFixed(2)}</dd>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <dt className="text-sm font-medium text-gray-500 truncate">Expenses</dt>
              <dd className="mt-1 text-3xl font-semibold text-red-600">${stats.expense.toFixed(2)}</dd>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <dt className="text-sm font-medium text-gray-500 truncate">Savings</dt>
              <dd className="mt-1 text-3xl font-semibold text-indigo-600">${stats.savings.toFixed(2)}</dd>
            </div>
          </div>
        )}

        <div className="mt-12 bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">How to use your Telegram Bot:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Type: "Received $500 for freelance work" to record income.</li>
            <li>Type: "Spent $20 on coffee" to record an expense.</li>
            <li>Type: "Saved $100 today" to record savings.</li>
            <li>Ask questions: "What is my total balance?" or "How much did I spend on food this month?"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
