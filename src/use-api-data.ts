import { useCallback, useEffect, useState } from 'react';
import { AnalysisData, fetchAnalysis } from './api';

export function useApiData() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAnalysis();
      setData(res.analysis);
      setLastAnalyzedAt(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analysis';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load, lastAnalyzedAt };
}
