import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeAlert,
  Clock3,
  Gauge,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useData } from '../DataContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChatPanel } from './chat-panel';

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function riskTone(score: number) {
  if (score < 40) {
    return 'text-emerald-300';
  }

  if (score < 70) {
    return 'text-amber-300';
  }

  return 'text-rose-300';
}

export function PremiumDashboard() {
  const { analysis, totalTransactions, suspiciousTransactionsCount, loading, error, refresh, lastAnalyzedAt, clear } = useData();

  const fraudRate = totalTransactions > 0 ? suspiciousTransactionsCount / totalTransactions : 0;
  const blockedCount = analysis?.fraudCount ?? suspiciousTransactionsCount;
  const alertsCount = analysis?.suspiciousTransactions.length ?? 0;

  const donutData = useMemo(() => {
    if (!analysis) {
      return [];
    }

    return [
      { name: 'Fraud', value: analysis.fraudCount, color: '#fb7185' },
      { name: 'Normal', value: analysis.normalCount, color: '#22c55e' },
    ];
  }, [analysis]);

  const riskTrend = analysis?.fraudTrend ?? [];
  const anomalyTrend = analysis?.anomalyTrend ?? [];

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-sky-950/20 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-100">
              <Shield className="h-3.5 w-3.5" />
              Production fintech risk console
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                AI Financial Fraud Detection
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Upload, parse, score, explain, and monitor suspicious financial activity in one workflow. The dashboard uses engineered features, deterministic fraud scoring, and Gemini explainability.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-100">
                {analysis ? `${analysis.suspiciousTransactions.length} suspicious` : 'Awaiting upload'}
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-100">
                {analysis ? `${analysis.patterns.length} patterns` : 'Real-time scoring'}
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-100">
                {lastAnalyzedAt ? `Updated ${lastAnalyzedAt.toLocaleTimeString()}` : 'Fresh analysis on upload'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={clear} variant="outline" className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <Card className="border-white/10 bg-[#121821]/95">
          <CardContent className="flex items-center justify-center py-14 text-slate-300">
            Analyzing...
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-rose-500/20 bg-rose-500/10">
          <CardContent className="py-4 text-rose-100">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/10 bg-[#121821]/95 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Risk score</CardDescription>
            <CardTitle className={`text-4xl font-semibold ${riskTone(analysis?.riskScore ?? 0)}`}>
              {analysis ? analysis.riskScore : '--'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            Overall portfolio risk weighted from fraud probability, anomaly score, and pattern score.
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#121821]/95 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Fraud rate</CardDescription>
            <CardTitle className="flex items-end gap-2 text-3xl text-white">
              {formatPercent(fraudRate)}
              <ArrowUpRight className="mb-1 h-4 w-4 text-cyan-300" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            {blockedCount} blocked or escalated transactions from {totalTransactions} processed records.
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#121821]/95 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Alerts</CardDescription>
            <CardTitle className="text-3xl text-white">{alertsCount || '--'}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            Suspicious transactions routed into Gemini explanation and investigation workflows.
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#121821]/95 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Transaction volume</CardDescription>
            <CardTitle className="text-3xl text-white">{analysis ? analysis.transactionCount ?? totalTransactions : totalTransactions}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            Parsed transactions with engineered features and per-user behavioral baselines.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="border-white/10 bg-[#121821]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-cyan-300" />
              Fraud trend
            </CardTitle>
            <CardDescription className="text-slate-400">Smooth transaction and anomaly trend using real analysis data only</CardDescription>
          </CardHeader>
          <CardContent>
            {riskTrend.length === 0 ? (
              <div className="py-12 text-sm text-slate-400">No trend data available yet. Upload a file to generate the chart.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={riskTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#243244" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      background: '#0f1722',
                      border: '1px solid #1f2937',
                      borderRadius: '16px',
                      color: '#e5eef8',
                    }}
                  />
                  <Line type="monotone" dataKey="maxRiskScore" stroke="#38bdf8" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="transactionCount" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#121821]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Gauge className="h-5 w-5 text-cyan-300" />
              Fraud vs normal
            </CardTitle>
            <CardDescription className="text-slate-400">Donut chart derived from labeled fraud counts and normal records</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4">
            {donutData.length === 0 ? (
              <div className="py-12 text-sm text-slate-400">No distribution available yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={72} outerRadius={105} paddingAngle={3}>
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0f1722',
                      border: '1px solid #1f2937',
                      borderRadius: '16px',
                      color: '#e5eef8',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="grid w-full grid-cols-2 gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-slate-400">Fraud</div>
                <div className="text-lg font-semibold text-rose-200">{analysis ? analysis.fraudCount : '--'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-slate-400">Normal</div>
                <div className="text-lg font-semibold text-emerald-200">{analysis ? analysis.normalCount : '--'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="border-white/10 bg-[#121821]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-rose-300" />
              Suspicious transactions
            </CardTitle>
            <CardDescription className="text-slate-400">Only high-risk transactions appear here with engineered feature reasons</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-3 font-medium">Date</th>
                  <th className="py-3 font-medium">Description</th>
                  <th className="py-3 font-medium">Amount</th>
                  <th className="py-3 font-medium">Risk</th>
                  <th className="py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {analysis?.suspiciousTransactions.length ? (
                  analysis.suspiciousTransactions.map((transaction, index) => (
                    <tr key={`${transaction.date}-${transaction.description}-${index}`} className="border-b border-white/5 transition hover:bg-white/5">
                      <td className="py-3 text-slate-300">{transaction.date}</td>
                      <td className="py-3 text-slate-100">{transaction.description}</td>
                      <td className="py-3 text-slate-100">{formatAmount(transaction.amount)}</td>
                      <td className="py-3">
                        <Badge variant="outline" className="border-rose-400/20 bg-rose-400/10 text-rose-100">
                          {transaction.riskLevel || 'medium'}
                          {transaction.riskScore ? ` • ${transaction.riskScore}` : ''}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-300">{transaction.reason}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-slate-400">
                      No suspicious transactions detected yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/10 bg-[#121821]/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BadgeAlert className="h-5 w-5 text-cyan-300" />
                Recommendations
              </CardTitle>
              <CardDescription className="text-slate-400">Actionable next steps generated from the hybrid ML + Gemini output</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 leading-6">{analysis?.recommendation || 'Upload a file to receive a recommendation.'}</div>
              {analysis?.patterns?.length ? (
                <div className="space-y-2">
                  {analysis.patterns.slice(0, 5).map((pattern) => (
                    <div key={pattern} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                      {pattern}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#121821]/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock3 className="h-5 w-5 text-cyan-300" />
                Anomaly trend
              </CardTitle>
              <CardDescription className="text-slate-400">Daily anomaly intensity from the engineered feature layer</CardDescription>
            </CardHeader>
            <CardContent>
              {anomalyTrend.length === 0 ? (
                <div className="py-10 text-sm text-slate-400">No anomaly trend data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={anomalyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#243244" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        background: '#0f1722',
                        border: '1px solid #1f2937',
                        borderRadius: '16px',
                        color: '#e5eef8',
                      }}
                    />
                    <Line type="monotone" dataKey="anomalyScore" stroke="#a78bfa" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-white/10 bg-[#121821]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-cyan-300" />
              AI explanation summary
            </CardTitle>
            <CardDescription className="text-slate-400">Gemini only sees suspicious transactions and high-level context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 leading-6">
              {analysis?.summary || 'Upload a file to generate an explanation summary.'}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 leading-6 text-slate-400">
              {analysis?.recommendation || 'Recommendations will appear here once the analysis is complete.'}
            </div>
          </CardContent>
        </Card>

        <ChatPanel />
      </section>
    </div>
  );
}
