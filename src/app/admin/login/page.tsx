'use client';

import { useState } from 'react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = '/admin';
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 dark:bg-neutral-950 dark:text-neutral-100">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Login</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">Enter the administrator password to continue.</p>
        <div className="mt-5">
          <label className="mb-1 block text-sm">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>
        {error && <div className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</div>}
        <button
          className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 active:bg-blue-800"
          type="submit"
        >
          Login
        </button>
      </form>
    </div>
  );
}
