
import React from 'react';
import { View, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  setView: (view: View) => void;
  onBack: () => void;
  canGoBack: boolean;
  user: User;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  setView, 
  onBack, 
  canGoBack, 
  user, 
  onLogout, 
  isDarkMode, 
  toggleTheme 
}) => {
  const navItems = [
    { id: 'dashboard' as View, label: 'Bosh sahifa', icon: '🏠', roles: ['Operator', 'Admin', 'SuperAdmin'] },
    { id: 'tasks' as View, label: 'Topshiriqlar', icon: '📝', roles: ['Operator', 'Admin', 'SuperAdmin'] },
    { id: 'operators' as View, label: 'Operatorlar', icon: '👤', roles: ['Admin', 'SuperAdmin'] },
    { id: 'customers' as View, label: 'Mijozlar', icon: '👥', roles: ['Operator', 'Admin', 'SuperAdmin'] },
    { id: 'products' as View, label: 'Katalog', icon: '📦', roles: ['Admin', 'SuperAdmin', 'Operator'] },
    { id: 'orders' as View, label: 'Jurnal', icon: '📜', roles: ['Operator', 'Admin', 'SuperAdmin'] },
  ].filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0B1120] overflow-hidden font-sans transition-colors duration-500">
      {/* Sidebar - Desktop Only (Premium Glass Style) */}
      <aside className="w-80 hidden lg:flex flex-col m-6 rounded-[2.5rem] relative z-20 overflow-hidden shadow-2xl shadow-indigo-500/10 transition-all duration-500">
        {/* Background Layers */}
        <div className="absolute inset-0 bg-[#0F172A] dark:bg-[#1E293B]"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
        
        {/* Logo Area */}
        <div className="p-8 pb-4 flex items-center space-x-4 relative z-10">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-500/30">
            M
          </div>
          <div className="text-left">
            <h1 className="text-white font-bold tracking-tight text-xl">Mentor</h1>
            <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-[0.2em] opacity-80">School</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 relative z-10 mt-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                activeView === item.id 
                  ? 'text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {activeView === item.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-100"></div>
              )}
              <span className={`text-xl relative z-10 transition-transform duration-300 ${activeView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
              <span className="font-semibold text-sm tracking-tight relative z-10">{item.label}</span>
              {activeView === item.id && (
                <span className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white] animate-pulse z-10"></span>
              )}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 relative z-10">
           <div className="bg-slate-900/60 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
            <div className="flex items-center space-x-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/10">
                {user.name?.[0] || 'O'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                <p className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider mt-0.5">Online • #{user.id}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full py-3 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border border-white/5"
            >
              Chiqish
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 lg:h-24 flex items-center justify-between px-6 lg:px-10 shrink-0 relative z-30">
          <div className="flex items-center space-x-4">
            {canGoBack && (
              <button 
                onClick={onBack} 
                className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm hover:scale-105 transition-all flex items-center justify-center"
              >
                <span className="text-xl">←</span>
              </button>
            )}
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight animate-in fade-in slide-in-from-left-4 text-left">
              {navItems.find(i => i.id === activeView)?.label || 'Boshqaruv'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              {isDarkMode ? '🌙' : '☀️'}
            </button>
            
            <div className="hidden sm:flex items-center bg-white dark:bg-slate-800 px-5 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
               <div className="text-right">
                  <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Rolingiz</p>
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">{user.role}</p>
               </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 lg:px-10 pb-24 lg:pb-10 scroll-smooth custom-scrollbar">
          <div className="max-w-[1600px] mx-auto py-2">
            {children}
          </div>
        </main>

        {/* Floating Bottom Navigation - Mobile Only (Glassmorphism) */}
        <nav className="lg:hidden fixed bottom-6 left-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 flex justify-around py-4 px-2 z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[2.5rem]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center flex-1 py-1 transition-all duration-300 relative ${
                activeView === item.id ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400'
              }`}
            >
              <span className="text-2xl mb-1 filter drop-shadow-lg">{item.icon}</span>
              <span className={`text-[8px] font-bold uppercase tracking-tight transition-opacity duration-300 ${activeView === item.id ? 'opacity-100' : 'opacity-0'}`}>
                {item.label}
              </span>
              {activeView === item.id && (
                <div className="absolute -bottom-2 w-1 h-1 bg-indigo-500 rounded-full"></div>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};
