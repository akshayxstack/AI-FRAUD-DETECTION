import ExcelJS from 'exceljs';

function normalizeExcelRow(row) {
  const fraudValue = row.fraud ?? row.Fraud ?? row.fraudLabel ?? row.FraudLabel ?? row.label ?? row.Label;

  return {
    date: row.date || row.Date,
    description: row.description || row.Description,
    amount: Number(row.amount || row.Amount || 0),
    fraudLabel: typeof fraudValue === 'string'
      ? ['1', 'true', 'yes', 'fraud', 'fraudulent'].includes(fraudValue.trim().toLowerCase())
      : fraudValue === 1 || fraudValue === true,
    raw: row,
  };
}

function normalizeHeader(value) {
  return String(value || '').trim();
}

export async function parseExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const headers = [];

  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = normalizeHeader(cell.value);
  });

  const transactions = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const rowObject = {};

    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        rowObject[header] = cell.value;
      }
    });

    if (Object.keys(rowObject).length > 0) {
      transactions.push(normalizeExcelRow(rowObject));
    }
  });

  return transactions;
}
