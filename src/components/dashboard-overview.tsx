import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { AlertTriangle, Shield, Eye, Activity } from "lucide-react";
import { useData } from "../DataContext";

export function DashboardOverview() {
  const { analysis, totalTransactions, suspiciousTransactionsCount, loading, error } = useData();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis ? analysis.riskScore : "N/A"}</div>
            <p className="text-xs text-muted-foreground">Live value from backend analysis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Transactions</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis ? `${suspiciousTransactionsCount} / ${totalTransactions}` : "N/A"}</div>
            <p className="text-xs text-muted-foreground">Suspicious out of total transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detected Patterns</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis ? analysis.patterns.length : "N/A"}</div>
            <p className="text-xs text-muted-foreground">Direct count from backend array</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recommendation</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium line-clamp-3">{analysis ? analysis.recommendation : "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Live Analysis Summary
          </CardTitle>
          <CardDescription>Direct backend summary and suspicious transaction reasons ({suspiciousTransactionsCount}/{totalTransactions})</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Analyzing...</div>}
          {!loading && error && <div className="text-sm text-destructive">{error}</div>}
          {!loading && !error && !analysis && (
            <div className="text-sm text-muted-foreground">Upload a file to generate analysis.</div>
          )}
          {analysis && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription>{analysis.summary}</AlertDescription>
            </Alert>
          )}
          {analysis?.suspiciousTransactions.map((tx, index) => (
            <Alert key={`${tx.date}-${tx.description}-${index}`} className="border-red-200 bg-red-50">
              <div className="flex items-center justify-between gap-2">
                <AlertDescription className="flex-1">{tx.description} - {tx.reason}</AlertDescription>
                <Badge variant="destructive">{tx.amount}</Badge>
              </div>
            </Alert>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
