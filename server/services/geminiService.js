import { GoogleGenerativeAI } from '@google/generative-ai';
import { summarizeForAi } from './analysisEngine.js';

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

function stripCodeFences(text) {
  return String(text || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function extractJson(text) {
  const cleaned = stripCodeFences(text);
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Invalid AI response format');
  }

  return cleaned.slice(start, end + 1);
}

function buildAnalysisPrompt(analysis) {
  const aiContext = summarizeForAi(analysis);

  return `
You are a financial fraud detection AI.

Analyze the suspicious transaction set and return ONLY JSON.

Context:
${JSON.stringify(aiContext)}

Return STRICT JSON:

{
  "summary": "short explanation",
  "patterns": ["pattern1", "pattern2"],
  "recommendations": ["action1", "action2"],
  "suspiciousTransactions": [
    {
      "date": "",
      "description": "",
      "amount": number,
      "reason": ""
    }
  ]
}

DO NOT return text outside JSON.
`;
}

function buildChatPrompt({ analysis, message }) {
  const aiContext = summarizeForAi(analysis);

  return `
You are a premium fintech fraud analyst chat assistant.

Use the current fraud analysis context to answer the user in concise JSON.

Context:
${JSON.stringify(aiContext)}

User question:
${message}

Return STRICT JSON:

{
  "reply": "brief helpful response",
  "highlights": ["highlight1", "highlight2"],
  "nextSteps": ["step1", "step2"]
}

Only use the provided analysis context. Do not invent transaction details.
`;
}

export async function analyzeTransactions(transactions) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not loaded');
  }

  const genAI = getClient();

  const prompt = buildAnalysisPrompt(transactions);

  const modelCandidates = getModelCandidates();
  let lastError;

  for (const modelName of modelCandidates) {
    try {
      console.log('Using Gemini model:', modelName);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const raw = await result.response.text();

      console.log('Raw Gemini response:', raw);

      const jsonString = extractJson(raw);

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
    summary: 'AI response parsing failed',
    patterns: [],
    recommendations: ['Unable to analyze with Gemini at this time.'],
    suspiciousTransactions: [],
  };
}

export async function generateChatResponse({ analysis, message }) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      reply: analysis?.summary || 'Analysis is available, but Gemini is not configured in this environment.',
      highlights: analysis?.patterns?.slice(0, 3) || [],
      nextSteps: [analysis?.recommendation || 'Review the current risk summary.'],
    };
  }

  const genAI = getClient();
  const prompt = buildChatPrompt({ analysis, message });
  const modelCandidates = getModelCandidates();
  let lastError;

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const raw = await result.response.text();
      const parsed = JSON.parse(extractJson(raw));
      return parsed;
    } catch (error) {
      lastError = error;
    }
  }

  return {
    reply: analysis?.summary || 'Unable to generate a Gemini response right now.',
    highlights: analysis?.patterns?.slice(0, 3) || [],
    nextSteps: [analysis?.recommendation || 'Review the current risk summary.'],
    error: lastError?.message,
  };
}