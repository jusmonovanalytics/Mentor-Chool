
import React, { useState, useRef, useEffect } from 'react';
import { Product, Customer, User, Order } from '../types';
import { submitOrder } from '../services/sheetService';

interface Props {
  products: Product[];
  selectedCustomer: Customer | null;
  currentUser: User;
  scriptUrl?: string;
  onClose: () => void;
  existingOrders: Order[];
}

export const OrderEntry: React.FC<Props> = ({ products, selectedCustomer, currentUser, scriptUrl, onClose, existingOrders }) => {
  // Savatda faqat bitta mahsulot bo'lishi mumkin
  const [cart, setCart] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [izoh, setIzoh] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Draggable Cart State
  const [cartPos, setCartPos] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 100 : 20, 
    y: 120 
  });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    setCartPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const filteredProducts = products.filter(p => 
    p.nomi.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.davomiyligi || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    // Talab: "bitta mijozga bitta kursni sonini faqat bitta qilib sotish mumkin"
    // Demak, savatda faqat 1 element, miqdori 1 bo'lishi kerak.
    setCart([{ ...product, miqdor: 1 }]);
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart([]);
  };

  // Aniq formatlash yordamchisi
  const getFormattedNow = () => {
    const date = new Date();
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${d}.${m}.${y} ${h}:${min}:${s}`;
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || cart.length === 0) return;
    if (!scriptUrl) return alert("Google Script URL sozlanmagan!");

    // Start date check
    if (!startDate) {
        alert("Iltimos, kurs boshlanish vaqtini tanlang!");
        return;
    }

    setIsSubmitting(true);
    
    const timeStr = getFormattedNow();
    const numericIds = existingOrders.map(o => parseInt(o.id)).filter(id => !isNaN(id));
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
    const newOrderId = (maxId + 1).toString();

    // Faqat bitta item bor deb hisoblaymiz
    const item = cart[0];

    const ordersData: any[] = [{
      id: newOrderId,
      sana: timeStr,
      operator_id: currentUser.id,
      mijoz_id: selectedCustomer.id,
      mijoz_ism: selectedCustomer.ism,
      mijoz_familya: selectedCustomer.familiya,
      mijoz_tel_nomer: selectedCustomer.telefon,
      tovar_id: item.id,
      tovar: item.nomi,
      tovar_birlik: item.davomiyligi || "kurs", 
      narxi: item.oylik_narx > 0 ? item.oylik_narx : item.narx, // Mantiqan operator oylik narxni kiritsa kerak, lekin jami narxni ham saqlaymiz sheetga
      miqdor: 1,
      jami_summa: item.narx * 1, // Jami summa baribir umumiy narx
      holat: 'Kutilmoqda', // Initial status
      izoh: izoh,
      kurs_boshlash_vaqti: startDate
    }];

    try {
      await submitOrder(scriptUrl, ordersData);
      alert(`Buyurtma #${newOrderId} qabul qilindi (Kutilmoqda)!`);
      onClose();
    } catch (error) {
      console.error("Order Submit Error:", error);
      alert("Xatolik! Buyurtma saqlanmadi.");
    } finally {
      setIsSubmitting(false);
      setIsCartOpen(false);
    }
  };

  const cartTotal = cart.reduce((s, i) => s + (i.miqdor * i.narx), 0);
  const hasItem = cart.length > 0;

  return (
    <div className="relative animate-in slide-in-from-right duration-500 pb-32">
      {/* Catalog Header */}
      <div className="bg-white dark:bg-slate-800 p-6 lg:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm mb-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Mijoz: {selectedCustomer?.ism} {selectedCustomer?.familiya}</h3>
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest mt-1">Kurs tanlash</p>
          </div>
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Kurs qidirish..." 
              className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 outline-none focus:border-indigo-500 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
        {filteredProducts.map(product => {
          const isSelected = cart.some(c => c.id === product.id);

          return (
            <div 
              key={product.id}
              className={`group relative bg-white dark:bg-slate-800 rounded-3xl border transition-all p-4 cursor-pointer hover:shadow-xl flex flex-col ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/10 dark:ring-indigo-500/20' : 'border-slate-100 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'}`}
              onClick={() => addToCart(product)}
            >
              <div className="aspect-square rounded-2xl bg-slate-50 dark:bg-slate-700 overflow-hidden mb-4 relative flex items-center justify-center">
                <div className="text-xs opacity-20 font-bold uppercase tracking-widest dark:text-white">Kurs</div>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg animate-in zoom-in duration-300">
                    ✓
                  </div>
                )}
              </div>
              <h5 className="text-[10px] font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight mb-2">{product.nomi}</h5>
              
              <div className="mt-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[9px] text-slate-400 block">{product.davomiyligi}</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{product.narx.toLocaleString()}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xl font-bold transition-all shadow-sm ${isSelected ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>+</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {hasItem && (
        <button 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => {
                if (!isDragging.current) setIsCartOpen(true);
            }}
            style={{
                position: 'fixed',
                left: cartPos.x,
                top: cartPos.y,
                touchAction: 'none',
                cursor: 'grab'
            }}
            className="w-20 h-20 bg-[#1E293B] dark:bg-indigo-600 text-white rounded-full flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-105 active:cursor-grabbing active:scale-95 transition-transform z-[100] group border-4 border-white dark:border-slate-800"
        >
            <span className="text-2xl mb-1 pointer-events-none">🎓</span>
            <span className="text-[10px] font-bold bg-indigo-600 dark:bg-white dark:text-indigo-600 px-2 py-0.5 rounded-full shadow-lg group-hover:bg-indigo-500 pointer-events-none">1</span>
        </button>
      )}

      {/* Floating Cart Modal (Form) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#1E293B] dark:bg-slate-900 w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] text-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
             <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5">
               <div>
                  <h3 className="text-xl font-bold tracking-tight">Shartnoma</h3>
                  <p className="text-indigo-400 font-bold uppercase text-[9px] tracking-widest mt-1">Tanlangan kurs</p>
               </div>
               <button onClick={() => setIsCartOpen(false)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-2xl">✕</button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-20 opacity-20 border-2 border-dashed border-white/20 rounded-[2.5rem]">
                    <span className="text-5xl block mb-4">🎓</span>
                    <p className="font-bold uppercase text-[10px] tracking-[0.2em]">Kurs tanlanmagan</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="bg-white/5 p-5 rounded-3xl border border-white/5 flex justify-between items-center group">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-indigo-300 uppercase truncate pr-4">{item.nomi}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{item.davomiyligi}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-lg font-bold">{(item.narx).toLocaleString()}</p>
                         <button onClick={() => removeFromCart(item.id)} className="text-[9px] text-rose-400 uppercase font-bold mt-2 opacity-60 hover:opacity-100 transition-all">O'chirish</button>
                      </div>
                    </div>
                  ))
                )}
             </div>

             <div className="p-8 pt-6 space-y-6 bg-slate-800/50 dark:bg-black/20">
               <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-4">Kurs boshlanish vaqti</label>
                    <input 
                      type="date" 
                      className="w-full px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 focus:border-indigo-500 outline-none font-semibold text-sm text-white"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-4">Izoh</label>
                    <input 
                      className="w-full px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 focus:border-indigo-500 outline-none font-semibold text-sm"
                      value={izoh}
                      onChange={(e) => setIzoh(e.target.value)}
                      placeholder="Qo'shimcha ma'lumot..."
                    />
                  </div>
               </div>

               <div className="flex items-center justify-between border-t border-white/10 pt-6">
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">To'lov</p>
                    <h3 className="text-3xl font-bold tracking-tighter">{cartTotal.toLocaleString()}</h3>
                  </div>
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || cart.length === 0}
                    className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-3xl font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-20"
                  >
                    {isSubmitting ? "..." : "Rasmiylashtirish 🚀"}
                  </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
