import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { FileText, Upload, Scan, AlertCircle } from "lucide-react";
import { useData } from "../DataContext";
import { uploadDocument } from "../api";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function DocumentVerification() {
  const { analysis, totalTransactions, suspiciousTransactionsCount, loading, error, refresh } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    setUploading(true);

    try {
      const data = await uploadDocument(file);

      if (data.success) {
        alert("Upload successful");
        setFile(null);
        await refresh();
      } else {
        alert(data.message || "Upload failed");
      }
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert("Upload error. Make sure backend server is running on port 8000.");
    }

    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analysis">NLP Analysis</TabsTrigger>
          <TabsTrigger value="queue">Document Queue</TabsTrigger>
          <TabsTrigger value="indicators">Fraud Indicators</TabsTrigger>
          <TabsTrigger value="upload">Upload & Scan</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                AI-Powered Document Analysis
              </CardTitle>
              <CardDescription>Direct values from backend analysis payload</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && <div className="text-sm text-muted-foreground">Analyzing...</div>}
              {!loading && error && <div className="text-sm text-destructive">{error}</div>}
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Risk Score</div>
                <div className="text-2xl font-bold">{analysis ? analysis.riskScore : "N/A"}</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Summary</div>
                <div>{analysis ? analysis.summary : "No summary yet."}</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Recommendation</div>
                <div>{analysis ? analysis.recommendation : "No recommendation yet."}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-purple-500" />
                Document Processing Queue
              </CardTitle>
              <CardDescription>Direct suspicious rows ({suspiciousTransactionsCount}/{totalTransactions} suspicious/total)</CardDescription>
            </CardHeader>
            <CardContent>
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
                        No suspicious transactions available yet.
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

        <TabsContent value="indicators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Fraud Indicators
              </CardTitle>
              <CardDescription>Direct patterns list from backend analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {!analysis || analysis.patterns.length === 0 ? (
                <div className="text-sm text-muted-foreground">No indicators available yet.</div>
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

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-500" />
                Document Upload & Analysis
              </CardTitle>
              <CardDescription>Upload a file to run real parsing and Gemini analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Upload Document for Analysis</h3>
                <p className="text-muted-foreground mb-4">Supported formats: PDF, CSV, XLSX, XLS</p>
                <div className="flex items-center gap-4 justify-center">
                  <input
                    type="file"
                    accept=".pdf,.csv,.xlsx,.xls"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="text-sm"
                  />
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {uploading ? "Uploading..." : "Upload File"}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
