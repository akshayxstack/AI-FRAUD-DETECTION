import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const projectRootDir = path.resolve(serverDir, '..');

dotenv.config({ path: path.join(projectRootDir, '.env') });
dotenv.config({ path: path.join(serverDir, '.env'), override: true });

console.log('ENV CHECK KEY:', process.env.GEMINI_API_KEY?.slice(0, 5));

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { parseCSV } from './parsers/csvParser.js';
import { parseExcel } from './parsers/excelParser.js';
import { parsePDF } from './parsers/pdfParser.js';
import { analyzeTransactions } from './services/geminiService.js';
import { resetStore, store } from './state/store.js';

const app = express();
const PORT = process.env.PORT || 8000;
const upload = multer({
  dest: 'uploads/',
});

app.use(express.json());
app.use(cors());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/debug-store', (_req, res) => {
  res.json({
    uploaded: store.uploaded,
    count: store.transactions.length,
  });
});

app.get('/api/debug-transactions', (_req, res) => {
  res.json({
    count: store.transactions.length,
    sample: store.transactions.slice(0, 5),
  });
});

app.get('/api/analysis', (_req, res) => {
  return res.json({
    success: true,
    analysis: store.analysis,
    totalTransactions: store.transactions.length,
    suspiciousTransactionsCount: store.analysis?.suspiciousTransactions?.length ?? 0,
  });
});

app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('🔥 Upload route hit');

    if (!req.file) {
      console.log('❌ No file received');
      resetStore();
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const file = req.file;
    console.log('✅ File received:', file.originalname);
    console.log('File size:', file.size);

    const ext = file.originalname.split('.').pop().toLowerCase();
    console.log('Detected file type:', ext);
    const allowed = ['csv', 'xlsx', 'xls', 'pdf'];

    if (!allowed.includes(ext)) {
      resetStore();
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type',
      });
    }

    let transactions = [];

    console.log('Starting parsing...');
    try {
      if (ext === 'csv') {
        console.log('Parsing CSV...');
        transactions = await parseCSV(file.path);
      } else if (ext === 'xlsx' || ext === 'xls') {
        console.log('Parsing Excel...');
        transactions = await parseExcel(file.path);
      } else if (ext === 'pdf') {
        console.log('Parsing PDF...');
        transactions = await parsePDF(file.path);
      }
    } catch (err) {
      console.error('Parsing error:', err);
      resetStore();
      return res.status(500).json({
        success: false,
        message: 'Parsing failed',
        error: err.message,
      });
    }

    console.log('Parsed transactions:', transactions.length);

    if (!transactions || transactions.length === 0) {
      resetStore();
      return res.status(400).json({
        success: false,
        message: 'No valid transactions found in file',
      });
    }

    console.log('Calling Gemini AI...');
    const analysis = await analyzeTransactions(transactions);
    console.log('Gemini response received');

    store.uploaded = true;
    store.transactions = transactions;
    store.analysis = analysis;

    return res.json({
      success: true,
      count: transactions.length,
      message: 'File parsed successfully',
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    resetStore();
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
