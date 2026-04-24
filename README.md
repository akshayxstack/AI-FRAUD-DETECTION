
# AI Fraud Detection

AI Fraud Detection is a full-stack financial fraud analysis dashboard with real document upload, transaction parsing, and Gemini-powered risk analysis.

The frontend is built with React + Vite + TypeScript and shows live analysis across multiple tabs (overview, transactions, behavior, documents, blockchain, analytics). The backend is an Express API that accepts CSV, XLSX/XLS, and PDF uploads, parses transactions, and generates a structured fraud report.

## Project Highlights

- Real file upload flow with multipart/form-data
- Supported formats: CSV, XLSX, XLS, PDF
- AI analysis using Google Gemini
- Unified analysis state shared across dashboard modules
- Visual analytics with Recharts
- Vite API proxy to backend

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS v4
- Radix UI components
- Recharts

### Backend

- Node.js + Express
- Multer (file upload handling)
- csv-parser
- ExcelJS
- pdf-parse
- @google/generative-ai
- dotenv

## Repository Structure

- src/: Frontend application source
- src/components/: Dashboard feature modules
- server/: Backend API and parsers
- server/parsers/: CSV, Excel, and PDF parsers
- server/services/: Gemini analysis service
- server/state/store.js: In-memory analysis store
- uploads/: Root-level upload/test artifacts
- server/uploads/: Runtime upload artifacts created by Multer
- build/: Vite production build output

## How It Works

1. User uploads a document in the Documents tab.
2. Frontend sends file to POST /api/documents/upload.
3. Backend parser normalizes rows into transaction objects:
   - date
   - description
   - amount
4. Backend calls Gemini with sampled transactions and strict JSON output instructions.
5. Parsed AI response is stored in memory and served to GET /api/analysis.
6. All dashboard tabs render from the same analysis payload.

## API Endpoints

- GET /api/health
  - Health check

- GET /api/analysis
  - Returns:
    - success
    - analysis (riskScore, summary, suspiciousTransactions, patterns, recommendation)
    - totalTransactions
    - suspiciousTransactionsCount

- POST /api/documents/upload
  - Form field: file
  - Allowed extensions: csv, xlsx, xls, pdf
  - Parses file, runs AI analysis, updates in-memory store

- GET /api/debug-store
  - Returns simple store metadata for debugging

- GET /api/debug-transactions
  - Returns transaction count and sample rows

## Environment Variables

Create .env in the project root (recommended):

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=gemini-2.0-flash,gemini-2.0-flash-lite-001
PORT=8000

Notes:

- Backend loads env from both project root and server/.env.
- server/.env values override root .env when both exist.

## Local Development Setup

### 1. Install frontend/root dependencies

npm install

### 2. Install backend dependencies

cd server
npm install
cd ..

### 3. Start both frontend and backend

npm run dev

This runs:

- Backend on http://localhost:8000
- Frontend on http://localhost:3000

Vite proxies /api requests to http://127.0.0.1:8000.

## Production Build

npm run build

Build output is generated in build/.

## Data Contract Used by Frontend

The frontend expects analysis in this shape:

- riskScore: number (0-100)
- summary: string
- suspiciousTransactions: array of
  - date: string
  - description: string
  - amount: number
  - reason: string
- patterns: string[]
- recommendation: string

## Parsing Notes

### CSV parser

- Detects likely date/description/debit/credit/amount columns by keyword matching.
- Converts debit values to negative amounts and credit values to positive amounts.

### Excel parser

- Reads first worksheet.
- Uses row 1 as headers.
- Maps common header names (Date, Description, Amount).

### PDF parser

- Uses regex extraction from text lines.
- Expected pattern resembles:
  DD/MM/YYYY  description  amount

## Known Limitations

- AI output parsing relies on extracting JSON from model text.
- In-memory backend store resets on server restart.
- Very large files are not ideal for direct Git pushes.
- GitHub rejects files above 100 MB unless Git LFS is used.

## Troubleshooting

- Upload fails with backend unreachable message:
  - Ensure backend is running on port 8000.

- GEMINI_API_KEY not loaded:
  - Verify .env location and key name.
  - Restart server after updating env files.

- No suspicious transactions shown:
  - Check parser compatibility with your input file format.
  - Inspect GET /api/debug-transactions output.

## Current Scripts

Root package scripts:

- npm run dev: Start backend + Vite together
- npm run dev:client: Start Vite only
- npm run server: Start backend only
- npm run dev:all: Start backend + client (alternate)
- npm run build: Build frontend

Server package script:

- npm start: Start backend from server/ directory

## License

No explicit license file is currently defined in this repository.
