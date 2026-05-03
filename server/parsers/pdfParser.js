import fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';

const TRANSACTION_PATTERN = /(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+(-?\d[\d,]*\.?\d*)/;

function normalizeAmount(amountText) {
  return Number(String(amountText).replace(/,/g, ''));
}

export async function parsePDF(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: fileBuffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const lines = parsed.text.split(/\r?\n/);
  const transactions = [];

  for (const line of lines) {
    const match = line.trim().match(TRANSACTION_PATTERN);
    if (!match) {
      continue;
    }

    const [, date, description, amount] = match;
    transactions.push({
      date,
      description,
      amount: normalizeAmount(amount),
      raw: { line },
    });
  }

  return transactions;
}
