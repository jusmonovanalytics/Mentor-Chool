
import React, { useMemo, useState, useEffect } from 'react';
import { 
  ComposedChart, 
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { Order, User, Customer } from '../types';
import { LocationPicker } from './LocationPicker';

interface DashboardProps {
  orders: Order[];
  customers: Customer[];
  currentUser: User;
  allOperators: User[];
  isDarkMode: boolean;
  onUpdateCustomer?: (customer: Customer) => Promise<void>;
  onStartOrder?: (customer: Customer) => void;
  availableStatuses: string[];
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';

// Yangilangan statuslar
const STATUS_KEYS = ['KUTILMOQDA', 'SHARTNOMA QILDI', 'BEKOR QILINDI'];

const STANDARD_REASONS = [
  "Boshqa o'quv markazni tanladi",
  "Keyinchalik o'qimoqchi",
  "Raqam xato",
  "Adashib so'rov qoldirgan",
  "Narx qimmatlik qildi"
];

export const Dashboard: React.FC<DashboardProps> = ({ orders, customers, currentUser, allOperators, isDarkMode, onStartOrder, onUpdateCustomer, availableStatuses }) => {
  const [filter, setFilter] = useState<DateFilter>('week');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedOpIds, setSelectedOpIds] = useState<Set<string>>(new Set());
  
  // Detail Modal states
  const [detailView, setDetailView] = useState<'sales' | 'orders' | 'avg' | 'products' | 'noOrders' | null>(null);
  const [selectedNoOrderOpId, setSelectedNoOrderOpId] = useState<string | null>(null);

  // Editing state (same as in CustomerManagement)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const isPrivileged = currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin';

  const toggleOperator = (opId: string) => {
    if (!isPrivileged) return;
    const newSet = new Set(selectedOpIds);
    if (newSet.has(opId)) {
      newSet.delete(opId);
    } else {
      newSet.add(opId);
    }
    setSelectedOpIds(newSet);
  };

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 6) setGreeting('Tinch orom oling');
    else if (hour < 11) setGreeting('Xayrli tong');
    else if (hour < 18) setGreeting('Xayrli kun');
    else setGreeting('Xayrli kech');
  }, []);

  const formatMoney = (val: number) => {
    return Math.round(val).toLocaleString('uz-UZ').replace(/,/g, ' ');
  };

  const formatCompactNumber = (val: number) => {
    if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1) + ' mlrd';
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' mln';
    if (val >= 1_000) return (val / 1_000).toFixed(1) + ' ming';
    return val.toLocaleString('uz-UZ').replace(/,/g, ' ');
  };

  const parseOrderDate = (dateStr: any): Date => {
    if (!dateStr) return new Date(0);
    try {
      const cleanStr = String(dateStr).trim();
      const parts = cleanStr.split(/[\s,.]+/);
      if (parts.length >= 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return new Date(cleanStr);
    } catch { return new Date(0); }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
  };

  const handleSaveUpdate = async () => {
    if (!editingCustomer || !onUpdateCustomer) return;
    
    if ((editingCustomer.voronka === 'Otkaz' || editingCustomer.holati === 'Otkaz') && !editingCustomer.otkaz_sababi?.trim()) {
        alert("Iltimos, rad etish sababini tanlang yoki yozing.");
        return;
    }

    setIsSaving(true);
    try {
      await onUpdateCustomer(editingCustomer);
      setEditingCustomer(null);
      alert("Ma'lumotlar saqlandi!");
    } catch (error) { alert("Saqlashda muammo bo'ldi."); }
    finally { setIsSaving(false); }
  };

  const handleAddressPicked = (newAddress: string) => {
    if (editingCustomer) setEditingCustomer({ ...editingCustomer, manzil: newAddress });
  };

  // Helper logic for custom rejection reason
  const getRejectionSelectValue = (currentReason?: string) => {
    if (!currentReason) return "";
    if (STANDARD_REASONS.includes(currentReason)) return currentReason;
    return "Boshqa sabab (izoh)";
  };

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let currentRangeStart = 0;
    const oneDay = 24 * 60 * 60 * 1000;

    if (filter === 'today') currentRangeStart = todayStart;
    else if (filter === 'week') currentRangeStart = now.getTime() - 7 * oneDay;
    else if (filter === 'month') currentRangeStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    else if (filter === 'custom' && startDate) currentRangeStart = new Date(startDate).setHours(0,0,0,0);

    const relevantOrders = orders.filter(o => {
      let opMatch = true;
      if (isPrivileged) {
        if (selectedOpIds.size > 0) opMatch = selectedOpIds.has(String(o.operator_id));
      } else {
        opMatch = String(o.operator_id) === String(currentUser.id);
      }
      if (!opMatch) return false;
      if (statusFilter && (o.holat || 'YANGI').toUpperCase().trim() !== statusFilter) return false;

      const oTime = parseOrderDate(o.sana).getTime();
      if (filter === 'custom') {
        const sTime = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
        const eTime = endDate ? new Date(endDate).setHours(23,59,59,999) : new Date().setHours(23,59,59,999);
        return oTime >= sTime && oTime <= eTime;
      }
      return oTime >= currentRangeStart;
    });

    const totalSales = relevantOrders.reduce((sum, o) => sum + (Number(o.jami_summa) || 0), 0);
    const uniqueOrders = new Set(relevantOrders.map(o => o.id));
    const totalOrdersCount = uniqueOrders.size;
    const uniqueCustomersCount = new Set(relevantOrders.map(o => o.mijoz_id)).size;

    const statusBreakdown: Record<string, { sum: number, count: number }> = {};
    STATUS_KEYS.forEach(key => statusBreakdown[key] = { sum: 0, count: 0 });

    relevantOrders.forEach(o => {
      const s = (o.holat || 'KUTILMOQDA').toUpperCase().trim();
      if (statusBreakdown[s]) {
        statusBreakdown[s].sum += (Number(o.jami_summa) || 0);
      }
    });

    uniqueOrders.forEach(oid => {
        const firstMatch = relevantOrders.find(x => x.id === oid);
        if (firstMatch) {
            const s = (firstMatch.holat || 'KUTILMOQDA').toUpperCase().trim();
            if (statusBreakdown[s]) statusBreakdown[s].count++;
        }
    });

    // Buyurtma bermagan mijozlar tahlili
    const orderedCustomerIds = new Set(orders.map(o => String(o.mijoz_id)));
    
    // Rolga qarab mijozlar bazasini filter qilish
    const accessibleBase = isPrivileged 
      ? customers 
      : customers.filter(c => String(c.operator_id) === String(currentUser.id));

    const nonOrderingCustomers = accessibleBase.filter(c => !orderedCustomerIds.has(String(c.id)));
    
    const nonOrderingByOperator: Record<string, Customer[]> = {};
    nonOrderingCustomers.forEach(c => {
      const opId = String(c.operator_id || '0');
      if (!nonOrderingByOperator[opId]) nonOrderingByOperator[opId] = [];
      nonOrderingByOperator[opId].push(c);
    });

    const productSalesMap: Record<string, { name: string, sum: number, count: number }> = {};
    relevantOrders.forEach(o => {
      if (!productSalesMap[o.tovar]) productSalesMap[o.tovar] = { name: o.tovar, sum: 0, count: 0 };
      productSalesMap[o.tovar].sum += (Number(o.jami_summa) || 0);
      productSalesMap[o.tovar].count += (Number(o.miqdor) || 0);
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.sum - a.sum)
      .slice(0, 5);

    // Yetkazildi degan status yo'q, shartnoma qildi ga almashtiramiz
    const deliveredCount = statusBreakdown['SHARTNOMA QILDI']?.count || 0;
    const efficiencyPercent = totalOrdersCount > 0 ? (deliveredCount / totalOrdersCount) * 100 : 0;
    const avgCheck = totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;

    return { 
      totalSales, 
      totalOrdersCount, 
      uniqueCustomersCount,
      avgCheck, 
      efficiencyPercent,
      statusBreakdown, 
      topProducts,
      nonOrderingCustomers,
      nonOrderingByOperator,
      relevantOrders 
    };
  }, [orders, customers, filter, startDate, endDate, isPrivileged, selectedOpIds, currentUser.id, statusFilter]);

  const rankings = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let currentRangeStart = 0;
    const oneDay = 24 * 60 * 60 * 1000;

    if (filter === 'today') currentRangeStart = todayStart;
    else if (filter === 'week') currentRangeStart = now.getTime() - 7 * oneDay;
    else if (filter === 'month') currentRangeStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    else if (filter === 'custom' && startDate) currentRangeStart = new Date(startDate).setHours(0,0,0,0);

    const timeFilteredOrders = orders.filter(o => {
        const oTime = parseOrderDate(o.sana).getTime();
        if (filter === 'custom') {
            const sTime = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
            const eTime = endDate ? new Date(endDate).setHours(23,59,59,999) : new Date().setHours(23,59,59,999);
            return oTime >= sTime && oTime <= eTime;
        }
        return oTime >= currentRangeStart;
    });

    const salesTotals: Record<string, number> = {};
    const customerCounts: Record<string, number> = {};

    timeFilteredOrders.forEach(o => {
      const opId = String(o.operator_id);
      salesTotals[opId] = (salesTotals[opId] || 0) + (Number(o.jami_summa) || 0);
    });

    customers.forEach(c => {
      if (c.operator_id) {
        customerCounts[String(c.operator_id)] = (customerCounts[String(c.operator_id)] || 0) + 1;
      }
    });

    return allOperators.map(op => ({
      ...op,
      totalSales: salesTotals[String(op.id)] || 0,
      customerCount: customerCounts[String(op.id)] || 0
    })).sort((a, b) => b.totalSales - a.totalSales);
  }, [orders, customers, allOperators, filter, startDate, endDate]);

  // Nofaol mijozlar uchun operatorlarni saralash (eng kopidan kamiga)
  const sortedNoOrderOperators = useMemo(() => {
    return allOperators
      .map(op => ({
        ...op,
        noOrderCount: stats.nonOrderingByOperator[String(op.id)]?.length || 0
      }))
      .sort((a, b) => b.noOrderCount - a.noOrderCount);
  }, [allOperators, stats.nonOrderingByOperator]);

  const chartData = useMemo(() => {
    const tempMap: Record<string, { sales: number; orders: number }> = {};
    stats.relevantOrders.forEach(o => {
      const dateKey = parseOrderDate(o.sana).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
      if (!tempMap[dateKey]) tempMap[dateKey] = { sales: 0, orders: 0 };
      tempMap[dateKey].sales += (Number(o.jami_summa) || 0);
      const orderIdsOnDate = new Set(stats.relevantOrders.filter(x => parseOrderDate(x.sana).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' }) === dateKey).map(x => x.id));
      tempMap[dateKey].orders = orderIdsOnDate.size;
    });
    return Object.entries(tempMap).map(([name, val]) => ({ name, sales: val.sales, orders: val.orders }))
      .sort((a, b) => a.name.localeCompare(b.name)).slice(-31);
  }, [stats.relevantOrders]);

  const getStatusColor = (status: string) => {
    switch(status?.toUpperCase()) {
      case 'SHARTNOMA QILDI': return 'text-emerald-500';
      case 'KUTILMOQDA': return 'text-amber-500';
      case 'BEKOR QILINDI': return 'text-rose-500';
      default: return 'text-indigo-500';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = status?.toUpperCase() || 'YANGI';
    if (s === 'SHARTNOMA QILDI') return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    if (s === 'KUTILMOQDA') return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    if (s === 'BEKOR QILINDI') return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
    return 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-700';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      {/* Header with Filters */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="relative">
               <div className="w-20 h-20 rounded-[2.2rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-2xl">
                 {selectedOpIds.size > 1 ? '👥' : (currentUser.name?.[0] || 'U')}
               </div>
               {(selectedOpIds.size > 0 || statusFilter) && (
                 <button onClick={() => { setSelectedOpIds(new Set()); setStatusFilter(null); }} className="absolute -top-2 -right-2 bg-rose-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-800">✕</button>
               )}
            </div>
            <div className="text-left">
              <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tighter">
                  {selectedOpIds.size > 0 ? `${selectedOpIds.size} ta Operator Guruhi` : 'Global Tahlil'}
                  </h2>
                  {statusFilter && <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-bold rounded-xl uppercase shadow-lg animate-pulse">{statusFilter}</span>}
              </div>
              <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-widest mt-1">
                {greeting}, {currentUser.name}!
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto no-scrollbar">
              {['today', 'week', 'month', 'custom'].map((f) => (
                <button key={f} onClick={() => setFilter(f as DateFilter)} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md' : 'text-slate-400'}`}>
                  {f === 'today' ? 'Bugun' : f === 'week' ? 'Hafta' : f === 'month' ? 'Oy' : 'Oraliq'}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {filter === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-4 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-4 duration-500">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 text-left block">Dan</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold dark:text-white outline-none" />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 text-left block">Gacha</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold dark:text-white outline-none" />
            </div>
          </div>
        )}
      </div>

      {/* Metric Cards (Same as before) ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <div onClick={() => setDetailView('sales')} className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden text-left flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform group">
          <div className="absolute -right-4 -top-4 text-8xl opacity-10 rotate-12 group-hover:rotate-0 transition-transform">💰</div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Jami Savdo</p>
            <h3 className="text-3xl font-bold tracking-tight mt-1">{formatMoney(stats.totalSales)}</h3>
          </div>
          <div className="mt-6 space-y-2">
            {STATUS_KEYS.slice(0, 3).map(key => (
              <div key={key} className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tight opacity-60">
                <span>{key}</span>
                <span className={getStatusColor(key)}>{formatCompactNumber(stats.statusBreakdown[key].sum)}</span>
              </div>
            ))}
          </div>
        </div>

        <div onClick={() => setDetailView('orders')} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl text-left flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform group">
          <div>
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Jami Buyurtmalar</p>
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 text-lg group-hover:rotate-12 transition-transform">📦</div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalOrdersCount} ta</h3>
            <p className="text-[9px] font-semibold text-emerald-500 mt-1 uppercase tracking-widest">{stats.uniqueCustomersCount} mijoz</p>
          </div>
          <div className="mt-6 space-y-2">
            {STATUS_KEYS.slice(0, 3).map(key => (
              <div key={key} className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tight text-slate-400">
                <span>{key}</span>
                <span className="text-slate-900 dark:text-white">{stats.statusBreakdown[key].count} ta</span>
              </div>
            ))}
          </div>
        </div>

        {/* Nofaol mijozlar kartasi (Rolga moslashgan) */}
        <div 
          onClick={() => { 
            setDetailView('noOrders'); 
            // Agar operator bo'lsa, to'g'ridan-to'g'ri o'zini tanlab qo'yamiz
            if (!isPrivileged) setSelectedNoOrderOpId(String(currentUser.id));
            else setSelectedNoOrderOpId(null);
          }} 
          className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl text-left flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform group"
        >
          <div>
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Xarid qilmaganlar</p>
              <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-500 text-lg group-hover:animate-bounce">💤</div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.nonOrderingCustomers.length} ta</h3>
            <p className="text-[9px] font-semibold text-rose-500 mt-1 uppercase tracking-widest">{isPrivileged ? "Global bazadan" : "Sizning bazangizdan"}</p>
          </div>
          <div className="mt-6">
             <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 transition-all duration-1000" style={{width: `${(stats.nonOrderingCustomers.length / (isPrivileged ? customers.length || 1 : customers.filter(c => String(c.operator_id) === String(currentUser.id)).length || 1)) * 100}%`}}></div>
             </div>
             <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">Umumiy bazadan {( (stats.nonOrderingCustomers.length / (customers.length || 1)) * 100 ).toFixed(1)}%</p>
          </div>
        </div>

        <div onClick={() => setDetailView('avg')} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl text-left flex flex-col justify-between relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform group">
           <div>
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">O'rtacha Chek</p>
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 text-lg group-hover:scale-110 transition-transform">🧾</div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{formatMoney(stats.avgCheck)}</h3>
           </div>
           <div className="mt-6">
              <div className="flex justify-between items-end mb-2">
                 <span className="text-[9px] font-bold text-slate-400 uppercase">Samaradorlik</span>
                 <span className="text-xs font-bold text-indigo-500">{stats.efficiencyPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{width: `${stats.efficiencyPercent}%`}}></div>
              </div>
              <div className="mt-4 flex justify-between">
                 <p className="text-[8px] font-bold text-slate-400 uppercase">Trend</p>
                 <p className="text-[10px] font-bold text-emerald-500">📈 +12%</p>
              </div>
           </div>
        </div>

        <div onClick={() => setDetailView('products')} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl text-left flex flex-col cursor-pointer hover:scale-[1.02] transition-transform">
           <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Tovarar</span>
              <span className="text-[10px] font-bold text-indigo-500 uppercase">Top 5</span>
           </div>
           <div className="space-y-4 flex-1">
              {stats.topProducts.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2 overflow-hidden text-left">
                    <div className="w-6 h-6 bg-slate-50 dark:bg-slate-700 rounded-lg flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0">{idx + 1}</div>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate uppercase tracking-tight">{p.name}</p>
                  </div>
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 tracking-tighter shrink-0">{formatCompactNumber(p.sum)}</p>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Main Charts and Ranking (Same as before) ... */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 p-8 lg:p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-xl text-left overflow-hidden">
           <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Savdo Dinamikasi Kesimi</h3>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Sana bo'yicha hajm va miqdor</p>
              </div>
              <p className="text-slate-300 dark:text-slate-600 font-bold text-[8px] uppercase tracking-widest animate-pulse">↔ Chap/O'ngga suring</p>
           </div>
          
          <div className="h-[400px] overflow-x-auto custom-scrollbar">
            <div style={{ minWidth: `${Math.max(600, chartData.length * 60)}px`, height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#F1F5F9"} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} tickFormatter={v => formatCompactNumber(v)} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#10B981', fontSize: 10, fontWeight: 700}} />
                  <Tooltip contentStyle={{borderRadius: '24px', border: 'none', backgroundColor: isDarkMode ? '#1E293B' : '#FFF'}} />
                  <Bar yAxisId="left" dataKey="sales" fill="#6366f1" radius={[12, 12, 0, 0]} barSize={40} />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={4} dot={{r: 6, fill: '#10B981', stroke: isDarkMode ? '#1E293B' : '#FFF', strokeWidth: 3}} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-[#0F172A] p-8 lg:p-10 rounded-[3.5rem] text-white shadow-2xl flex flex-col border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="text-8xl">📊</span>
          </div>
          <div className="flex justify-between items-center mb-8 relative z-10 text-left">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Reyting</h3>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Natijalarni filtrlash uchun bosing</p>
            </div>
            {selectedOpIds.size > 0 && (
                <button onClick={() => setSelectedOpIds(new Set())} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all">Hammasi</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 relative z-10 h-[400px] max-h-[400px]">
            {rankings.map((op, idx) => {
              const isSelected = selectedOpIds.has(String(op.id));
              return (
                <div key={op.id} onClick={() => toggleOperator(String(op.id))} className={`flex items-center justify-between p-4 rounded-3xl transition-all cursor-pointer group ${isSelected ? 'bg-indigo-600 shadow-xl scale-[1.02] border border-white/20' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-colors ${isSelected ? 'bg-white text-indigo-600' : idx === 0 ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>{idx + 1}</div>
                        <div className="min-w-0 text-left">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-100'}`}>{op.name} {op.surname}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-indigo-200' : 'text-indigo-400'}`}>{formatCompactNumber(op.totalSales)}</span>
                              <span className="text-[9px] text-slate-500">•</span>
                              <span className={`text-[9px] font-bold ${isSelected ? 'text-emerald-200' : 'text-emerald-400'}`}>{op.customerCount} mijoz</span>
                          </div>
                        </div>
                    </div>
                    {isSelected && <span className="text-white text-sm">✅</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-6 border-t border-white/5 text-center">
             <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em]">Tepaga yoki pastga suring</p>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL (Same as before) ... */}
      {detailView && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 border border-white/10">
              <div className="p-8 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center text-left">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                      {detailView === 'sales' ? 'Savdo Tahlili' : detailView === 'orders' ? 'Buyurtmalar Tahlili' : detailView === 'products' ? 'Top Mahsulotlar' : detailView === 'noOrders' ? 'Nofaol Mijozlar' : 'O\'rtacha Hisob'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Batafsil ma'lumot</p>
                 </div>
                 <button onClick={() => { setDetailView(null); setSelectedNoOrderOpId(null); }} className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">✕</button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                 {/* SALES VIEW */}
                 {detailView === 'sales' && (
                   <div className="space-y-4 text-left">
                      <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
                         <p className="text-[10px] font-bold uppercase opacity-50 mb-1">Jami Summa</p>
                         <h4 className="text-3xl font-black tracking-tight">{formatMoney(stats.totalSales)}</h4>
                      </div>
                      <div className="space-y-3">
                         {STATUS_KEYS.map(key => (
                           <div key={key} className="flex justify-between items-center p-4 rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600">
                              <span className="text-xs font-bold text-slate-500 uppercase">{key}</span>
                              <span className={`text-sm font-black ${getStatusColor(key)}`}>{formatMoney(stats.statusBreakdown[key].sum)}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}

                 {/* ORDERS VIEW */}
                 {detailView === 'orders' && (
                   <div className="space-y-4 text-left">
                      <div className="p-6 bg-white dark:bg-slate-700 rounded-[2rem] border border-slate-100 dark:border-slate-600 shadow-sm">
                         <div className="flex justify-between items-center">
                            <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jami Buyurtmalar</p>
                               <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.totalOrdersCount}</h4>
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mijozlar</p>
                               <h4 className="text-xl font-black text-indigo-500">{stats.uniqueCustomersCount}</h4>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-3">
                         {STATUS_KEYS.map(key => (
                           <div key={key} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                              <span className="text-xs font-bold text-slate-500 uppercase">{key}</span>
                              <span className={`text-sm font-black ${getStatusColor(key)}`}>{stats.statusBreakdown[key].count} ta</span>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}

                 {/* AVERAGE CHECK VIEW */}
                 {detailView === 'avg' && (
                   <div className="space-y-6 text-left">
                      <div className="p-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                         <div className="relative z-10">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">O'rtacha Chek</p>
                            <h4 className="text-4xl font-black tracking-tight mt-2">{formatMoney(stats.avgCheck)}</h4>
                         </div>
                         <div className="absolute -right-6 -bottom-6 text-9xl opacity-20 rotate-12">🧾</div>
                      </div>

                      <div className="p-6 bg-white dark:bg-slate-700 rounded-[2rem] border border-slate-100 dark:border-slate-600">
                         <div className="flex justify-between items-end mb-4">
                            <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Samaradorlik</p>
                               <p className="text-xs text-slate-500 mt-1">(Shartnoma / Jami)</p>
                            </div>
                            <span className="text-2xl font-black text-indigo-500">{stats.efficiencyPercent.toFixed(1)}%</span>
                         </div>
                         <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{width: `${stats.efficiencyPercent}%`}}></div>
                         </div>
                      </div>
                   </div>
                 )}

                 {/* NOFAOL MIJOZLAR SECTION */}
                 {detailView === 'noOrders' && (
                   <div className="space-y-4 text-left">
                      {isPrivileged && !selectedNoOrderOpId ? (
                        <div className="space-y-3">
                          {sortedNoOrderOperators.map(op => (
                              <div key={op.id} onClick={() => setSelectedNoOrderOpId(String(op.id))} className="flex justify-between items-center p-5 rounded-3xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 cursor-pointer hover:shadow-lg hover:border-indigo-400 transition-all group">
                                <div className="flex items-center gap-4 text-left">
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-sm group-hover:bg-rose-500 group-hover:text-white transition-colors">{op.name[0]}</div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{op.name} {op.surname}</p>
                                    <p className="text-[9px] font-bold text-slate-400">Lavozim: {op.role}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-black text-rose-500">{op.noOrderCount} ta</span>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Mijoz</p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6 text-left">
                          <div className="flex items-center justify-between">
                             {isPrivileged && (
                               <button onClick={() => setSelectedNoOrderOpId(null)} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">← Operatorlarga qaytish</button>
                             )}
                             <p className="text-[10px] font-bold text-slate-400 uppercase">
                               Operator: {allOperators.find(o => String(o.id) === (selectedNoOrderOpId || String(currentUser.id)))?.name}
                             </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                            {(stats.nonOrderingByOperator[selectedNoOrderOpId || String(currentUser.id)] || []).map(c => (
                              <div key={c.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all flex flex-col overflow-hidden border-b-4 border-b-rose-400/20 text-left">
                                <div className="p-6 pb-4 flex items-start justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-xl shadow-inner">👤</div>
                                    <div>
                                      <h4 className="font-black text-slate-900 dark:text-white text-sm leading-tight uppercase tracking-tight">{c.ism} {c.familiya}</h4>
                                      <p className="text-[10px] text-slate-400 font-black mt-0.5 tracking-widest">{c.telefon}</p>
                                    </div>
                                  </div>
                                  <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border ${getStatusBadgeStyle(c.holati)}`}>
                                    {c.holati || 'Yangi'}
                                  </span>
                                </div>
                                <div className="px-6 py-4 space-y-4 flex-1">
                                   <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-4 border border-slate-50 dark:border-slate-800">
                                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Izoh:</p>
                                     <p className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-3">
                                       {c.izoh ? `"${c.izoh}"` : "Hali izoh kiritilmagan..."}
                                     </p>
                                   </div>
                                </div>
                                <div className="p-6 pt-2 space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleCall(c.telefon)} className="py-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 active:scale-95"><span>📞</span> Aloqa</button>
                                    <button onClick={() => setEditingCustomer({...c})} className="py-4 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-100 dark:border-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 active:scale-95"><span>✏️</span> Taxrir</button>
                                  </div>
                                  <button onClick={() => onStartOrder?.(c)} className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"><span>🛒</span> Buyurtma</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                   </div>
                 )}

                 {/* PRODUCTS VIEW */}
                 {detailView === 'products' && (
                   <div className="space-y-4">
                      {stats.topProducts.map((p, idx) => (
                        <div key={p.name} className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-2xl border border-slate-100 dark:border-slate-600">
                          <div className="flex items-center gap-3 overflow-hidden text-left">
                            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400 shrink-0">{idx + 1}</div>
                            <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate">{p.name}</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase">{p.count} ta sotilgan</p>
                            </div>
                          </div>
                          <p className="text-sm font-black text-emerald-500 tracking-tighter shrink-0">{formatCompactNumber(p.sum)}</p>
                        </div>
                      ))}
                   </div>
                 )}
              </div>

              <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
                 <button onClick={() => { setDetailView(null); setSelectedNoOrderOpId(null); }} className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Yopish</button>
              </div>
           </div>
        </div>
      )}

      {/* Customer Edit Modal (Integrated from CustomerManagement) */}
      {editingCustomer && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-white/10 custom-scrollbar text-left relative">
             <button 
                onClick={() => setEditingCustomer(null)} 
                className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
             >✕</button>

             <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Tahrirlash</h3>
                <p className="text-indigo-500 font-bold text-xs uppercase tracking-widest mt-1">Mijoz ID: {editingCustomer.id}</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status */}
                <div className="col-span-full bg-indigo-50/50 dark:bg-indigo-500/10 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-500/20">
                   <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3 block">Voronka Statusi</label>
                   <div className="flex flex-wrap gap-2">
                     {availableStatuses.map(status => (
                       <button
                         key={status}
                         onClick={() => {
                             const isOtkaz = status === 'Otkaz';
                             setEditingCustomer({
                                 ...editingCustomer, 
                                 voronka: status, 
                                 holati: status,
                                 otkaz_sababi: isOtkaz ? (editingCustomer.otkaz_sababi || '') : ''
                             });
                         }}
                         className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase border transition-all ${
                           (editingCustomer.voronka || editingCustomer.holati) === status 
                             ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105' 
                             : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-indigo-300'
                         }`}
                       >{status}</button>
                     ))}
                   </div>

                   {/* Otkaz Sababi Dropdown */}
                   {((editingCustomer.voronka === 'Otkaz' || editingCustomer.holati === 'Otkaz')) && (
                      <div className="mt-4 animate-in slide-in-from-top-2">
                          <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2 block ml-2">Rad etish sababi</label>
                          <select 
                              className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 text-xs font-bold outline-none dark:text-white"
                              value={getRejectionSelectValue(editingCustomer.otkaz_sababi)}
                              onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "Boshqa sabab (izoh)") {
                                      setEditingCustomer({...editingCustomer, otkaz_sababi: " "});
                                  } else {
                                      setEditingCustomer({...editingCustomer, otkaz_sababi: val});
                                  }
                              }}
                          >
                              <option value="">Tanlang...</option>
                              {STANDARD_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                              <option value="Boshqa sabab (izoh)">Boshqa sabab (izoh)</option>
                          </select>
                          
                          {getRejectionSelectValue(editingCustomer.otkaz_sababi) === "Boshqa sabab (izoh)" && (
                              <input 
                                  type="text"
                                  placeholder="Sababni yozing..."
                                  className="w-full mt-2 px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white focus:border-indigo-500 transition-colors"
                                  value={editingCustomer.otkaz_sababi === " " ? "" : editingCustomer.otkaz_sababi}
                                  onChange={(e) => setEditingCustomer({...editingCustomer, otkaz_sababi: e.target.value})}
                                  autoFocus
                              />
                          )}
                      </div>
                   )}
                </div>

                {/* Left Column */}
                <div className="space-y-4">
                   <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">Shaxsiy Ma'lumotlar</h4>
                   
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Ism</label>
                     <input type="text" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.ism || ''} onChange={(e) => setEditingCustomer({...editingCustomer, ism: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Familiya</label>
                     <input type="text" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.familiya || ''} onChange={(e) => setEditingCustomer({...editingCustomer, familiya: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Telefon</label>
                     <input type="text" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.telefon || ''} onChange={(e) => setEditingCustomer({...editingCustomer, telefon: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Qo'shimcha Telefon</label>
                     <input type="text" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.qoshimcha_telefon || ''} onChange={(e) => setEditingCustomer({...editingCustomer, qoshimcha_telefon: e.target.value})} placeholder="+998..." />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Yosh</label>
                     <input type="text" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.mijoz_yoshi || ''} onChange={(e) => setEditingCustomer({...editingCustomer, mijoz_yoshi: e.target.value})} />
                   </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                   <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">Qiziqish va Manba</h4>
                   
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Lead Manbasi</label>
                     <select 
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" 
                        value={editingCustomer.lead_manbasi || ''} 
                        onChange={(e) => setEditingCustomer({...editingCustomer, lead_manbasi: e.target.value})}
                     >
                        <option value="">Tanlang...</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Telegram">Telegram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Tavsiya">Tavsiya</option>
                        <option value="Boshqa">Boshqa</option>
                     </select>
                   </div>
                   
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Social URL</label>
                     <input type="text" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.social_url || ''} onChange={(e) => setEditingCustomer({...editingCustomer, social_url: e.target.value})} placeholder="https://..." />
                   </div>

                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Qiziqgan Kursi</label>
                     <input 
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" 
                        value={editingCustomer.qiziqgan_kurs || ''} 
                        onChange={(e) => setEditingCustomer({...editingCustomer, qiziqgan_kurs: e.target.value})}
                     />
                   </div>

                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Ta'lim Turi</label>
                     <select 
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" 
                        value={editingCustomer.talim_turi || ''} 
                        onChange={(e) => setEditingCustomer({...editingCustomer, talim_turi: e.target.value})}
                     >
                        <option value="">Tanlang...</option>
                        <option value="kunduzgi">Kunduzgi</option>
                        <option value="kechgi">Kechgi</option>
                     </select>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Maqsad</label>
                      <textarea className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white resize-none h-20" value={editingCustomer.maqsad || ''} onChange={(e) => setEditingCustomer({...editingCustomer, maqsad: e.target.value})} />
                   </div>
                </div>

                {/* Bottom Section */}
                <div className="col-span-full space-y-4">
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Manzil</label>
                     <div className="relative">
                         <input type="text" className="w-full pl-5 pr-12 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.manzil || ''} onChange={(e) => setEditingCustomer({...editingCustomer, manzil: e.target.value})} />
                         <button onClick={() => setIsMapPickerOpen(true)} className="absolute right-1 top-1 bottom-1 aspect-square bg-white dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 flex items-center justify-center">📍</button>
                     </div>
                   </div>
                   
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Umumiy Izoh</label>
                     <textarea className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none min-h-[80px] dark:text-white" value={editingCustomer.izoh || ''} onChange={(e) => setEditingCustomer({...editingCustomer, izoh: e.target.value})} />
                   </div>
                </div>
             </div>

             <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-4">
                <button onClick={() => setEditingCustomer(null)} className="flex-1 py-5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Bekor qilish</button>
                <button onClick={handleSaveUpdate} disabled={isSaving} className="flex-1 bg-slate-900 dark:bg-indigo-600 text-white py-5 rounded-3xl font-black text-[10px] uppercase shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20 transition-all active:scale-95">
                  {isSaving ? "Saqlanmoqda..." : "Saqlash 🚀"}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Location Picker Integration */}
      <LocationPicker isOpen={isMapPickerOpen} onClose={() => setIsMapPickerOpen(false)} onConfirm={handleAddressPicked} initialAddress={editingCustomer?.manzil} />
    </div>
  );
};
