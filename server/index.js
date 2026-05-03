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
import { analyzeTransactions, generateChatResponse } from './services/geminiService.js';
import { buildFraudAnalysis } from './services/analysisEngine.js';
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

function isNumericToken(token) {
  return /^-?\d+(?:\.\d+)?$/.test(String(token).trim());
}

function isIpToken(token) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(String(token).trim());
}

function parseSingleTransactionLine(line) {
  const tokens = String(line).trim().split(/\s+/).filter(Boolean);

  if (tokens.length < 8) {
    return null;
  }

  const ipIndex = tokens.findIndex((token) => isIpToken(token));
  const statusIndex = ipIndex >= 0 ? ipIndex + 1 : -1;
  const osIndex = statusIndex >= 0 ? statusIndex + 1 : -1;
  const firstNumericAfterOsIndex = osIndex >= 0 ? tokens.findIndex((token, index) => index > osIndex && isNumericToken(token)) : -1;
  const numericTokensAfterOs = osIndex >= 0 ? tokens.slice(osIndex + 1).filter(isNumericToken) : [];

  if (numericTokensAfterOs.length < 2) {
    return null;
  }

  const transactionAmount = numericTokensAfterOs.length >= 4 ? numericTokensAfterOs[numericTokensAfterOs.length - 4] : numericTokensAfterOs[0];
  const deviation = numericTokensAfterOs.length >= 3 ? numericTokensAfterOs[numericTokensAfterOs.length - 3] : 0;
  const amount = numericTokensAfterOs.length >= 2 ? numericTokensAfterOs[numericTokensAfterOs.length - 2] : transactionAmount;
  const fraud = numericTokensAfterOs.length >= 1 ? numericTokensAfterOs[numericTokensAfterOs.length - 1] : 0;

  return {
    Transaction_ID: tokens[0] || '',
    Date: tokens[1] || '',
    Time: tokens[2] || '',
    Merchant_ID: tokens[3] || '',
    Customer_ID: tokens[4] || '',
    Device_ID: tokens[5] || '',
    Transaction_Type: tokens[6] || '',
    Transaction_Status: statusIndex >= 0 ? tokens[statusIndex] : '',
    Device_OS: osIndex >= 0 ? tokens[osIndex] : '',
    Transaction_Frequency: firstNumericAfterOsIndex >= 0 ? tokens[firstNumericAfterOsIndex] : 0,
    Transaction_Amount_Deviation: deviation,
    Transaction_Amount: transactionAmount,
    amount,
    fraud,
    raw: { originalLine: line, tokens },
  };
}

app.get('/api/analysis', (_req, res) => {
  return res.json({
    success: true,
    analysis: store.analysis,
    totalTransactions: store.transactions.length,
    suspiciousTransactionsCount: store.analysis?.suspiciousTransactions?.length ?? 0,
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    if (!store.analysis) {
      return res.status(409).json({
        success: false,
        message: 'Upload and analyze a file first',
      });
    }

    const reply = await generateChatResponse({ analysis: store.analysis, message });
    return res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      success: false,
      message: 'Chat response failed',
    });
  }
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

    console.log('Building heuristic analysis...');
    const heuristicAnalysis = buildFraudAnalysis(transactions);

    console.log('Calling Gemini AI...');
    const aiAnalysis = await analyzeTransactions(heuristicAnalysis);
    console.log('Gemini response received');

    store.uploaded = true;
    store.transactions = heuristicAnalysis.enrichedTransactions;
    store.analysis = {
      ...heuristicAnalysis,
      ...aiAnalysis,
      suspiciousTransactions: aiAnalysis.suspiciousTransactions?.length ? aiAnalysis.suspiciousTransactions : heuristicAnalysis.suspiciousTransactions,
      patterns: aiAnalysis.patterns?.length ? aiAnalysis.patterns : heuristicAnalysis.patterns,
      recommendation: aiAnalysis.recommendation || heuristicAnalysis.recommendation,
    };

    return res.json({
      success: true,
      count: transactions.length,
      message: 'File parsed successfully',
      analysis: store.analysis,
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

// Accept transaction text pasted into chat and parse as a single-file CSV-like input
app.post('/api/documents/parse-text', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();

    if (!text) {
      resetStore();
      return res.status(400).json({ success: false, message: 'No text provided' });
    }

    let lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    lines = lines.filter((line) => !['USER', 'AI', 'ASSISTANT', 'ASSISTANT RESPONSE', 'USER INPUT'].includes(line.toUpperCase()));

    if (lines.length === 0) {
      resetStore();
      return res.status(400).json({ success: false, message: 'No valid lines after filtering' });
    }

    let transactions = [];

    if (lines.length === 1) {
      const line = lines[0];
      const transaction = parseSingleTransactionLine(line);

      if (!transaction) {
        resetStore();
        return res.status(400).json({ success: false, message: 'Could not parse single-line transaction input' });
      }

      transactions = [transaction];
      console.log('Parsed single-line transaction with', transaction.raw?.tokens?.length || 0, 'tokens');
      console.log('Mapped transaction:', transaction);
    } else {
      const headerLine = lines[0];
      const dataLines = lines.slice(1);

      let delimiter = null;
      if (headerLine.includes(',')) delimiter = ',';
      else if (headerLine.includes('\t')) delimiter = '\t';
      else if (headerLine.includes(';')) delimiter = ';';

      const headers = delimiter
        ? headerLine.split(delimiter).map((value) => value.trim()).filter(Boolean)
        : headerLine.split(/\s+/).filter(Boolean);

      if (headers.length === 0) {
        resetStore();
        return res.status(400).json({ success: false, message: 'Could not extract headers' });
      }

      const combinedDataLine = dataLines.join(delimiter || ' ');
      const values = delimiter === '\t'
        ? combinedDataLine.split(/\t+/).filter(Boolean)
        : delimiter === ',' || delimiter === ';'
          ? combinedDataLine.split(delimiter).map((value) => value.trim()).filter(Boolean)
          : combinedDataLine.split(/\s+/).filter(Boolean);

      if (values.length === 0) {
        resetStore();
        return res.status(400).json({ success: false, message: 'Could not extract data values' });
      }

      const transaction = {};
      for (let index = 0; index < headers.length; index++) {
        transaction[headers[index]] = values[index] ?? '';
      }

      transactions = [transaction];
      console.log('Parsed text transactions:', transactions.length);
      console.log('Headers:', headers);
      console.log('Values:', values);
      console.log('Transaction object:', transaction);
    }

    const heuristicAnalysis = buildFraudAnalysis(transactions);
    const isSingleTransaction = transactions.length === 1 || heuristicAnalysis?.singleTransaction;
    let aiAnalysis = {
      summary: heuristicAnalysis.summary,
      patterns: heuristicAnalysis.patterns,
      recommendation: heuristicAnalysis.recommendation,
      suspiciousTransactions: heuristicAnalysis.suspiciousTransactions,
    };

    if (!isSingleTransaction) {
      aiAnalysis = await analyzeTransactions(heuristicAnalysis);
    }

    store.uploaded = true;
    store.transactions = heuristicAnalysis.enrichedTransactions;
    store.analysis = {
      ...heuristicAnalysis,
      ...aiAnalysis,
      suspiciousTransactions: aiAnalysis.suspiciousTransactions?.length ? aiAnalysis.suspiciousTransactions : heuristicAnalysis.suspiciousTransactions,
      patterns: aiAnalysis.patterns?.length ? aiAnalysis.patterns : heuristicAnalysis.patterns,
      recommendation: aiAnalysis.recommendation || heuristicAnalysis.recommendation,
    };

    return res.json({
      success: true,
      count: transactions.length,
      message: transactions.length === 1 ? 'Single transaction parsed and analyzed' : 'Text parsed and analyzed',
      analysis: store.analysis,
    });
  } catch (err) {
    console.error('Parse-text error:', err);
    resetStore();
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
