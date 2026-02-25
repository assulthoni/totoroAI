import { GoogleGenerativeAI } from '@google/generative-ai';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const openaiCompat = {
  chat: {
    completions: {
      async create(args: {
        model: string;
        messages: ChatMessage[];
        response_format?: { type: 'json_object' | string };
      }): Promise<{ choices: { message: { content: string } }[] }> {
        const { messages, response_format } = args;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY is not set');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const system = messages.find((m) => m.role === 'system')?.content;
        const conversation = messages
          .filter((m) => m.role !== 'system')
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n');

        const prompt = [system, conversation].filter(Boolean).join('\n\n');

        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
        });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig:
            response_format?.type === 'json_object'
              ? { responseMimeType: 'application/json' }
              : undefined,
        });

        const text = result.response.text();
        return { choices: [{ message: { content: text } }] };
      },
    },
  },
};

export default openaiCompat;
