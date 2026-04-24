import fs from 'fs';
import csv from 'csv-parser';

function normalizeCSVRow(row) {
  const keys = Object.keys(row);

  const dateKey = keys.find((k) => k.toLowerCase().includes('date'));

  const descKey = keys.find(
    (k) =>
      k.toLowerCase().includes('desc') ||
      k.toLowerCase().includes('details') ||
      k.toLowerCase().includes('narration') ||
      k.toLowerCase().includes('merchant') ||
      k.toLowerCase().includes('transaction') ||
      k.toLowerCase().includes('remarks') ||
      k.toLowerCase().includes('type')
  );

  const debitKey = keys.find(
    (k) => k.toLowerCase().includes('debit') || k.toLowerCase().includes('withdraw')
  );

  const creditKey = keys.find(
    (k) => k.toLowerCase().includes('credit') || k.toLowerCase().includes('deposit')
  );

  const amountKey = keys.find((k) => k.toLowerCase().includes('amount'));

  let amount = 0;

  if (debitKey && row[debitKey]) {
    amount = -Number(row[debitKey]);
  } else if (creditKey && row[creditKey]) {
    amount = Number(row[creditKey]);
  } else if (amountKey && row[amountKey]) {
    amount = Number(row[amountKey]);
  }

  const description = descKey ? row[descKey] : JSON.stringify(row);

  return {
    date: row[dateKey] || '',
    description,
    amount,
  };
}

export async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const transactions = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        transactions.push(normalizeCSVRow(row));
      })
      .on('end', () => {
        resolve(transactions);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}
