export type SuspiciousTransaction = {
  date: string;
  description: string;
  amount: number;
  reason: string;
};

export type AnalysisData = {
  riskScore: number;
  summary: string;
  suspiciousTransactions: SuspiciousTransaction[];
  patterns: string[];
  recommendation: string;
};

export type UploadResponse = {
  success: boolean;
  count?: number;
  message?: string;
  error?: string;
};

type AnalysisResponse = {
  success: boolean;
  analysis: AnalysisData | null;
  totalTransactions: number;
  suspiciousTransactionsCount: number;
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
