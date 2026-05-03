export type SuspiciousTransaction = {
  date: string;
  description: string;
  amount: number;
  reason: string;
  fraudProbability?: number;
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  features?: {
    transactionFrequency: number;
    averageTransactionAmount: number;
    deviationFromAverage: number;
    timeBasedAnomaly: number;
    repeatedSmallTransactions: number;
    anomalyScore: number;
    patternScore: number;
  };
};

export type AnalysisData = {
  riskScore: number;
  fraudCount: number;
  normalCount: number;
  summary: string;
  suspiciousTransactions: SuspiciousTransaction[];
  patterns: string[];
  recommendation: string;
  fraudTrend?: Array<{ date: string; transactionCount: number; maxRiskScore: number }>;
  anomalyTrend?: Array<{ date: string; anomalyScore: number }>;
  transactionCount?: number;
  recommendations?: string[];
  enrichedTransactions?: Array<Record<string, unknown>>;
  singleTransaction?: SuspiciousTransaction & { reasons?: string[] };
};

export type UploadResponse = {
  success: boolean;
  count?: number;
  message?: string;
  error?: string;
  analysis?: AnalysisData | null;
};

type AnalysisResponse = {
  success: boolean;
  analysis: AnalysisData | null;
  totalTransactions: number;
  suspiciousTransactionsCount: number;
};

export type ChatMessageResponse = {
  reply: string;
  highlights?: string[];
  nextSteps?: string[];
  error?: string;
};

export type ChatApiResponse = {
  success: boolean;
  reply?: ChatMessageResponse;
  message?: string;
};

export type DashboardAnalysisResponse = AnalysisResponse;

export async function fetchAnalysis(): Promise<AnalysisResponse> {
  const res = await fetch('/api/analysis', {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch analysis');
  }

  return res.json();
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Upload failed. Backend may be unreachable.' }));
    return {
      success: false,
      message: body.message || body.error || 'Upload failed',
      error: body.error,
    };
  }

  return res.json();
}

export async function sendChatMessage(message: string): Promise<ChatApiResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Chat request failed' }));
    return {
      success: false,
      message: body.message || 'Chat request failed',
    };
  }

  return res.json();
}

export async function parseTextDocument(text: string): Promise<UploadResponse> {
  const res = await fetch('/api/documents/parse-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Parse failed' }));
    return { success: false, message: body.message || 'Parse failed', error: body.error };
  }

  return res.json();
}
