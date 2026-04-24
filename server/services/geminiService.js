import { GoogleGenerativeAI } from '@google/generative-ai';

function getClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite-001'];

function getModelCandidates() {
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const envFallbackModels = (process.env.GEMINI_FALLBACK_MODELS || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  return [...new Set([modelName, ...envFallbackModels, ...DEFAULT_FALLBACK_MODELS])];
}

export async function analyzeTransactions(transactions) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not loaded');
  }

  const genAI = getClient();

  // Limit input (important)
  const sample = transactions.slice(0, 200);

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const prompt = `
You are a financial fraud detection AI.

Analyze the following transaction data and return ONLY JSON.

Transactions:
${JSON.stringify(sample)}

Total Transactions: ${transactions.length}
Total Amount: ${totalAmount}

Return STRICT JSON:

{
"riskScore": number (0-100),
"summary": "short explanation",
"suspiciousTransactions": [
{
"date": "",
"description": "",
"amount": number,
"reason": ""
}
],
"patterns": ["pattern1", "pattern2"],
"recommendation": "include suggestion about possible lien or hold if needed"
}

DO NOT return text outside JSON.
`;

  const modelCandidates = getModelCandidates();
  let lastError;

  for (const modelName of modelCandidates) {
    try {
      console.log('Using Gemini model:', modelName);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const raw = await result.response.text();

      console.log('Raw Gemini response:', raw);

      // Extract JSON object from mixed model output.
      const match = raw.match(/\{[\s\S]*\}/);

      if (!match) {
        console.error('No JSON found in response');
        throw new Error('Invalid AI response format');
      }

      const jsonString = match[0];

      try {
        return JSON.parse(jsonString);
      } catch (error) {
        console.error('Final JSON parse failed:', jsonString);
        throw error;
      }
    } catch (error) {
      lastError = error;
      console.error(`Gemini call failed with model ${modelName}:`, error.message);
    }
  }

  console.error('All Gemini models failed:', lastError?.message || 'Unknown error');
  return {
    riskScore: 0,
    summary: 'AI response parsing failed',
    suspiciousTransactions: [],
    patterns: [],
    recommendation: 'Unable to analyze',
  };
}