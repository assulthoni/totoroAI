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
          
          If the message is NOT a transaction, but a general query, provide a helpful response as 'reply'.
          
          Return JSON in this format:
          {
            "isTransaction": boolean,
            "data": { ... transaction details ... } | null,
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
          const { type, amount, category, description } = result.data;
          const { error } = await getSupabase().from('transactions').insert([
            {
              user_id: userId,
              type,
              amount,
              category,
              description,
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
