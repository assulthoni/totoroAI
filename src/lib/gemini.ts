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

export const generateJson = async (prompt: string) => {
  const model = getGeminiModel();
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const isGemma3 = /^gemma-3/i.test(modelName);
  if (isGemma3) {
    const strictPrompt = `${prompt}\n\nReturn ONLY valid JSON. Do not include explanations.`;
    const res = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: strictPrompt }] }],
    });
    const text = res.response.text();
    return JSON.parse(text || '{}');
  } else {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      const text = result.response.text();
      return JSON.parse(text || '{}');
    } catch {
      const fallbackPrompt = `${prompt}\n\nReturn ONLY valid JSON.`;
      const second = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fallbackPrompt }] }],
      });
      const text = second.response.text();
      return JSON.parse(text || '{}');
    }
  }
};
