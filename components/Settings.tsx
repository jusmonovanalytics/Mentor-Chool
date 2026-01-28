
import React, { useState } from 'react';
import { SheetConfig } from '../types';

interface SettingsProps {
  config: SheetConfig;
  onSave: (config: SheetConfig) => void;
  onSync: () => void;
  isSyncing: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ config, onSave, onSync, isSyncing }) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const sections = [
    { key: 'operatorsScriptUrl', label: 'Operatorlar Script URL', icon: '👤' },
    { key: 'customersScriptUrl', label: 'Mijozlar (Asosiy) Script URL', icon: '👥' },
    { key: 'statusScriptUrl', label: 'Mijozlar Holati (Log) Script URL', icon: '📜' },
    { key: 'productsScriptUrl', label: 'Mahsulotlar Script URL', icon: '📦' },
    { key: 'ordersScriptUrl', label: 'Buyurtmalar Script URL', icon: '📝' },
    { key: 'orderHistoryScriptUrl', label: 'Buyurtmalar Tarixi (Taxrir) Script URL', icon: '🔄' },
  ];

  const scriptTemplate = `// Master Script for all tables... (same as before)`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="flex-1 bg-white dark:bg-slate-800 p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Tizim Sozlamalari</h3>
            <p className="text-slate-400 text-xs mt-2 font-semibold uppercase tracking-widest">Google Apps Script integratsiyasi</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {sections.map((section) => (
              <div key={section.key} className="space-y-2 p-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 transition-all focus-within:border-indigo-200 focus-within:bg-white dark:focus-within:bg-slate-800">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{section.icon}</span>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{section.label}</label>
                </div>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-semibold text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500 bg-white dark:bg-slate-800"
                  value={(localConfig as any)[section.key]}
                  onChange={(e) => setLocalConfig({...localConfig, [section.key]: e.target.value})}
                  placeholder="Script URL..."
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => onSave(localConfig)} className="flex-1 bg-slate-900 dark:bg-indigo-600 text-white py-4 lg:py-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all shadow-lg active:scale-95">
              Saqlash
            </button>
            <button onClick={onSync} disabled={isSyncing} className="px-8 border-2 border-indigo-100 dark:border-slate-600 text-indigo-600 dark:text-slate-300 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all hover:bg-indigo-50 dark:hover:bg-slate-700 active:scale-95">
              {isSyncing ? '⌛ Sync...' : '🔄 Sync'}
            </button>
          </div>
        </div>

        <div className="lg:w-80 bg-[#0F172A] p-8 rounded-[2.5rem] text-white shadow-xl h-fit lg:sticky lg:top-8 border border-white/5">
          <h3 className="text-lg font-bold mb-4 text-indigo-400">📜 Master Script</h3>
          <p className="text-slate-400 text-[10px] leading-relaxed mb-6 font-medium">
            Ushbu kod barcha jadvallar uchun mos keladi.
          </p>
          <button onClick={copyToClipboard} className={`w-full py-4 rounded-2xl font-bold text-[9px] uppercase tracking-widest transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-slate-900'}`}>
            {copied ? '✅ Nusxalandi' : '📋 Kodni nusxalash'}
          </button>
        </div>
      </div>
    </div>
  );
};
