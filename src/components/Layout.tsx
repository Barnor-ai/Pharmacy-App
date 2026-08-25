import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { usePharmacy } from '../context/PharmacyContext';
import { CompanySetupModal } from './CompanySetupModal';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentUser, settings } = usePharmacy();
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'Super Admin' && !settings?.isCompanyConfigured) {
      setShowSetupModal(true);
    }
  }, [currentUser, settings?.isCompanyConfigured]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <Topbar sidebarCollapsed={sidebarCollapsed} />

      <main
        className={`pt-20 pb-12 px-4 sm:px-6 md:px-8 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-6">{children}</div>
      </main>

      <CompanySetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
      />
    </div>
  );
};
