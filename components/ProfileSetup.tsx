
import React, { useState } from 'react';
import { User } from '../types';

interface ProfileSetupProps {
  user: User;
  onComplete: (updatedUser: User) => Promise<void> | void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ user, onComplete }) => {
  const [firstName, setFirstName] = useState(user.name || '');
  const [lastName, setLastName] = useState(user.surname || '');
  const [phone, setPhone] = useState(user.phone || '+998 ');
  const [address, setAddress] = useState(user.address || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return alert('Ism va Familiyangizni to\'liq kiriting');
    }

    if (phone.trim().length < 9) {
      return alert('Telefon raqamingizni to\'liq kiriting');
    }
    
    setIsSubmitting(true);
    try {
      await onComplete({
        ...user,
        name: firstName.trim(),
        surname: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        isProfileComplete: true,
        photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + ' ' + lastName)}&background=4f46e5&color=fff`
      });
    } catch (err) {
      console.error(err);
      alert('Ma\'lumotlarni saqlashda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-lg w-full bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 p-8 sm:p-14 space-y-8 animate-in slide-in-from-bottom-8 duration-700">
        <div className="text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-[2.5rem] mx-auto flex items-center justify-center text-indigo-600 text-4xl mb-6 shadow-inner">
            👤
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Profilni to'ldiring</h2>
          <p className="text-slate-400 mt-2 font-medium text-sm">Ishni davom ettirish uchun ma'lumotlaringiz kerak</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Ism</label>
              <input 
                type="text" 
                required
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 bg-slate-50"
                placeholder="Ali"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Familiya</label>
              <input 
                type="text" 
                required
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 bg-slate-50"
                placeholder="Karimov"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Telefon</label>
            <input 
              type="text" 
              required
              className="w-full px-6 py-4 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 bg-slate-50"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Manzil</label>
            <input 
              type="text" 
              className="w-full px-6 py-4 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 bg-slate-50"
              placeholder="Toshkent sh., Chilonzor"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all transform active:scale-[0.98] shadow-xl mt-4 flex items-center justify-center gap-3"
          >
            {isSubmitting ? "Saqlanmoqda..." : "Ishni boshlash 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
};
