import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  Download,
  Laptop,
  CheckCircle2,
  X,
  Monitor,
  HelpCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onTriggerInstall: () => void;
  isAlreadyInstalled?: boolean;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onTriggerInstall,
  isAlreadyInstalled = false
}) => {
  const { settings } = usePharmacy();
  const [activeTab, setActiveTab] = useState<'chrome' | 'edge' | 'safari'>('chrome');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 my-8">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 p-6 flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/40 text-emerald-200 text-xs font-bold mb-1">
              <Laptop className="w-3.5 h-3.5" />
              <span>Desktop Application (PWA)</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Install {settings.pharmacyName}
            </h2>
            <p className="text-xs text-emerald-100/90 max-w-md">
              Run as a standalone desktop application on Windows, macOS, or Linux with instant launch and receipt printer integration.
            </p>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 p-2 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Primary Action Panel */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Direct App Installer</h3>
                  <p className="text-xs text-slate-400">
                    {isAlreadyInstalled
                      ? 'Application is already installed on this device.'
                      : deferredPrompt
                      ? '1-Click desktop installation ready!'
                      : 'Install via browser or follow standard guide below'}
                  </p>
                </div>
              </div>

              {/* Install Button */}
              {deferredPrompt && !isAlreadyInstalled && (
                <button
                  type="button"
                  onClick={onTriggerInstall}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App Now</span>
                </button>
              )}
            </div>

            {/* Desktop Advantages Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Instant PC Taskbar Launch</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Dedicated Clutter-Free Window</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>POS & Printer Compatibility</span>
              </div>
            </div>
          </div>

          {/* Browser Instructions Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-500" /> Browser Installation Steps
              </h4>
              <span className="text-[11px] text-slate-500">Select your browser:</span>
            </div>

            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              {[
                { id: 'chrome', label: 'Google Chrome' },
                { id: 'edge', label: 'Microsoft Edge' },
                { id: 'safari', label: 'Mac Safari' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Instructions Content */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 space-y-2">
              {activeTab === 'chrome' && (
                <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                  <li>Look at the right side of your Chrome address bar (URL bar) at the top of the browser.</li>
                  <li>Click the <strong>Install Icon</strong> (a small monitor icon with a down arrow).</li>
                  <li>Alternatively, click the <strong>3-dots menu (⋮)</strong> in Chrome → select <strong>"Save and share"</strong> → <strong>"Install Pharmacy Enterprise Management System..."</strong></li>
                  <li>Click <strong>Install</strong>. A standalone app icon will be placed directly onto your <strong>Desktop & Taskbar</strong>!</li>
                </ol>
              )}

              {activeTab === 'edge' && (
                <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                  <li>Look at the right side of your Microsoft Edge address bar.</li>
                  <li>Click the <strong>App Available Icon</strong>.</li>
                  <li>Click <strong>Install</strong> to add {settings.pharmacyName} to your <strong>Windows Start Menu</strong> and <strong>Taskbar</strong>.</li>
                  <li>Right-click the app icon on your taskbar and select <strong>"Pin to taskbar"</strong> for 1-click access.</li>
                </ol>
              )}

              {activeTab === 'safari' && (
                <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                  <li>In Safari on macOS: Click the <strong>Share button</strong> in the top toolbar or File menu.</li>
                  <li>Select <strong>"Add to Dock"</strong>.</li>
                  <li>Confirm the app name as <strong>"{settings.pharmacyName}"</strong> and click <strong>Add</strong>.</li>
                  <li>The app will now open in a standalone, dedicated window from your Mac Dock!</li>
                </ol>
              )}
            </div>
          </div>

          {/* Footer Close */}
          <div className="pt-2 flex justify-end border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
