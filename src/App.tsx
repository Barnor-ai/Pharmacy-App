import React from 'react';
import { PharmacyProvider, usePharmacy } from './context/PharmacyContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { Layout } from './components/Layout';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { SalesHistory } from './pages/SalesHistory';
import { Prescriptions } from './pages/Prescriptions';
import { Purchases } from './pages/Purchases';
import { Suppliers } from './pages/Suppliers';
import { Customers } from './pages/Customers';
import { Reports } from './pages/Reports';
import { AIAssistant } from './pages/AIAssistant';
import { UsersPage } from './pages/UsersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

const MainContent: React.FC = () => {
  const { activeTab } = usePharmacy();

  switch (activeTab) {
    case 'dashboard':
      return <Dashboard />;
    case 'pos':
      return <POS />;
    case 'inventory':
      return <Inventory />;
    case 'sales':
      return <SalesHistory />;
    case 'prescriptions':
      return <Prescriptions />;
    case 'purchases':
      return <Purchases />;
    case 'suppliers':
      return <Suppliers />;
    case 'customers':
      return <Customers />;
    case 'reports':
      return <Reports />;
    case 'ai-assistant':
      return <AIAssistant />;
    case 'users':
      return <UsersPage />;
    case 'audit-logs':
      return <AuditLogsPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <Dashboard />;
  }
};

const AppContent: React.FC = () => {
  const { isAuthenticated, authLoading } = usePharmacy();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xl shadow-emerald-600/30 animate-pulse">
            <span className="text-2xl font-black">Rx</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-emerald-400 font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Verifying Secure Session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <MainContent />
    </Layout>
  );
};

export default function App() {
  return (
    <PharmacyProvider>
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </PharmacyProvider>
  );
}

