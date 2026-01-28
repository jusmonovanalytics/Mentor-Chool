
import React, { useState, useMemo, useRef } from 'react';
import { User, Customer, Order } from '../types';

interface Props {
  operators: User[];
  customers: Customer[];
  orders: Order[];
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onSync: () => void;
  onAddOperator?: (operator: Partial<User>) => Promise<void>;
  currentUser?: User;
}

type ModalMode = 'assign' | 'unassign';

export const OperatorManagement: React.FC<Props> = ({ operators, customers, orders, onUpdateCustomer, onSync, onAddOperator, currentUser }) => {
  const [selectedOperator, setSelectedOperator] = useState<User | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('assign');
  const [bulkSearch, setBulkSearch] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isPultOpen, setIsPultOpen] = useState(false);

  // Operator Creation State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOperator, setNewOperator] = useState<Partial<User>>({
      name: '',
      surname: '',
      email: '',
      phone: '',
      role: 'Operator',
      password: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin';
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';

  const statsMap = useMemo(() => {
    const customerCounts: Record<string, number> = {};
    const salesTotals: Record<string, number> = {};
    
    customers.forEach(c => {
      if (c.operator_id && c.operator_id !== "0") {
        customerCounts[String(c.operator_id)] = (customerCounts[String(c.operator_id)] || 0) + 1;
      }
    });

    orders.forEach(o => {
      const opId = String(o.operator_id);
      salesTotals[opId] = (salesTotals[opId] || 0) + (Number(o.jami_summa) || 0);
    });

    return { customerCounts, salesTotals };
  }, [customers, orders]);

  const globalAssignStats = useMemo(() => {
    const total = customers.length;
    const assigned = customers.filter(c => c.operator_id && c.operator_id !== "" && c.operator_id !== "0").length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  }, [customers]);

  const filteredBulkCustomers = useMemo(() => {
    return customers.filter(c => {
      const term = bulkSearch.toLowerCase();
      const matchesSearch = (
        c.ism.toLowerCase().includes(term) ||
        c.familiya.toLowerCase().includes(term) ||
        c.telefon.includes(term)
      );

      if (!matchesSearch) return false;

      if (modalMode === 'assign') {
        return !c.operator_id || c.operator_id === "" || c.operator_id === "0";
      } else {
        return String(c.operator_id) === String(selectedOperator?.id);
      }
    });
  }, [customers, bulkSearch, modalMode, selectedOperator]);

  const toggleCustomerSelection = (id: string) => {
    const newSet = new Set(selectedCustomerIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCustomerIds(newSet);
  };

  const handleSelectAll = () => {
    const allIds = filteredBulkCustomers.map(c => String(c.id));
    setSelectedCustomerIds(new Set(allIds));
  };

  const handleBulkAction = async () => {
    if (!selectedOperator || selectedCustomerIds.size === 0) return;
    setIsSaving(true);
    try {
      const promises = Array.from(selectedCustomerIds).map(id => {
        const customer = customers.find(c => String(c.id) === String(id));
        if (customer) {
          return onUpdateCustomer({
            ...customer,
            operator_id: modalMode === 'assign' ? String(selectedOperator.id) : "",
            operator_name: modalMode === 'assign' ? `${selectedOperator.name} ${selectedOperator.surname}` : ""
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      setIsBulkModalOpen(false);
      setSelectedCustomerIds(new Set());
      onSync();
    } catch (e) {
      alert("Xatolik yuz berdi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (!onAddOperator) return;
    if (!newOperator.name || !newOperator.email || !newOperator.password) {
        alert("Ism, Email va Parol majburiy!");
        return;
    }
    setIsCreating(true);
    try {
        await onAddOperator(newOperator);
        setIsCreateModalOpen(false);
        setNewOperator({
            name: '',
            surname: '',
            email: '',
            phone: '',
            role: 'Operator',
            password: ''
        });
    } catch (e) {
        // Handled in parent
    } finally {
        setIsCreating(false);
    }
  };

  const formatMoney = (val: number) => {
    return val.toLocaleString('uz-UZ').replace(/,/g, ' ');
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-700 pb-24 text-left">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-800 p-6 lg:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Operatorlar</h2>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.3em] mt-1">Shtat va mijozlar biriktiruvi</p>
        </div>
        <div className="flex gap-4">
             {isAdmin && onAddOperator && (
                <button onClick={() => setIsCreateModalOpen(true)} className="px-8 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:opacity-90">
                    + Operator
                </button>
             )}
            <button onClick={onSync} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/10 active:scale-95 transition-all hover:bg-indigo-500">Yangilash</button>
        </div>
      </div>

      {/* Operators Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {operators.map(op => (
          <div key={op.id} className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl transition-all overflow-hidden flex flex-col group">
            <div className="p-8">
               <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner">
                    {op.name[0]}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-3 py-1 rounded-xl text-[7px] font-black uppercase tracking-widest border ${
                      op.role === 'SuperAdmin' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      op.role === 'Admin' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                      {op.role}
                    </span>
                    <p className="text-[10px] font-bold text-slate-400 mt-2">ID: {op.id}</p>
                  </div>
               </div>
               
               <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{op.name} {op.surname}</h3>
               <p className="text-xs font-bold text-slate-400 mt-1">{op.phone}</p>

               <div className="grid grid-cols-2 gap-3 mt-8">
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Mijozlar</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{statsMap.customerCounts[String(op.id)] || 0}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Savdo</p>
                    <p className="text-sm font-black text-emerald-500">{formatMoney(statsMap.salesTotals[String(op.id)] || 0)}</p>
                  </div>
               </div>
            </div>

            <div className="p-4 pt-0 grid grid-cols-2 gap-2 mt-auto">
               <button 
                onClick={() => { setSelectedOperator(op); setModalMode('assign'); setIsBulkModalOpen(true); }}
                className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[8px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-600/10 hover:bg-indigo-500"
               >
                 Biriktirish +
               </button>
               <button 
                onClick={() => { setSelectedOperator(op); setModalMode('unassign'); setIsBulkModalOpen(true); }}
                className="py-4 bg-rose-500 text-white rounded-2xl font-black text-[8px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-rose-500/10 hover:bg-rose-400"
               >
                 Ajratish -
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Optimized Bulk Modal */}
      {isBulkModalOpen && selectedOperator && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 relative">
            
            {/* Minimal Header */}
            <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-700 shrink-0 flex items-center justify-between">
               <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                    {modalMode === 'assign' ? 'Mijozlarni biriktirish' : 'Mijozlarni olib tashlash'}
                  </h3>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Operator: {selectedOperator.name} {selectedOperator.surname}</p>
               </div>
               <button onClick={() => { setIsBulkModalOpen(false); setSelectedCustomerIds(new Set()); }} className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">✕</button>
            </div>

            {/* Customer Grid */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar bg-slate-50/20 dark:bg-slate-900/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredBulkCustomers.map(c => {
                  const isSelected = selectedCustomerIds.has(String(c.id));
                  return (
                    <div 
                      key={c.id} 
                      onClick={() => toggleCustomerSelection(String(c.id))}
                      className={`relative p-5 rounded-[2rem] border transition-all cursor-pointer flex flex-col group ${
                        isSelected 
                          ? (modalMode === 'assign' ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-600/10 scale-[1.02]' : 'bg-rose-500 border-rose-500 shadow-xl shadow-rose-500/10 scale-[1.02]')
                          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-50 dark:bg-slate-700 text-slate-400'}`}>
                           {c.ism[0]}
                         </div>
                         {isSelected && <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] text-indigo-600 font-bold shadow-lg">✓</div>}
                      </div>
                      <h4 className={`font-black uppercase text-[10px] truncate tracking-tight mb-1 ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {c.ism} {c.familiya}
                      </h4>
                      <p className={`text-[9px] font-bold ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                        {c.telefon}
                      </p>
                    </div>
                  );
                })}
              </div>
              {filteredBulkCustomers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 opacity-20 italic">
                  <span className="text-6xl mb-4">🔍</span>
                  <p className="font-black uppercase text-[12px] tracking-[0.4em]">Mijozlar topilmadi</p>
                </div>
              )}
            </div>

            {/* Floating Pult Tugmasi (Stats & Search) */}
            <div className="absolute bottom-32 right-8 z-[50]">
               <button 
                  onClick={() => setIsPultOpen(!isPultOpen)}
                  className="w-16 h-16 bg-slate-900 dark:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-white dark:border-slate-800 transition-transform active:scale-90"
               >
                  <span className="text-2xl">{isPultOpen ? '✕' : '📊'}</span>
               </button>

               {isPultOpen && (
                 <div className="absolute bottom-20 right-0 w-[300px] bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-6 animate-in slide-in-from-bottom-10">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Baza Statistikasi</h4>
                    
                    <div className="space-y-3">
                       <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Barcha mijozlar</span>
                          <span className="text-xs font-black dark:text-white">{globalAssignStats.total} ta</span>
                       </div>
                       <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                          <span className="text-[9px] font-black text-emerald-500 uppercase">Biriktirilgan</span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{globalAssignStats.assigned} ta</span>
                       </div>
                       <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                          <span className="text-[9px] font-black text-rose-500 uppercase">Bo'sh (Erkin)</span>
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400">{globalAssignStats.unassigned} ta</span>
                       </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                       <input 
                          type="text" 
                          placeholder="Mijoz qidirish..."
                          className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 outline-none text-[10px] font-bold dark:text-white"
                          value={bulkSearch}
                          onChange={(e) => setBulkSearch(e.target.value)}
                       />
                       <button 
                          onClick={handleSelectAll}
                          className="w-full py-3.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest"
                       >
                          Hammasini tanlash
                       </button>
                    </div>
                 </div>
               )}
            </div>

            {/* Bottom Confirm Bar */}
            <div className="p-8 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 shrink-0 flex items-center justify-between gap-6">
              <div className="text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanlandi</p>
                <h4 className={`text-2xl font-black tracking-tighter ${modalMode === 'assign' ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                  {selectedCustomerIds.size} mijoz
                </h4>
              </div>
              <div className="flex gap-4">
                <button 
                    onClick={handleBulkAction}
                    disabled={isSaving || selectedCustomerIds.size === 0}
                    className={`px-12 py-5 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all disabled:opacity-20 ${
                    modalMode === 'assign' ? 'bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-500' : 'bg-rose-500 shadow-rose-500/20 hover:bg-rose-400'
                    }`}
                >
                    {isSaving ? "Saqlanmoqda..." : (modalMode === 'assign' ? "Biriktirish 🚀" : "Olib tashlash 🗑️")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE OPERATOR MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 relative">
             <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Yangi Operator</h3>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Jamoaga qo'shish</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">✕</button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Ism *</label>
                       <input 
                         type="text" 
                         className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white"
                         value={newOperator.name}
                         onChange={e => setNewOperator({...newOperator, name: e.target.value})}
                         placeholder="Ali"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Familiya</label>
                       <input 
                         type="text" 
                         className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white"
                         value={newOperator.surname}
                         onChange={e => setNewOperator({...newOperator, surname: e.target.value})}
                         placeholder="Valiyev"
                       />
                    </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Email (Login) *</label>
                   <input 
                     type="email" 
                     className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white"
                     value={newOperator.email}
                     onChange={e => setNewOperator({...newOperator, email: e.target.value})}
                     placeholder="ali@gmail.com"
                   />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Parol *</label>
                   <input 
                     type="text" 
                     className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white"
                     value={newOperator.password}
                     onChange={e => setNewOperator({...newOperator, password: e.target.value})}
                     placeholder="kuchliparol123"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Telefon</label>
                        <input 
                            type="text" 
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white"
                            value={newOperator.phone || ''}
                            onChange={e => setNewOperator({...newOperator, phone: e.target.value})}
                            placeholder="+998..."
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Lavozim</label>
                        <select 
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 font-bold text-sm outline-none dark:text-white disabled:opacity-50"
                            value={newOperator.role || 'Operator'}
                            onChange={e => setNewOperator({...newOperator, role: e.target.value as any})}
                            disabled={!isSuperAdmin}
                        >
                            <option value="Operator">Operator</option>
                            {isSuperAdmin && (
                                <>
                                    <option value="Admin">Admin</option>
                                    <option value="SuperAdmin">SuperAdmin</option>
                                </>
                            )}
                        </select>
                    </div>
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
