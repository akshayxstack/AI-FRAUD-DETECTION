import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AnalysisData, fetchAnalysis } from './api';

type DataContextValue = {
  analysis: AnalysisData | null;
  totalTransactions: number;
  suspiciousTransactionsCount: number;
  loading: boolean;
  error: string | null;
  lastAnalyzedAt: Date | null;
  refresh: () => Promise<void>;
  clear: () => void;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [suspiciousTransactionsCount, setSuspiciousTransactionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchAnalysis();
      setAnalysis(response.analysis);
      setTotalTransactions(response.totalTransactions ?? 0);
      setSuspiciousTransactionsCount(response.suspiciousTransactionsCount ?? 0);
      if (response.analysis) {
        setLastAnalyzedAt(new Date());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analysis';
      setError(message);
      setAnalysis(null);
      setTotalTransactions(0);
      setSuspiciousTransactionsCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setAnalysis(null);
    setTotalTransactions(0);
    setSuspiciousTransactionsCount(0);
    setError(null);
    setLastAnalyzedAt(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ analysis, totalTransactions, suspiciousTransactionsCount, loading, error, lastAnalyzedAt, refresh, clear }),
    [analysis, totalTransactions, suspiciousTransactionsCount, loading, error, lastAnalyzedAt, refresh, clear]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }

  return context;
}
