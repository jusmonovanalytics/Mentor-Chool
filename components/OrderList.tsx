
import React, { useState, useMemo, useRef } from 'react';
import { Order, User, Customer } from '../types';

interface Props {
  orders: Order[];
  operators: User[];
  customers: Customer[];
  currentUser: User;
  onUpdateStatus?: (orders: Order[], newStatus: string) => Promise<void>;
}

// Yangilangan statuslar
const ORDER_STATUSES = [
  'Kutilmoqda',
  'Shartnoma qildi',
  'Bekor qilindi'
];

export const OrderList: React.FC<Props> = ({ orders, operators, customers, currentUser, onUpdateStatus }) => {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState<number>(100);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeStatus, setActiveStatus] = useState<string>('Barchasi');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUrgentDetails, setShowUrgentDetails] = useState(false);
  
  // Modal states
  const [isQuickFilterOpen, setIsQuickFilterOpen] = useState(false);
  const [viewingFullDetails, setViewingFullDetails] = useState<Order[] | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState<string | null>(null);

  // Draggable FAB Logic
  const [fabPos, setFabPos] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 150 });
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

  const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin';

  const formatFullNumber = (val: number) => {
    return val.toLocaleString('uz-UZ').replace(/,/g, ' ');
  };

  const parseOrderDate = (dateStr: string): number => {
    if (!dateStr) return 0;
    try {
      const parts = dateStr.split(/[\s,.]+/);
      if (parts.length >= 3) {
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        return d.getTime();
      }
      return new Date(dateStr).getTime();
    } catch {
      return 0;
    }
  };

  const normalizeStatus = (status: string) => (status || 'Kutilmoqda').toUpperCase().trim();

  // Shoshilinch buyurtmalarni hisoblash (2 kun qolgan va shartnoma qilinmagan)
  const urgentOrders = useMemo(() => {
    const now = new Date();
    // Bugungi kun boshiga o'tamiz (vaqtni hisobga olmaslik uchun)
    now.setHours(0, 0, 0, 0);
    
    // 2 kun keyingi sana
    const twoDaysLater = new Date(now);
    twoDaysLater.setDate(now.getDate() + 2);
    twoDaysLater.setHours(23, 59, 59, 999);

    return orders.filter(o => {
        // Rolga qarab filtrlash
        if (currentUser.role === 'Operator' && String(o.operator_id) !== String(currentUser.id)) {
            return false;
        }

        const status = normalizeStatus(o.holat);
        // Faqat hali hal bo'lmaganlar (Shartnoma qilmagan va Bekor qilinmagan)
        if (status === 'SHARTNOMA QILDI' || status === 'BEKOR QILINDI') return false;

        // Sana mavjudligini tekshirish
        if (!o.kurs_boshlash_vaqti) return false;

        const startDate = new Date(o.kurs_boshlash_vaqti);
        if (isNaN(startDate.getTime())) return false;

        // Agar kurs boshlanish vaqti o'tib ketgan bo'lsa yoki 2 kun ichida bo'lsa
        return startDate <= twoDaysLater;
    }).sort((a, b) => new Date(a.kurs_boshlash_vaqti).getTime() - new Date(b.kurs_boshlash_vaqti).getTime());
  }, [orders, currentUser]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { Barchasi: 0 };
    ORDER_STATUSES.forEach(s => counts[s.toUpperCase()] = 0);

    let baseOrders = orders;
    if (currentUser.role === 'Operator') {
      baseOrders = orders.filter(o => String(o.operator_id) === String(currentUser.id));
    }

    const orderGroups: Record<string, string> = {};
    baseOrders.forEach(o => {
      if (!orderGroups[o.id]) {
        orderGroups[o.id] = normalizeStatus(o.holat);
      }
    });

    Object.values(orderGroups).forEach(status => {
      counts[status] = (counts[status] || 0) + 1;
      counts['Barchasi']++;
    });

    return counts;
  }, [orders, currentUser]);

  const processedOrders = useMemo(() => {
    let baseFiltered = orders;
    if (currentUser.role === 'Operator') {
      baseFiltered = orders.filter(o => String(o.operator_id) === String(currentUser.id));
    }

    const groups: Record<string, Order[]> = {};
    baseFiltered.forEach(order => {
      const id = order.id || 'Noma\'lum';
      if (!groups[id]) groups[id] = [];
      groups[id].push(order);
    });

    let groupedArray = Object.values(groups);

    return groupedArray.filter(group => {
      const first = group[0];
      const statusMatch = activeStatus === 'Barchasi' || normalizeStatus(first.holat) === normalizeStatus(activeStatus);
      
      if (!statusMatch) return false;

      if (startDate || endDate) {
        const oTime = parseOrderDate(first.sana);
        if (startDate && oTime < new Date(startDate).setHours(0,0,0,0)) return false;
        if (endDate && oTime > new Date(endDate).setHours(23,59,59,999)) return false;
      }

      if (search) {
        const term = search.toLowerCase();
        const matchesId = first.id.toLowerCase().includes(term);
        const matchesName = `${first.mijoz_ism} ${first.mijoz_familya}`.toLowerCase().includes(term);
        const matchesProduct = group.some(item => item.tovar.toLowerCase().includes(term));
        if (!matchesId && !matchesName && !matchesProduct) return false;
      }

      return true;
    }).sort((a, b) => (parseInt(b[0]?.id) || 0) - (parseInt(a[0]?.id) || 0)).slice(0, limit);
  }, [orders, currentUser, search, startDate, endDate, limit, activeStatus]);

  const getStatusColor = (status: string) => {
    const s = normalizeStatus(status);
    switch (s) {
      case 'KUTILMOQDA': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'SHARTNOMA QILDI': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'BEKOR QILINDI': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      default: return 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600';
    }
  };

  const handleStatusChange = async () => {
    if (!viewingFullDetails || !onUpdateStatus || !confirmingStatus) return;
    setIsUpdating(true);
    try {
      await onUpdateStatus(viewingFullDetails, confirmingStatus);
      setViewingFullDetails(null);
      setConfirmingStatus(null);
    } catch(e) {
      alert("Xatolik yuz berdi");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCall = (phone: string) => {
    if (!phone) return;
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
  };

  const getOperatorName = (id: string) => {
     const op = operators.find(o => String(o.id) === String(id));
     return op ? `${op.name} ${op.surname}` : `ID: ${id}`;
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-24 relative">
      
      {/* Urgent Orders Notification Banner */}
      {urgentOrders.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 p-6 rounded-r-[2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
           <div>
              <div className="flex items-center gap-2">
                 <span className="text-xl animate-pulse">🔥</span>
                 <h3 className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide">Diqqat: Shoshilinch Buyurtmalar!</h3>
              </div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                 {urgentOrders.length} ta buyurtmaning kursi boshlanishiga 2 kundan kam vaqt qoldi va hali shartnoma qilinmagan.
              </p>
           </div>
           <button 
             onClick={() => setShowUrgentDetails(!showUrgentDetails)}
             className="px-6 py-3 bg-white dark:bg-slate-800 text-rose-500 border border-rose-100 dark:border-rose-500/30 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm whitespace-nowrap"
           >
             {showUrgentDetails ? "Yopish" : "Ro'yxatni ko'rish"}
           </button>
        </div>
      )}

      {/* Urgent Orders List (Toggleable) */}
      {showUrgentDetails && urgentOrders.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
            {urgentOrders.map(order => (
               <div key={order.id} onClick={() => setViewingFullDetails([order])} className="bg-white dark:bg-slate-800 p-4 rounded-[1.5rem] border border-rose-100 dark:border-rose-500/20 shadow-md cursor-pointer hover:shadow-xl transition-all group flex items-center justify-between">
                  <div className="min-w-0">
                     <p className="text-[9px] font-bold text-slate-400 uppercase">Mijoz</p>
                     <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{order.mijoz_ism} {order.mijoz_familya}</h4>
                     <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-bold text-rose-500 uppercase px-1.5 py-0.5 bg-rose-50 dark:bg-rose-500/10 rounded">⏳ {order.kurs_boshlash_vaqti}</span>
                        <span className="text-[8px] font-bold text-slate-400">#{order.id}</span>
                     </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 text-lg group-hover:scale-110 transition-transform">
                     ➜
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* Draggable FAB for Filtering */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => { isDragging.current = false; }}
        onClick={() => !isDragging.current && setIsQuickFilterOpen(true)}
        style={{ left: fabPos.x, top: fabPos.y, touchAction: 'none' }}
        className="fixed z-[250] w-16 h-16 bg-slate-900 dark:bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white dark:border-slate-800 transition-transform active:scale-90 cursor-grab active:cursor-grabbing"
      >
        <span className="text-2xl">📋</span>
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-[8px] font-black text-white">F</span>
      </div>

      {/* COMPACT HEADER */}
      <div className="bg-white dark:bg-slate-800 p-6 lg:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl flex flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Jurnal</h2>
          <p className="text-slate-400 font-bold text-[8px] uppercase tracking-[0.2em]">Monitoring</p>
        </div>
        
        {/* Active Filters Indicators */}
        <div className="flex gap-2">
            {activeStatus !== 'Barchasi' && (
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-black rounded-lg uppercase border border-indigo-100 dark:border-indigo-500/20">
                    {activeStatus}
                </span>
            )}
            {(startDate || endDate) && (
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black rounded-lg uppercase border border-amber-100 dark:border-amber-500/20">
                    Sana 📅
                </span>
            )}
        </div>
      </div>

      {/* Orders Grid */}
      {processedOrders.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {processedOrders.map((group) => {
            const first = group[0];
            const totalSum = group.reduce((sum, o) => sum + (Number(o.jami_summa) || 0), 0);
            
            return (
              <div 
                key={first.id} 
                onClick={() => setViewingFullDetails(group)}
                className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col group overflow-hidden border-b-4 hover:border-b-indigo-500 animate-in zoom-in-95 duration-300"
                style={{ borderBottomColor: normalizeStatus(first.holat) === 'SHARTNOMA QILDI' ? '#10B981' : undefined }}
              >
                <div className="p-5 space-y-3 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="w-8 h-8 bg-slate-900 dark:bg-slate-700 rounded-lg flex items-center justify-center text-white font-black text-[10px]">
                      #{first.id}
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[6px] font-black uppercase tracking-widest border ${getStatusColor(first.holat)}`}>
                      {first.holat || 'KUTILMOQDA'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-[11px] truncate uppercase tracking-tighter">{first.mijoz_ism} {first.mijoz_familya}</h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">📅 {first.sana.split(' ')[0]}</p>
                  </div>
                </div>

                <div className="bg-slate-900 dark:bg-slate-950 p-3 text-right">
                   <h4 className="text-sm font-black text-white tracking-tighter">{formatFullNumber(totalSum)}</h4>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-800 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-slate-700 opacity-50">
           <span className="text-7xl mb-6">📭</span>
           <p className="font-black uppercase tracking-[0.3em] text-[11px] text-slate-400 text-center">Ma'lumot topilmadi...</p>
        </div>
      )}

      {/* QUICK FILTER MODAL (THE PULT) */}
      {isQuickFilterOpen && (
        <div className="fixed inset-0 z-[350] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-20 duration-500 border border-white/10">
              <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8"></div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6">Jurnal Pulti</h3>
              
              <div className="space-y-6 pb-6 overflow-y-auto max-h-[60vh] no-scrollbar">
                {/* Search */}
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Qidiruv</p>
                    <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
                        <input 
                            type="text" 
                            placeholder="Mijoz yoki ID..."
                            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 outline-none font-bold text-xs dark:text-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Status Tabs */}
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Holat bo'yicha</p>
                    <div className="flex flex-wrap gap-2">
                        {['Barchasi', ...ORDER_STATUSES].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveStatus(tab)}
                                className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${
                                    activeStatus === tab 
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'
                                }`}
                            >
                                {tab} ({statusCounts[tab === 'Barchasi' ? 'Barchasi' : tab.toUpperCase()] || 0})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Filters */}
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Sana oralig'i</p>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 font-bold text-[10px] dark:text-white outline-none" />
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 font-bold text-[10px] dark:text-white outline-none" />
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                  <button onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setActiveStatus('Barchasi'); }} className="py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Tozalash</button>
                  <button onClick={() => setIsQuickFilterOpen(false)} className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Tayyor 🚀</button>
              </div>
           </div>
        </div>
      )}

      {/* Order Detail Modal - Redesigned */}
      {viewingFullDetails && (() => {
          const currentOrder = viewingFullDetails[0];
          // Find customer from full database using mijoz_id
          const linkedCustomer = customers.find(c => String(c.id) === String(currentOrder.mijoz_id));
          
          return (
        <div className="fixed inset-0 z-[360] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 border border-white/10 relative">
            
            {/* Header */}
            <div className="p-6 lg:p-8 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
               <div className="flex items-center gap-4">
                   <div className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg">
                      ID #{currentOrder.id}
                   </div>
                   <span className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusColor(currentOrder.holat)}`}>
                      {currentOrder.holat || 'KUTILMOQDA'}
                   </span>
               </div>
               <button onClick={() => setViewingFullDetails(null)} className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar space-y-6">
               
               {/* Customer & Course Start Date Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Card */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                     <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner">👤</div>
                     <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mijoz</p>
                        {linkedCustomer ? (
                            <>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">
                                    {linkedCustomer.ism} {linkedCustomer.familiya}
                                </h4>
                                <div className="flex flex-col gap-1 mt-1">
                                    <button 
                                        onClick={() => handleCall(linkedCustomer.telefon)}
                                        className="text-[10px] font-bold text-indigo-500 hover:underline text-left"
                                    >
                                        📞 {linkedCustomer.telefon}
                                    </button>
                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                                        📍 {linkedCustomer.manzil || "Manzil yo'q"}
                                    </p>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        Holati: {linkedCustomer.voronka || linkedCustomer.holati || 'Yangi'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">
                                    {currentOrder.mijoz_ism} {currentOrder.mijoz_familya}
                                </h4>
                                <div className="flex gap-2 mt-1">
                                    <button 
                                        onClick={() => handleCall(currentOrder.mijoz_tel_nomer)}
                                        className="text-[10px] font-bold text-indigo-500 hover:underline"
                                    >
                                        {currentOrder.mijoz_tel_nomer}
                                    </button>
                                </div>
                                <p className="text-[9px] text-rose-400 font-bold mt-1">
                                    (Bazada topilmadi)
                                </p>
                            </>
                        )}
                     </div>
                  </div>

                  {/* Course Start Date Card */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                     <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner">📅</div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kurs Boshlanishi</p>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                            {currentOrder.kurs_boshlash_vaqti ? currentOrder.kurs_boshlash_vaqti.split('T')[0] : "Belgilanmagan"}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 mt-1">Rejalashtirilgan</p>
                     </div>
                  </div>
               </div>

               {/* Course Details (Main Details from currentOrder) */}
               <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kurs Tafsilotlari</h4>
                  </div>
                  
                  <div className="p-6 space-y-4">
                        {/* Header: Course Name & Price */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{currentOrder.tovar}</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{currentOrder.tovar_birlik}</p>
                            </div>
                            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{formatFullNumber(currentOrder.jami_summa)}</span>
                        </div>

                        {/* Info Grid: Who took it and when */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Buyurtma Oldi</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-white dark:bg-slate-700 rounded-md flex items-center justify-center text-[8px] font-bold">👮‍♂️</div>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase truncate">
                                        {/* Use history[0] operator or current order operator if no history */}
                                        {getOperatorName(currentOrder.history?.[0]?.operator_id || currentOrder.operator_id)}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Qabul Qilindi</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-white dark:bg-slate-700 rounded-md flex items-center justify-center text-[8px] font-bold">🕒</div>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                                        {/* Use history[0] date or current date */}
                                        {currentOrder.history?.[0]?.date || currentOrder.sana}
                                    </p>
                                </div>
                            </div>
                        </div>
                  </div>
               </div>

               {/* Admin Actions */}
               {isAdmin && (
                 <div className="bg-indigo-50/50 dark:bg-indigo-500/5 p-6 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-500/20">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 ml-2">Holatni o'zgartirish</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                       {ORDER_STATUSES.map(status => (
                         <button
                           key={status}
                           disabled={isUpdating}
                           onClick={() => setConfirmingStatus(status)}
                           className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-tight transition-all border ${
                             normalizeStatus(currentOrder.holat) === normalizeStatus(status)
                             ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                             : 'bg-white dark:bg-slate-700 text-slate-400 border-slate-100 dark:border-slate-600 hover:border-indigo-300'
                           }`}
                         >
                           {status}
                         </button>
                       ))}
                    </div>
                 </div>
               )}
            </div>

            {/* Footer Total */}
            <div className="p-8 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jami to'lov</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {formatFullNumber(viewingFullDetails.reduce((s, o) => s + Number(o.jami_summa), 0))}
                  </h3>
                </div>
                <button onClick={() => setViewingFullDetails(null)} className="px-10 py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95">Yopish</button>
            </div>
          </div>
        </div>
      );
      })()}

      {/* Confirmation Modal for Status Change */}
      {confirmingStatus && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-white/10 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-2xl mx-auto">⚠️</div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Holatni o'zgartirish</h3>
              <p className="text-xs font-bold text-slate-400 mt-2">
                Haqiqatan ham buyurtma holatini <span className="text-indigo-600 dark:text-indigo-400">"{confirmingStatus}"</span> ga o'zgartirmoqchimisiz?
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmingStatus(null)} 
                className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-colors"
              >
                Bekor qilish
              </button>
              <button 
                onClick={handleStatusChange}
                disabled={isUpdating}
                className="flex-1 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all active:scale-95"
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
