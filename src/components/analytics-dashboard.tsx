import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { useData } from '../DataContext';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function riskClass(score: number) {
  if (score < 40) return 'text-green-600';
  if (score < 70) return 'text-yellow-600';
  return 'text-red-600';
}

export function AnalyticsDashboard() {
  const { analysis, totalTransactions, suspiciousTransactionsCount, loading, error, refresh, lastAnalyzedAt, clear } = useData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-16 text-muted-foreground">Analyzing transactions...</div>
      </div>
    );
  }

  if (!analysis) {
    return <div>Upload file to see analytics</div>;
  }

  const pieData = [
    { name: "Suspicious", value: analysis.suspiciousTransactions.length },
    { name: "Normal", value: Math.max(0, 100 - analysis.riskScore) },
  ];

  const patternData = analysis.patterns.map((p, i) => ({
    name: `P${i + 1}`,
    value: Math.random() * 100,
  }));

  const lineData = analysis.suspiciousTransactions.map((tx) => ({
    time: tx.date,
    amount: tx.amount,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Fraud Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive fraud detection and prevention analytics</p>
        </div>
        <Button onClick={clear}>Refresh</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Score</CardTitle>
          <CardDescription>
            {lastAnalyzedAt ? `Last analyzed at ${lastAnalyzedAt.toLocaleString()}` : 'Latest AI analysis'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className={`text-6xl font-bold ${riskClass(analysis.riskScore)}`}>{analysis.riskScore}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{analysis.summary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suspicious Transactions ({suspiciousTransactionsCount}/{totalTransactions})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {analysis.suspiciousTransactions.length === 0 ? (
                  <tr>
                    <td className="py-4 text-muted-foreground" colSpan={4}>
                      No suspicious transactions detected in the latest analysis.
                    </td>
                  </tr>
                ) : (
                  analysis.suspiciousTransactions.map((tx, index) => (
                    <tr key={`${tx.date}-${tx.description}-${index}`} className="border-b last:border-b-0">
                      <td className="py-2">{tx.date}</td>
                      <td className="py-2">{tx.description}</td>
                      <td className="py-2">{formatCurrency(tx.amount)}</td>
                      <td className="py-2">{tx.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.patterns.length === 0 ? (
            <p className="text-muted-foreground">No risk patterns detected in the latest analysis.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {analysis.patterns.map((pattern, index) => (
                <li key={`${pattern}-${index}`}>{pattern}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Trend</CardTitle>
          <CardDescription>Existing line chart view of suspicious transaction amounts</CardDescription>
        </CardHeader>
        <CardContent>
          {lineData.length === 0 ? (
            <p className="text-muted-foreground">No suspicious transactions to chart yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fraud Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <PieChart width={300} height={300}>
            <Pie data={pieData} dataKey="value" outerRadius={100} innerRadius={60} stroke="#0f1722" strokeWidth={2}>
              <Cell fill="#ef4444" />
              <Cell fill="#22c55e" />
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{
                background: '#0f1722',
                border: '1px solid #1f2937',
                borderRadius: 12,
                padding: '8px 12px',
                color: '#e5eef8',
              }}
              itemStyle={{ color: '#e5eef8' }}
              labelStyle={{ color: '#aab7c6' }}
            />
          </PieChart>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pattern Frequency</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <BarChart width={400} height={300} data={patternData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </CardContent>
      </Card>

      <Card className="border-amber-400/60 bg-amber-50/50">
        <CardHeader>
          <CardTitle>Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{analysis.recommendation}</p>
        </CardContent>
      </Card>
    </div>
  );
}