
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CustomerTask, User, Customer } from '../types';

interface Props {
  tasks: CustomerTask[];
  customers: Customer[];
  currentUser: User;
  allOperators: User[];
  onUpdateTask: (task: CustomerTask) => Promise<void>;
  externalSearch?: string;
  onClearExternalSearch?: () => void;
}

export const TaskManagement: React.FC<Props> = ({ 
  tasks, 
  customers, 
  currentUser, 
  allOperators, 
  onUpdateTask,
  externalSearch,
  onClearExternalSearch
}) => {
  const [activeTab, setActiveTab] = useState('Barchasi');
  const [opFilter, setOpFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isPultOpen, setIsPultOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Update local search if external search is provided
  useEffect(() => {
    if (externalSearch) {
      setSearch(externalSearch);
      setActiveTab('Barchasi');
      setOpFilter('all');
      // After applying, we can clear it in parent if needed, but keeping it in local search is enough
    }
  }, [externalSearch]);

  // Confirmation state
  const [confirmingTaskUpdate, setConfirmingTaskUpdate] = useState<{ task: CustomerTask, status: string } | null>(null);

  // Draggable Pult Logic
  const [fabPos, setFabPos] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 100 : 20, 
    y: typeof window !== 'undefined' ? window.innerHeight - 200 : 400 
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
    setFabPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin';

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Helper to check if task is expired (past the end of its deadline day)
  const isExpired = (deadlineStr: string) => {
    try {
      if (!deadlineStr) return false;
      const deadlineDate = new Date(deadlineStr.replace(' ', 'T'));
      const dayEnd = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate(), 23, 59, 59).getTime();
      return now.getTime() > dayEnd;
    } catch (e) {
      return false;
    }
  };

  // Tasks access logic: Operators only see tasks of customers ASSIGNED to them
  const accessibleTasks = useMemo(() => {
    if (isAdmin) return tasks;

    const myCustomerIds = new Set(
      customers
        .filter(c => String(c.operator_id) === String(currentUser.id))
        .map(c => String(c.id))
    );

    return tasks.filter(t => myCustomerIds.has(String(t.mijoz_id)));
  }, [tasks, customers, isAdmin, currentUser.id]);

  const stats = useMemo(() => {
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000).getTime();
    
    const urgent = accessibleTasks.filter(t => {
      if (t.holati !== 'Yangi' || isExpired(t.topshiriq_vaqti)) return false;
      try {
        const timeValue = t.topshiriq_vaqti ? String(t.topshiriq_vaqti).replace(' ', 'T') : '';
        const tTime = new Date(timeValue).getTime();
        return tTime > now.getTime() && tTime <= twoHoursLater;
      } catch (e) { return false; }
    });

    const today = accessibleTasks.filter(t => {
      if (t.holati !== 'Yangi') return false;
      return t.topshiriq_vaqti && String(t.topshiriq_vaqti).startsWith(todayStr);
    });

    return { urgent, today };
  }, [accessibleTasks, now, todayStr]);

  const filteredTasks = useMemo(() => {
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000).getTime();

    return accessibleTasks.map(t => {
      if (t.holati === 'Yangi' && isExpired(t.topshiriq_vaqti)) {
        return { ...t, displayStatus: 'Bajarilmayapti' };
      }
      return { ...t, displayStatus: t.holati };
    }).filter(t => {
      // Operator filter: Admin uchun hamma operatorni ko'rish, operator uchun barcha tegishli topshiriqlar
      const matchesOp = opFilter === 'all' || String(t.operator_id) === String(opFilter);
      
      let matchesStatus = true;
      const tDate = t.topshiriq_vaqti ? String(t.topshiriq_vaqti) : '';

      if (activeTab === 'Bugun') {
        matchesStatus = tDate.startsWith(todayStr) && t.holati === 'Yangi';
      } else if (activeTab === 'Shoshilinch') {
        try {
          const tTime = new Date(tDate.replace(' ', 'T')).getTime();
          matchesStatus = tTime > now.getTime() && tTime <= twoHoursLater && t.holati === 'Yangi';
        } catch (e) { matchesStatus = false; }
      } else if (activeTab !== 'Barchasi') {
        matchesStatus = t.displayStatus === activeTab;
      }

      const customer = customers.find(c => String(c.id) === String(t.mijoz_id));
      const customerName = customer ? `${customer.ism} ${customer.familiya}`.toLowerCase() : '';
      const term = search.toLowerCase();
      
      const taskText = t.topshiriq ? String(t.topshiriq).toLowerCase() : '';
      const taskId = t.id ? String(t.id).toLowerCase() : '';

      const matchesSearch = taskText.includes(term) || 
                           customerName.includes(term) ||
                           taskId.includes(term);

      return matchesOp && matchesStatus && matchesSearch;
    }).sort((a, b) => (parseInt(String(b.id)) || 0) - (parseInt(String(a.id)) || 0));
  }, [accessibleTasks, customers, opFilter, activeTab, search, todayStr, now]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Yangi': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      case 'Bajarildi': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'Bekor qilindi': return 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-700';
      case 'Bajarilmayapti': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const handleStatusChange = async () => {
    if (!confirmingTaskUpdate) return;
    setIsUpdating(true);
    try {
      const nowTs = new Date().toLocaleString('uz-UZ', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });
      
      // Update the task with the current user's info as the last editor/operator
      await onUpdateTask({ 
        ...confirmingTaskUpdate.task, 
        holati: confirmingTaskUpdate.status,
        operator_id: currentUser.id,
        operator: `${currentUser.name} ${currentUser.surname}`,
        time_data: nowTs 
      });
      setConfirmingTaskUpdate(null);
    } catch (e) {
      alert("Statusni o'zgartirishda xatolik!");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-24 text-left relative">
      
      {/* Notifications Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => { setActiveTab('Bugun'); setIsPultOpen(false); }}
          className={`p-6 rounded-[2.5rem] flex items-center gap-6 transition-all border ${stats.today.length > 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60'}`}
        >
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">📅</div>
          <div className="text-left">
            <h4 className="text-indigo-600 dark:text-indigo-400 font-black uppercase text-[10px] tracking-widest">Mijozlarim topshiriqlari</h4>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mt-1">Bugun bajarish kerak: {stats.today.length} ta</p>
          </div>
        </button>

        <button 
          onClick={() => { setActiveTab('Shoshilinch'); setIsPultOpen(false); }}
          className={`p-6 rounded-[2.5rem] flex items-center gap-6 transition-all border ${stats.urgent.length > 0 ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-indigo-500/20 shadow-lg animate-pulse' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60'}`}
        >
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">⏰</div>
          <div className="text-left">
            <h4 className="text-amber-600 dark:text-amber-400 font-black uppercase text-[10px] tracking-widest">Shoshilinch</h4>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mt-1">Keyingi 2 soatda: {stats.urgent.length} ta</p>
          </div>
        </button>
      </div>

      {/* Clear Search Indicator if filtered from outside */}
      {search && externalSearch === search && (
        <div className="flex justify-between items-center p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Alohida topshiriq ko'rinishida (ID: {search})</p>
          <button 
            onClick={() => { setSearch(''); onClearExternalSearch?.(); }} 
            className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-rose-500"
          >
            Filtrni tozalash
          </button>
        </div>
      )}

      {/* Floating Pult FAB */}
      <button 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => !isDragging.current && setIsPultOpen(true)}
        style={{ position: 'fixed', left: fabPos.x, top: fabPos.y, touchAction: 'none', zIndex: 100 }}
        className="w-20 h-20 bg-slate-900 dark:bg-indigo-600 text-white rounded-full flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-transform group border-4 border-white dark:border-slate-800"
      >
        <span className="text-2xl mb-1 pointer-events-none">🔍</span>
        <span className="text-[10px] font-black uppercase tracking-tighter pointer-events-none">Pult</span>
        {(search || activeTab !== 'Barchasi' || (isAdmin && opFilter !== 'all')) && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-800">!</span>
        )}
      </button>

      {/* Pult Modal */}
      {isPultOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 text-left">
              <div className="p-8 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">📝 Topshiriqlar Pulti</h3>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Filtrlar va Qidiruv</p>
                 </div>
                 <button onClick={() => setIsPultOpen(false)} className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">✕</button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto max-h-[65vh] custom-scrollbar">
                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Vazifa Qidirish</label>
                    <input 
                      type="text" 
                      placeholder="Vazifa ID, matn yoki mijozni qidirish..." 
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 outline-none font-bold text-xs dark:text-white" 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)} 
                      autoFocus 
                    />
                 </div>

                 {isAdmin && (
                   <div className="space-y-3">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Barcha Operatorlar</label>
                      <select 
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 outline-none font-bold text-xs dark:text-white"
                        value={opFilter}
                        onChange={(e) => setOpFilter(e.target.value)}
                      >
                        <option value="all">Barcha Operatorlar</option>
                        {allOperators.map(op => <option key={op.id} value={op.id}>{op.name} {op.surname}</option>)}
                      </select>
                   </div>
                 )}

                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Vazifa Holati</label>
                    <div className="flex flex-wrap gap-2">
                       {['Barchasi', 'Bugun', 'Shoshilinch', 'Yangi', 'Bajarildi', 'Bekor qilindi', 'Bajarilmayapti'].map(tab => (
                         <button 
                           key={tab} 
                           onClick={() => setActiveTab(tab)} 
                           className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${activeTab === tab ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'}`}
                         >
                           {tab}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
                 <button onClick={() => { setSearch(''); setActiveTab('Barchasi'); setOpFilter('all'); onClearExternalSearch?.(); }} className="py-4 text-[10px] font-black uppercase text-slate-400 hover:text-rose-500">Tozalash</button>
                 <button onClick={() => setIsPultOpen(false)} className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl tracking-widest active:scale-95 transition-all">Tasdiqlash 🚀</button>
              </div>
           </div>
        </div>
      )}

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTasks.length > 0 ? filteredTasks.map((task) => {
          const customer = customers.find(c => String(c.id) === String(task.mijoz_id));
          const expired = isExpired(task.topshiriq_vaqti);
          // Operator o'z mijoziga tegishli har qanday topshiriqni boshqara oladi
          const isMyCustomer = customer && String(customer.operator_id) === String(currentUser.id);
          const showActions = (isAdmin || isMyCustomer) && task.holati === 'Yangi' && !expired;

          return (
            <div key={task.id} className={`bg-white dark:bg-slate-800 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all flex flex-col overflow-hidden group animate-in zoom-in-95 ${search === task.id ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-100 dark:border-slate-700'}`}>
               <div className="p-6 pb-4 flex justify-between items-start">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-[10px] font-black shadow-inner group-hover:rotate-12 transition-transform">ID {task.id}</div>
                     <div className="text-left">
                        <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-tighter">{customer ? `${customer.ism} ${customer.familiya}` : "Noma'lum Mijoz"}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{customer?.telefon}</p>
                     </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border ${(task as any).displayStatus === 'Bajarilmayapti' ? getStatusColor('Bajarilmayapti') : getStatusColor(task.holati)}`}>
                    {(task as any).displayStatus}
                  </span>
               </div>

               <div className="px-8 py-6 flex-1 text-left space-y-4">
                  <div className="bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">"{task.topshiriq || 'Matn mavjud emas'}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-left">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Yaratildi:</p>
                       <p className="text-[10px] font-bold text-slate-500">{task.time_data}</p>
                    </div>
                    <div className="text-left">
                       <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${expired ? 'text-rose-400' : 'text-indigo-400'}`}>Muddati:</p>
                       <p className={`text-[10px] font-black ${expired ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-300'}`}>{task.topshiriq_vaqti}</p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-50 dark:border-slate-700 mt-2 space-y-1">
                     <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                       <span className="opacity-50">Yozuvchi:</span> {task.yaratuvchi || task.operator}
                     </p>
                     {task.yaratuvchi && task.operator !== task.yaratuvchi && (
                        <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">
                          <span className="opacity-50">Oxirgi Taxrir:</span> {task.operator}
                        </p>
                     )}
                     {isMyCustomer && !isAdmin && <p className="text-[7px] font-bold text-indigo-500 uppercase mt-1 pt-1">✓ Sizning mijozingiz</p>}
                  </div>
               </div>

               {showActions ? (
                 <div className="p-4 pt-0 grid grid-cols-2 gap-2 mt-auto">
                    <button 
                      onClick={() => setConfirmingTaskUpdate({ task, status: 'Bajarildi' })}
                      className="py-4 bg-emerald-500 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                    >✅ Bajarildi</button>
                    <button 
                      onClick={() => setConfirmingTaskUpdate({ task, status: 'Bekor qilindi' })}
                      className="py-4 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300 rounded-2xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all"
                    >✕ Bekor qilish</button>
                 </div>
               ) : expired && task.holati === 'Yangi' && (
                 <div className="p-4 pt-0 mt-auto">
                    <div className="py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-500 dark:text-rose-400 rounded-2xl text-center text-[9px] font-black uppercase tracking-widest">
                      ⚠️ Muddat tugagan (Bajarilmagan)
                    </div>
                 </div>
               )}
            </div>
          );
        }) : (
          <div className="col-span-full py-20 opacity-20 text-center italic">
             <span className="text-7xl block mb-4">📭</span>
             <p className="font-black uppercase text-[12px] tracking-widest">Mijozlaringizga tegishli topshiriqlar topilmadi</p>
          </div>
        )}
      </div>

      {/* Status Update Confirmation Modal */}
      {confirmingTaskUpdate && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-white/10 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-2xl mx-auto">⚠️</div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Holatni o'zgartirish</h3>
              <p className="text-xs font-bold text-slate-400 mt-2 leading-relaxed">
                Topshiriq holatini <span className={confirmingTaskUpdate.status === 'Bajarildi' ? 'text-emerald-500' : 'text-slate-600'}>"{confirmingTaskUpdate.status}"</span> ga o'zgartirmoqchimisiz?
              </p>
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                 <p className="text-[10px] text-slate-500 italic">"{confirmingTaskUpdate.task.topshiriq}"</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmingTaskUpdate(null)} 
                className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-colors"
              >
                Bekor qilish
              </button>
              <button 
                onClick={handleStatusChange}
                disabled={isUpdating}
                className={`flex-1 py-4 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all active:scale-95 ${confirmingTaskUpdate.status === 'Bajarildi' ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-indigo-600'}`}
              >
                {isUpdating ? "Kutilmoqda..." : "Tasdiqlash 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
