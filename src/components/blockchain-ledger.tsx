import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Shield, Lock, CheckCircle, Clock, Link, Hash } from "lucide-react";
import { useData } from "../DataContext";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function BlockchainLedger() {
  const { analysis, totalTransactions, suspiciousTransactionsCount, loading, error } = useData();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="blocks" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="blocks">Blockchain Blocks</TabsTrigger>
          <TabsTrigger value="contracts">Smart Contracts</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="integrity">Data Integrity</TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5 text-blue-500" />
                Transaction Ledger View
              </CardTitle>
              <CardDescription>Direct suspicious transaction records from backend analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <div className="text-sm text-muted-foreground mb-4">Analyzing...</div>}
              {!loading && error && <div className="text-sm text-destructive mb-4">{error}</div>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!analysis || analysis.suspiciousTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell className="py-4 text-muted-foreground" colSpan={4}>
                        No ledger rows available yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    analysis.suspiciousTransactions.map((tx, index) => (
                      <TableRow key={`${tx.date}-${tx.description}-${index}`}>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>{formatAmount(tx.amount)}</TableCell>
                        <TableCell>{tx.reason}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-purple-500" />
                Contract Rule Inputs
              </CardTitle>
              <CardDescription>Direct pattern strings from backend analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!analysis || analysis.patterns.length === 0 ? (
                <div className="text-sm text-muted-foreground">No contract inputs available.</div>
              ) : (
                analysis.patterns.map((pattern, index) => (
                  <div key={`${pattern}-${index}`} className="border rounded-lg p-3 text-sm">
                    {pattern}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                Audit Trail
              </CardTitle>
              <CardDescription>Direct summary and recommendation from backend analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Summary</div>
                <div>{analysis ? analysis.summary : "No summary yet."}</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Recommendation</div>
                <div>{analysis ? analysis.recommendation : "No recommendation yet."}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-500" />
                  Integrity Inputs
                </CardTitle>
                <CardDescription>Direct backend values used for integrity review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Risk Score</span>
                  <span className="font-medium">{analysis ? analysis.riskScore : "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Suspicious Transactions</span>
                  <span className="font-medium">{analysis ? `${suspiciousTransactionsCount}/${totalTransactions}` : "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Patterns</span>
                  <span className="font-medium">{analysis ? analysis.patterns.length : "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Live Monitoring
                </CardTitle>
                <CardDescription>Status based on available analysis payload</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{analysis ? "Analysis Loaded" : "Awaiting Analysis"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
