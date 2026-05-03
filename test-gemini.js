import fs from 'fs';
import path from 'path';
import { generateChatResponse } from './server/services/geminiService.js';

// Minimal .env loader: load server/.env and project .env if present
function loadEnvFiles() {
  const root = process.cwd();
  const candidates = [path.join(root, '.env'), path.join(root, 'server', '.env')];
  for (const file of candidates) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx === -1) return;
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      });
    } catch (e) {
      // ignore missing files
    }
  }
}

loadEnvFiles();

const dummyAnalysis = {
  summary: 'local health check',
  patterns: [],
  recommendation: 'none',
  suspiciousTransactions: [],
};

(async () => {
  try {
    const resp = await generateChatResponse({ analysis: dummyAnalysis, message: 'Status check' });
    console.log(JSON.stringify(resp, null, 2));
  } catch (err) {
    console.error('Test error:', err?.message || err);
    process.exit(1);
  }
})();
