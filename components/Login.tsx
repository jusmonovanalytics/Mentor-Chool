
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  existingOperators: User[];
}

export const Login: React.FC<LoginProps> = ({ onLogin, existingOperators }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!normalizedEmail || !password) {
      setError('Email va parolni kiriting');
      return;
    }

    setIsLoading(true);
    const found = existingOperators.find(o => o.email.toLowerCase() === normalizedEmail);

    if (found) {
      if (String(found.password) === password) {
        onLogin(found);
      } else {
        setError('Parol noto\'g\'ri');
      }
    } else {
      setError('Foydalanuvchi topilmadi');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px]"></div>
      
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.05)] border border-white p-10 sm:p-14 space-y-8 animate-in zoom-in duration-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-xl shadow-indigo-100">
            M
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Xush kelibsiz!</h2>
          <p className="text-slate-400 mt-1 font-semibold text-[10px] uppercase tracking-widest">Mentor School Portali</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">Email</label>
              <input 
                type="email" 
                required
                className="w-full px-6 py-4 rounded-xl border border-slate-100 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-semibold text-slate-700 bg-slate-50/50"
                placeholder="misol@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">Parol</label>
              <input 
                type="password" 
                required
                className="w-full px-6 py-4 rounded-xl border border-slate-100 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-semibold text-slate-700 bg-slate-50/50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-rose-500 text-[10px] font-bold text-center">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white py-4 rounded-[2rem] font-bold text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95 flex items-center justify-center"
          >
            {isLoading ? "Tekshirilmoqda..." : "Kirish"}
          </button>
        </form>

        <div className="text-center">
          <p className="text-[9px] text-slate-400 uppercase font-semibold opacity-60">
            Faqat tasdiqlangan xodimlar uchun.
          </p>
        </div>
      </div>
    </div>
  );
};
