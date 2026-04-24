import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Eye } from "lucide-react";
import { useMemo } from "react";
import { useData } from "../DataContext";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function TransactionMonitoring() {
  const { analysis, loading, error } = useData();

  const handleInvestigate = (tx: { amount: number; reason: string }) => {
    alert(`Transaction Details:\n\nAmount: ${formatAmount(tx.amount)}\nReason: ${tx.reason}`);
  };

  const chartData = useMemo(() => {
    if (!analysis) {
      return [];
    }

    return analysis.suspiciousTransactions.map((transaction) => ({
      time: transaction.date,
      amount: transaction.amount,
    }));
  }, [analysis]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Suspicious Transaction Amounts
          </CardTitle>
          <CardDescription>Direct amounts from backend suspiciousTransactions data</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-sm text-muted-foreground">Analyzing...</div>}
          {!loading && error && <div className="text-sm text-destructive">{error}</div>}
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2} name="Amount" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-purple-500" />
            Recent Transaction Analysis
          </CardTitle>
          <CardDescription>Direct rows from backend suspiciousTransactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!analysis || analysis.suspiciousTransactions.length === 0 ? (
                <TableRow>
                  <TableCell className="py-4 text-muted-foreground" colSpan={5}>
                    No suspicious transactions available yet.
                  </TableCell>
                </TableRow>
              ) : (
                analysis.suspiciousTransactions.map((txn, index) => (
                  <TableRow key={`${txn.date}-${txn.description}-${index}`}>
                    <TableCell>{txn.date}</TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell>{formatAmount(txn.amount)}</TableCell>
                    <TableCell>{txn.reason}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleInvestigate(txn)}>
                        Investigate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
