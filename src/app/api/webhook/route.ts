import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
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
    bot.on('text', async (ctx) => {
      const message = ctx.message.text;
      const userId = ctx.from.id.toString();
      try {
        const system = `You are a personal finance assistant.
          Extract financial transactions from the user message.
          If the message is about a financial transaction (income, expense, savings), return a JSON object with:
          - type: "income", "expense", or "savings"
          - amount: number
          - category: string
          - description: string
          - expense_date: ISO 8601 string in UTC (e.g., "2026-02-25T00:00:00Z").
            - Parse natural language like "today", "yesterday", "last Friday", "2 days ago".
            - If not provided, default to today's date in UTC (set time to 00:00:00Z).
          
          If the message is NOT a transaction, but a general query, provide a helpful response as 'reply'.
          
          Return JSON in this format:
          {
            "isTransaction": boolean,
            "data": {
              "type": string,
              "amount": number,
              "category": string,
              "description": string | null,
              "expense_date": string
            } | null,
            "reply": string | null
          }`;
        const prompt = `${system}\n\nUser: ${message}`;
        const model = getGeminiModel();
        const resultResponse = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        });
        const result = JSON.parse(resultResponse.response.text() || '{}');
        if (result.isTransaction) {
          const { type, amount, category, description, expense_date } = result.data;
          const expenseDate =
            typeof expense_date === 'string' && expense_date.length > 0
              ? expense_date
              : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').toISOString();
          const { error } = await getSupabase().from('transactions').insert([
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
          await ctx.reply(
            `✅ Recorded ${type}: ${amount} for ${category}. ${description ? `(${description})` : ''}`
          );
        } else {
          await ctx.reply(
            result.reply || "I'm not sure how to handle that. Can you rephrase?"
          );
        }
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
