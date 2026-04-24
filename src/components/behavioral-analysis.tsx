import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Users, Clock, CreditCard, AlertTriangle } from "lucide-react";
import { useData } from "../DataContext";

export function BehavioralAnalysis() {
  const { analysis, loading, error } = useData();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="patterns" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patterns">Behavior Patterns</TabsTrigger>
          <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
          <TabsTrigger value="profiles">Risk Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Live Patterns
              </CardTitle>
              <CardDescription>Direct patterns returned by backend AI analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && <div className="text-sm text-muted-foreground">Analyzing...</div>}
              {!loading && error && <div className="text-sm text-destructive">{error}</div>}
              {!analysis || analysis.patterns.length === 0 ? (
                <div className="text-sm text-muted-foreground">No patterns detected.</div>
              ) : (
                analysis.patterns.map((pattern, index) => (
                  <Badge key={`${pattern}-${index}`} variant="outline" className="mr-2 mb-2">
                    {pattern}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Live Anomalies
              </CardTitle>
              <CardDescription>Direct suspicious transaction reasons from backend data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!analysis || analysis.suspiciousTransactions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No anomalies available.</div>
              ) : (
                analysis.suspiciousTransactions.map((txn, index) => (
                  <div key={`${txn.date}-${txn.description}-${index}`} className="border rounded-lg p-3">
                    <div className="text-sm font-medium">{txn.description}</div>
                    <div className="text-xs text-muted-foreground">{txn.date}</div>
                    <div className="text-sm mt-1">{txn.reason}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-500" />
                Risk Profiles
              </CardTitle>
              <CardDescription>Live risk score and recommendation from backend analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risk Score</span>
                <span className="font-medium">{analysis ? analysis.riskScore : "N/A"}</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                <p className="text-sm">{analysis ? analysis.recommendation : "No recommendation available."}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
