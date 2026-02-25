'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 dark:from-neutral-950 dark:to-neutral-900 dark:text-neutral-100">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <section className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Totoro AI — Personal Finance via Telegram
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 dark:text-neutral-400">
            Record expenses, income, and savings directly from Telegram. Admins manage access and view insights
            in a secure dashboard.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/admin/login"
              className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Admin Login
            </Link>
            <a
              href="https://t.me/TotoroooooBot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              Open Telegram
            </a>
          </div>
        </section>

        <section className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-base font-semibold">Send From Telegram</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              Tell the bot what you spent or earned. It parses the details and date automatically.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-base font-semibold">Consent & Whitelist</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              Share your phone in Telegram and get approved by an admin to unlock full features.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-base font-semibold">Secure Admin</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              Admins review users and manage data in a secure, access-controlled dashboard.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-16 flex max-w-5xl flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-base font-semibold">Scan To Chat</h3>
          <p className="text-sm text-gray-600 dark:text-neutral-400">
            Scan this QR code to open the bot on Telegram and start tracking your finances.
          </p>
          <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-950">
            <Image
              src="/qrcode.jpeg"
              width={280}
              height={280}
              alt="QR code to open the Totoro AI Telegram bot"
              className="h-auto w-[280px] rounded-md"
              priority
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-neutral-500">
            Or tap here: <a className="underline hover:no-underline" href="https://t.me/TotoroooooBot" target="_blank" rel="noreferrer">t.me/TotoroooooBot</a>
          </p>
        </section>
      </div>
    </main>
  );
}
