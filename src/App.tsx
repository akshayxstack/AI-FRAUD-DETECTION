import { PremiumDashboard } from './components/premium-dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <PremiumDashboard />
      </main>
    </div>
  );
}