import { NextRequest, NextResponse } from 'next/server';
import { Telegraf, Markup } from 'telegraf';
import { getGeminiModel } from '@/lib/gemini';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

let bot: Telegraf | null = null;
let handlersSet = false;

function logError(source: string, error: unknown) {
  const payload =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { value: String(error) };
  console.log(JSON.stringify({ level: 'error', route: '/api/webhook', source, error: payload }));
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBotInstance() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  if (!bot) {
    bot = new Telegraf(token);
  }
  if (!handlersSet && bot) {
    bot.start((ctx) =>
      ctx.reply(
        'Welcome! I am your personal finance tracker. Send me your income, expenses, or savings, and I will track them for you. You can also ask me general questions!'
      )
    );
    bot.command('link', async (ctx) => {
      await ctx.reply(
        'Please share your phone number to enable full features.',
        Markup.keyboard([[Markup.button.contactRequest('Share phone number')]])
          .oneTime()
          .resize()
      );
    });
    bot.on('contact', async (ctx) => {
      try {
        const supabase = getSupabase();
        const contact = (ctx.message as any).contact;
        const userId = ctx.from.id.toString();
        if (!contact || !contact.phone_number) {
          await ctx.reply('No phone number received.');
          return;
        }
        const phone = contact.phone_number;
        const { error } = await supabase
          .from('users')
          .upsert(
            {
              telegram_user_id: userId,
              phone_number: phone,
              consented: true,
            },
            { onConflict: 'telegram_user_id' }
          );
        if (error) throw error;
        await ctx.reply(
          'Thank you! Your phone number was received. An admin will review and enable full features if approved.'
        );
      } catch (e) {
        logError('contact', e);
        await ctx.reply('Failed to record your phone number. Please try again later.');
      }
    });
    bot.on('text', async (ctx) => {
      const message = ctx.message.text;
      const userId = ctx.from.id.toString();
      try {
        const secret = process.env.TELEGRAM_SECRET_WORD || process.env.BOT_SECRET_WORD || process.env.SECRET_WORD;
        const re = secret && secret.length > 0 ? new RegExp(`\\b${escapeRegExp(secret)}\\b`, 'i') : null;
        const hasSecret = !!re && re.test(message);
        const content = hasSecret && re ? message.replace(re, '').trim() : message;
        const nowIso = new Date().toISOString();
        const todayUtc = nowIso.slice(0, 10);
        const system = `You are a personal finance assistant.
          Understand user intents to create, read, update, or delete personal finance transactions.
          Always return a single JSON object with one of these actions:
          - "create_transaction": data { type: "income" | "expense" | "savings", amount: number, category: string, description?: string, expense_date?: ISO8601 UTC string }
          - "read_transactions": filters { type?: string, category?: string, start_date?: ISO8601 string, end_date?: ISO8601 string }, aggregate?: { total_balance?: boolean, sum_by_type?: boolean }
          - "update_transactions": match { id?: number, type?: string, category?: string, amount?: number, date?: ISO8601 string, start_date?: ISO8601 string, end_date?: ISO8601 string }, updates { type?: string, amount?: number, category?: string, description?: string, expense_date?: ISO8601 string }
          - "delete_transactions": match { id?: number, type?: string, category?: string, amount?: number, date?: ISO8601 string, start_date?: ISO8601 string, end_date?: ISO8601 string }
          The current UTC datetime is ${nowIso}. Today's UTC date is ${todayUtc}. Use this as 'now' for interpreting relative dates.
          Parse natural language dates like "today", "yesterday", "last Friday", "2 days ago". If a date is omitted for creation, default to today's date in UTC at 00:00:00Z.
          If the intent is a general question with no DB action, set action to "general_reply" and include 'reply' with the answer. Do not include DB fields for "general_reply".
          JSON format:
          {
            "action": "create_transaction" | "read_transactions" | "update_transactions" | "delete_transactions" | "general_reply",
            "data"?: { ... },
            "filters"?: { ... },
            "aggregate"?: { ... },
            "match"?: { ... },
            "updates"?: { ... },
            "reply"?: string
          }`;
        const prompt = `${system}\n\nUser: ${content}`;
        const model = getGeminiModel();
        const resultResponse = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        });
        const resultText = resultResponse.response.text() || '{}';
        const result = JSON.parse(resultText);
        const supabase = getSupabase();
        const action: string | undefined = result.action;
        const isDbAction =
          action === 'create_transaction' ||
          action === 'read_transactions' ||
          action === 'update_transactions' ||
          action === 'delete_transactions';
        if (isDbAction) {
          const { data: users, error: usersErr } = await supabase
            .from('users')
            .select('consented, allowed, phone_number')
            .eq('telegram_user_id', userId)
            .limit(1);
          if (usersErr) throw usersErr;
          const u = users?.[0];
          const consented = !!u?.consented;
          const allowed = !!u?.allowed;
          if (!consented) {
            await ctx.reply(
              'To use full features, share your phone number.',
              Markup.keyboard([[Markup.button.contactRequest('Share phone number')]])
                .oneTime()
                .resize()
            );
            return;
          }
          if (!allowed) {
            await ctx.reply('Your access is pending admin approval.');
            return;
          }
          if (secret && secret.length > 0 && !hasSecret) {
            await ctx.reply('Unauthorized');
            return;
          }
        }
        if (action === 'general_reply') {
          await ctx.reply(result.reply || 'Okay.');
          return;
        }
        if (action === 'create_transaction' && result.data) {
          const { type, amount, category, description, expense_date } = result.data as {
            type: 'income' | 'expense' | 'savings';
            amount: number;
            category: string;
            description?: string | null;
            expense_date?: string | null;
          };
          const expenseDate =
            expense_date && expense_date.length > 0
              ? new Date(expense_date).toISOString()
              : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').toISOString();
          const { error } = await supabase.from('transactions').insert([
            {
              user_id: userId,
              type,
              amount,
              category,
              description,
              expense_date: expenseDate,
              created_at: new Date().toISOString(),
            },
          ]);
          if (error) throw error;
          await ctx.reply(`✅ Recorded ${type}: ${amount} for ${category}. ${description ? `(${description})` : ''}`);
          return;
        }
        if (action === 'read_transactions') {
          const filters = (result.filters || {}) as {
            type?: string;
            category?: string;
            start_date?: string;
            end_date?: string;
          };
          const aggregate = (result.aggregate || {}) as {
            total_balance?: boolean;
            sum_by_type?: boolean;
          };
          let q = supabase.from('transactions').select('type, amount, category, expense_date').eq('user_id', userId);
          if (filters.type) q = q.eq('type', filters.type);
          if (filters.category) q = q.eq('category', filters.category);
          if (filters.start_date) q = q.gte('expense_date', new Date(filters.start_date).toISOString());
          if (filters.end_date) q = q.lte('expense_date', new Date(filters.end_date).toISOString());
          const { data, error } = await q;
          if (error) throw error;
          if (!data || data.length === 0) {
            await ctx.reply('No matching transactions found.');
            return;
          }
          if (aggregate.total_balance || aggregate.sum_by_type) {
            const totals = data.reduce(
              (acc, t) => {
                const amt = Number(t.amount);
                if (t.type === 'income') acc.income += amt;
                if (t.type === 'expense') acc.expense += amt;
                if (t.type === 'savings') acc.savings += amt;
                return acc;
              },
              { income: 0, expense: 0, savings: 0 }
            );
            const balance = totals.income - totals.expense - totals.savings;
            const parts: string[] = [];
            if (aggregate.sum_by_type) parts.push(`Income ${totals.income}, Expenses ${totals.expense}, Savings ${totals.savings}`);
            if (aggregate.total_balance) parts.push(`Balance ${balance}`);
            await ctx.reply(parts.join(' | '));
            return;
          }
          const lines = data.slice(0, 10).map((t) => `${t.type} ${t.amount} ${t.category} on ${new Date(t.expense_date).toISOString().slice(0, 10)}`);
          const suffix = data.length > 10 ? ` and ${data.length - 10} more` : '';
          await ctx.reply(lines.join('\n') + suffix);
          return;
        }
        if (action === 'update_transactions' && result.match && result.updates) {
          const match = result.match as {
            id?: number;
            type?: string;
            category?: string;
            amount?: number;
            date?: string;
            start_date?: string;
            end_date?: string;
          };
          const updates = result.updates as {
            type?: string;
            amount?: number;
            category?: string;
            description?: string;
            expense_date?: string;
          };
          let q = supabase.from('transactions').update(updates).eq('user_id', userId);
          if (match.id) q = q.eq('id', match.id);
          if (match.type) q = q.eq('type', match.type);
          if (match.category) q = q.eq('category', match.category);
          if (match.amount) q = q.eq('amount', match.amount);
          if (match.date) q = q.eq('expense_date', new Date(match.date).toISOString());
          if (match.start_date) q = q.gte('expense_date', new Date(match.start_date).toISOString());
          if (match.end_date) q = q.lte('expense_date', new Date(match.end_date).toISOString());
          const { data, error } = await q.select('id');
          if (error) throw error;
          const count = data?.length || 0;
          await ctx.reply(`Updated ${count} transaction${count === 1 ? '' : 's'}.`);
          return;
        }
        if (action === 'delete_transactions' && result.match) {
          const match = result.match as {
            id?: number;
            type?: string;
            category?: string;
            amount?: number;
            date?: string;
            start_date?: string;
            end_date?: string;
          };
          let q = supabase.from('transactions').delete().eq('user_id', userId);
          if (match.id) q = q.eq('id', match.id);
          if (match.type) q = q.eq('type', match.type);
          if (match.category) q = q.eq('category', match.category);
          if (match.amount) q = q.eq('amount', match.amount);
          if (match.date) q = q.eq('expense_date', new Date(match.date).toISOString());
          if (match.start_date) q = q.gte('expense_date', new Date(match.start_date).toISOString());
          if (match.end_date) q = q.lte('expense_date', new Date(match.end_date).toISOString());
          const { data, error } = await q.select('id');
          if (error) throw error;
          const count = data?.length || 0;
          await ctx.reply(`Deleted ${count} transaction${count === 1 ? '' : 's'}.`);
          return;
        }
        if (typeof result.isTransaction === 'boolean') {
          if (result.isTransaction && result.data) {
            const { type, amount, category, description, expense_date } = result.data as {
              type: 'income' | 'expense' | 'savings';
              amount: number;
              category: string;
              description?: string | null;
              expense_date?: string | null;
            };
            const expenseDate =
              expense_date && expense_date.length > 0
                ? new Date(expense_date).toISOString()
                : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').toISOString();
            const { error } = await supabase.from('transactions').insert([
              {
                user_id: userId,
                type,
                amount,
                category,
                description,
                expense_date: expenseDate,
                created_at: new Date().toISOString(),
              },
            ]);
            if (error) throw error;
            await ctx.reply(`✅ Recorded ${type}: ${amount} for ${category}. ${description ? `(${description})` : ''}`);
            return;
          }
          await ctx.reply(result.reply || "I'm not sure how to handle that. Can you rephrase?");
          return;
        }
        await ctx.reply(result.reply || "I'm not sure how to handle that. Can you rephrase?");
      } catch (error) {
        logError('bot.on', error);
        await ctx.reply('Sorry, I had trouble processing that message. Please try again later.');
      }
    });
    handlersSet = true;
  }
  return bot!;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const instance = getBotInstance();
    await instance.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError('POST', error);
    return NextResponse.json({ error: 'Failed to process update' }, { status: 500 });
  }
}
