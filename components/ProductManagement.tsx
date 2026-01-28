
import React, { useState, useMemo } from 'react';
import { Product, User } from '../types';

interface ProductManagementProps {
  products: Product[];
  onSaveProduct: (product: Product) => Promise<void>;
  onCreateProduct?: (product: Partial<Product>) => Promise<void>;
  currentUser?: User;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({ products, onSaveProduct, onCreateProduct, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    nomi: '',
    davomiyligi: '',
    oylik_narx: 0,
    narx: 0,
    izoh: '',
    video: '',
    hujjat: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin';

  // Mahsulotlarni filtrlash
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.nomi.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.izoh || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (String(p.davomiyligi || '')).toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [products, searchTerm]);

  const openExternalLink = (url: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatDuration = (val?: string | number) => {
    if (!val) return '';
    const strVal = String(val);
    // Agar faqat raqamlardan iborat bo'lsa, 'oy' so'zini qo'shamiz
    if (/^\d+$/.test(strVal.trim())) return `${strVal} oy`;
    return strVal;
  };

  const handleCreateSubmit = async () => {
    if (!onCreateProduct) return;
    if (!newProduct.nomi || !newProduct.narx) {
        alert("Kurs nomi va narxi majburiy!");
        return;
    }
    setIsCreating(true);
    try {
        await onCreateProduct(newProduct);
        setIsCreateModalOpen(false);
        setNewProduct({
            nomi: '',
            davomiyligi: '',
            oylik_narx: 0,
            narx: 0,
            izoh: '',
            video: '',
            hujjat: ''
        });
    } catch (e) {
        // Error handled in parent
    } finally {
        setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-24 relative">
      {/* Header & Search */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Katalog</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Barcha kurslar ({products.length} ta)</p>
        </div>
        
        <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full lg:w-80">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 text-xs text-slate-500 dark:text-slate-400">🔍</span>
                <input 
                type="text" 
                placeholder="Kurs nomi bo'yicha qidirish..."
                className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 outline-none font-bold text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            {isAdmin && onCreateProduct && (
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap"
                >
                  + Kurs Qo'shish
                </button>
            )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
        {filteredProducts.map(product => (
          <div 
            key={product.id}
            onClick={() => setSelectedProduct(product)}
            className="group bg-white dark:bg-slate-800 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all cursor-pointer flex flex-col h-full animate-in zoom-in-95 duration-300"
          >
            <div className="aspect-square bg-slate-50 dark:bg-slate-700 rounded-[1.5rem] overflow-hidden mb-4 relative flex items-center justify-center">
               <span className="text-4xl">🎓</span>
               {product.davomiyligi && (
                 <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[8px] font-bold text-white uppercase tracking-wider">
                    {formatDuration(product.davomiyligi)}
                 </div>
               )}
            </div>
            
            <h5 className="text-[11px] font-black text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2 uppercase tracking-tight">{product.nomi}</h5>
            
            <div className="mt-auto space-y-1">
              <div className="flex justify-between items-center">
                 <p className="text-[8px] font-bold text-slate-400 uppercase">Jami</p>
                 <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{product.narx.toLocaleString()}</p>
              </div>
              {product.oylik_narx > 0 && (
                <div className="flex justify-between items-center">
                   <p className="text-[8px] font-bold text-slate-400 uppercase">Oylik</p>
                   <p className="text-[10px] font-bold text-slate-500 dark:text-slate-300 tracking-tighter">{product.oylik_narx.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-32 text-center opacity-30">
           <span className="text-6xl block mb-4">📦</span>
           <p className="font-black uppercase text-[12px] tracking-[0.3em] text-slate-500 dark:text-slate-400">Kurslar topilmadi</p>
        </div>
      )}

      {/* Product Detail View (Popup) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-lg animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 relative">
              
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="absolute top-6 right-6 z-20 w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-rose-500 transition-all border border-white/10"
              >✕</button>

              <div className="flex-1 overflow-y-auto custom-scrollbar text-left pb-10">
                 
                 {/* Banner */}
                 <div className="relative w-full aspect-video bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center">
                    <span className="text-8xl opacity-20">🎓</span>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent flex flex-col justify-end p-8">
                        {selectedProduct.davomiyligi && (
                            <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest w-fit mb-2">
                                {formatDuration(selectedProduct.davomiyligi)}
                            </span>
                        )}
                        <h3 className="text-3xl font-black text-white uppercase leading-tight tracking-tight">{selectedProduct.nomi}</h3>
                    </div>
                 </div>

                 <div className="p-8 space-y-8">
                    
                    {/* Action Buttons (Video & Doc) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                          onClick={() => selectedProduct.video ? openExternalLink(selectedProduct.video) : alert("Video havola kiritilmagan")}
                          className={`py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 border ${
                            selectedProduct.video 
                              ? 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600 shadow-rose-500/30 cursor-pointer' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-600 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <span className="text-lg">▶️</span> Kurs Videosi
                        </button>
                        
                        <button 
                          onClick={() => selectedProduct.hujjat ? openExternalLink(selectedProduct.hujjat) : alert("Hujjat kiritilmagan")}
                          className={`py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 border ${
                            selectedProduct.hujjat 
                              ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 cursor-pointer' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-600 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <span className="text-lg">📄</span> Dastur / Hujjat
                        </button>
                    </div>

                    {/* Price & Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jami Narxi</p>
                           <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                             {selectedProduct.narx.toLocaleString()} <span className="text-xs opacity-50 font-medium">so'm</span>
                           </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Oylik Narxi</p>
                           <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                             {selectedProduct.oylik_narx ? selectedProduct.oylik_narx.toLocaleString() : '0'} <span className="text-xs opacity-50 font-medium">so'm</span>
                           </p>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                       <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                         <span>📝</span> Kurs haqida to'liq ma'lumot
                       </h4>
                       <div className="prose prose-sm dark:prose-invert max-w-none">
                         <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                           {selectedProduct.izoh || "Ushbu kurs uchun batafsil ma'lumot kiritilmagan."}
                         </p>
                       </div>
                    </div>

                 </div>
              </div>

              <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 shrink-0">
                 <button 
                    onClick={() => setSelectedProduct(null)}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-slate-700 transition-all active:scale-95"
                 >
                    Yopish
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Create Product Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 relative">
             <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Yangi Kurs</h3>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Katalogga qo'shish</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">✕</button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Kurs Nomi *</label>
                   <input 
                     type="text" 
                     className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white"
                     value={newProduct.nomi}
                     onChange={e => setNewProduct({...newProduct, nomi: e.target.value})}
                     placeholder="Masalan: Ingliz tili"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Oylik Narx</label>
                        <input 
                            type="number" 
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white"
                            value={newProduct.oylik_narx || ''}
                            onChange={e => {
                                const val = Number(e.target.value);
                                const duration = parseFloat(newProduct.davomiyligi?.replace(/\D/g, '') || '0');
                                setNewProduct({
                                    ...newProduct, 
                                    oylik_narx: val,
                                    narx: (duration > 0 && val > 0) ? duration * val : newProduct.narx
                                });
                            }}
                            placeholder="0"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Davomiyligi (oy)</label>
                        <input 
                            type="text" 
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white"
                            value={newProduct.davomiyligi || ''}
                            onChange={e => {
                                const val = e.target.value;
                                const duration = parseFloat(val.replace(/\D/g, '') || '0');
                                const monthly = newProduct.oylik_narx || 0;
                                setNewProduct({
                                    ...newProduct, 
                                    davomiyligi: val,
                                    narx: (duration > 0 && monthly > 0) ? duration * monthly : newProduct.narx
                                });
                            }}
                            placeholder="Masalan: 6"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Jami Narx (Avto) *</label>
                    <input 
                        type="number" 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white"
                        value={newProduct.narx || ''}
                        onChange={e => setNewProduct({...newProduct, narx: Number(e.target.value)})}
                        placeholder="0"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Video URL (Google Drive/Youtube)</label>
                    <input 
                        type="text" 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white"
                        value={newProduct.video || ''}
                        onChange={e => setNewProduct({...newProduct, video: e.target.value})}
                        placeholder="https://..."
                    />
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Hujjat URL (Google Drive)</label>
                    <input 
                        type="text" 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white"
                        value={newProduct.hujjat || ''}
                        onChange={e => setNewProduct({...newProduct, hujjat: e.target.value})}
                        placeholder="https://..."
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Batafsil Izoh</label>
                    <textarea 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white resize-none h-32"
                        value={newProduct.izoh || ''}
                        onChange={e => setNewProduct({...newProduct, izoh: e.target.value})}
                        placeholder="Kurs haqida to'liq ma'lumot..."
                    />
                </div>
             </div>

             <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Bekor qilish</button>
                <button 
                  onClick={handleCreateSubmit} 
                  disabled={isCreating}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 active:scale-95 transition-all"
                >
                    {isCreating ? "Qo'shilmoqda..." : "Qo'shish 🚀"}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
