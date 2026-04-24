import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { DashboardOverview } from "./components/dashboard-overview";
import { TransactionMonitoring } from "./components/transaction-monitoring";
import { BehavioralAnalysis } from "./components/behavioral-analysis";
import { DocumentVerification } from "./components/document-verification";
import { BlockchainLedger } from "./components/blockchain-ledger";
import { AnalyticsDashboard } from "./components/analytics-dashboard";
import { Shield, Activity, Brain, FileCheck, Link, BarChart3, Settings, Bell } from "lucide-react";
import { useData } from "./DataContext";

export default function App() {
  const { analysis } = useData();
  const activeAlerts = analysis?.suspiciousTransactions.length ?? 0;

  return (
    <div className="min-h-screen bg-background pointer-events-auto relative">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold">FraudGuard AI</h1>
                  <p className="text-sm text-muted-foreground">Advanced Financial Fraud Detection & Prevention System</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <div className="relative">
                <Button variant="outline" size="sm">
                  <Bell className="h-4 w-4 mr-2" />
                  Alerts
                </Button>
                {activeAlerts > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 px-1 min-w-5 h-5 text-xs">
                    {activeAlerts}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Behavior
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="blockchain" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Blockchain
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Fraud Detection Overview</h2>
                  <p className="text-muted-foreground">
                    Real-time AI-powered fraud detection and prevention dashboard
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">System Operational</span>
                </div>
              </div>
              <DashboardOverview />
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold">Real-Time Transaction Monitoring</h2>
                <p className="text-muted-foreground">
                  AI-powered graph-based models analyzing transaction networks for fraud detection
                </p>
              </div>
              <TransactionMonitoring />
            </div>
          </TabsContent>

          <TabsContent value="behavior">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold">Behavioral Analysis & Anomaly Detection</h2>
                <p className="text-muted-foreground">
                  Hybrid AI models combining time-series and behavioral data for fraud prevention
                </p>
              </div>
              <BehavioralAnalysis />
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold">NLP-Based Document Verification</h2>
                <p className="text-muted-foreground">
                  Transformer-based NLP models for document authenticity and fraud detection
                </p>
              </div>
              <DocumentVerification />
            </div>
          </TabsContent>

          <TabsContent value="blockchain">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold">Blockchain Fraud Prevention</h2>
                <p className="text-muted-foreground">
                  Tamper-proof ledger with smart contracts for automated fraud checks and accountability
                </p>
              </div>
              <BlockchainLedger />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h4 className="font-medium mb-2">Compliance Standards</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>✓ ISO 22301 - Business Continuity</div>
                <div>✓ ISO 27001 - Information Security</div>
                <div>✓ ISO 15489 - Records Management</div>
                <div>✓ ISO/IEC 20243 - Blockchain Integrity</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">AI Technologies</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• Graph Neural Networks</div>
                <div>• Transformer Models (BERT)</div>
                <div>• Deep Learning (CNN/RNN)</div>
                <div>• Behavioral Analytics</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Security Features</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• End-to-End Encryption</div>
                <div>• Zero-Knowledge Proofs</div>
                <div>• Multi-Factor Authentication</div>
                <div>• Audit Trail Immutability</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">System Status</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  AI Models: Operational
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Blockchain: Synchronized
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  NLP Services: Active
                </div>
              </div>
            </div>
          </div>
          <div className="border-t mt-6 pt-4 text-center text-sm text-muted-foreground">
            <p>FraudGuard AI © 2024 - Advanced Financial Fraud Detection & Prevention System</p>
          </div>
        </div>
      </footer>
    </div>
  );
}