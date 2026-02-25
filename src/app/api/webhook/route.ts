import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import openai from '@/lib/openai';
import { supabase } from '@/lib/supabase';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Process the update through Telegraf
    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Failed to process update' }, { status: 500 });
  }
}

// Bot command and message handling logic
bot.start((ctx) => ctx.reply('Welcome! I am your personal finance tracker. Send me your income, expenses, or savings, and I will track them for you. You can also ask me general questions!'));

bot.on('text', async (ctx) => {
  const message = ctx.message.text;
  const userId = ctx.from.id.toString();

  try {
    // 1. Ask AI to classify and extract data
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a personal finance assistant. 
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
          }`,
        },
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    if (result.isTransaction) {
      const { type, amount, category, description } = result.data;
      
      // 2. Store in Supabase
      const { error } = await supabase.from('transactions').insert([
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

      await ctx.reply(`✅ Recorded ${type}: ${amount} for ${category}. ${description ? `(${description})` : ''}`);
    } else {
      await ctx.reply(result.reply || "I'm not sure how to handle that. Can you rephrase?");
    }
  } catch (error) {
    console.error('AI or DB error:', error);
    await ctx.reply('Sorry, I had trouble processing that message. Please try again later.');
  }
});
