import { GoogleGenerativeAI } from '@google/generative-ai';

export const getGeminiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

function parseJsonSafe(raw: string) {
  const direct = raw?.trim() || '';
  try {
    return JSON.parse(direct);
  } catch {}
  const noTicks = direct.replace(/```+|`+/g, '');
  try {
    return JSON.parse(noTicks);
  } catch {}
  const first = noTicks.indexOf('{');
  const last = noTicks.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const sliced = noTicks.slice(first, last + 1);
    return JSON.parse(sliced);
  }
  throw new Error('Invalid JSON from model');
}

export const generateJson = async (prompt: string) => {
  const model = getGeminiModel();
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const isGemma3 = /^gemma-3/i.test(modelName);
  if (isGemma3) {
    const strictPrompt = `${prompt}

Rules:
- Return ONLY a valid JSON object.
- Do not include any markdown, code fences, or backticks.
- Do not include explanations or extra text.`;
    const res = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: strictPrompt }] }],
    });
    const text = res.response.text() || '';
    return parseJsonSafe(text);
  } else {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      const text = result.response.text() || '';
      return parseJsonSafe(text);
    } catch {
      const fallbackPrompt = `${prompt}

Rules:
- Return ONLY a valid JSON object.
- Do not include any markdown, code fences, or backticks.
- Do not include explanations or extra text.`;
      const second = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fallbackPrompt }] }],
      });
      const text = second.response.text() || '';
      return parseJsonSafe(text);
    }
  }
};
