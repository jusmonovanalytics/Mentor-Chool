
import React, { useState, useMemo } from 'react';
import { Customer, Product, Order, User, CustomerTask } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { LocationPicker } from './LocationPicker';

const iconPerson = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface Props {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  operators: User[];
  currentUser: User;
  customerTasks: CustomerTask[];
  onStartOrder: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onAddTask: (task: CustomerTask) => Promise<void>;
  onNavigateToTask?: (taskId: string) => void;
  availableStatuses: string[];
  setAvailableStatuses: (statuses: string[]) => void;
}

const STANDARD_REASONS = [
  "Boshqa o'quv markazni tanladi",
  "Keyinchalik o'qimoqchi",
  "Raqam xato",
  "Adashib so'rov qoldirgan",
  "Narx qimmatlik qildi"
];

export const CustomerManagement: React.FC<Props> = ({ 
  customers, 
  products, 
  orders, 
  operators, 
  currentUser, 
  customerTasks,
  onStartOrder, 
  onUpdateCustomer, 
  onAddTask,
  onNavigateToTask,
  availableStatuses,
  setAvailableStatuses
}) => {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingOrders, setViewingOrders] = useState<Customer | null>(null);
  const [viewingTasks, setViewingTasks] = useState<Customer | null>(null);
  
  const [viewingLocation, setViewingLocation] = useState<{lat: number, lng: number, title: string} | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('Barchasi');

  // New status creation
  const [newStatusName, setNewStatusName] = useState('');
  const [isAddingStatus, setIsAddingStatus] = useState(false);

  // New task form state
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');

  const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin';

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
  };

  const handleViewLocation = async (address: string, title: string) => {
    if (!address) return;
    const linkMatch = address.match(/q=([0-9\.]+),([0-9\.]+)/);
    if (linkMatch) {
        setViewingLocation({ lat: parseFloat(linkMatch[1]), lng: parseFloat(linkMatch[2]), title });
        return;
    }
    const rawMatch = address.match(/([0-9]{2}\.[0-9]+),\s*([0-9]{2}\.[0-9]+)/);
    if (rawMatch) {
         setViewingLocation({ lat: parseFloat(rawMatch[1]), lng: parseFloat(rawMatch[2]), title });
        return;
    }
    try {
        const query = address.split('(')[0].trim();
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data && data.length > 0) {
             setViewingLocation({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), title });
        } else {
            alert("Manzil xaritadan topilmadi.");
        }
    } catch (e) { alert("Xarita xizmatida xatolik."); }
  };

  const handleSaveUpdate = async () => {
    if (!editingCustomer) return;
    
    // Otkaz sababi validatsiyasi
    if ((editingCustomer.voronka === 'Otkaz' || editingCustomer.holati === 'Otkaz') && !editingCustomer.otkaz_sababi?.trim()) {
        alert("Iltimos, rad etish sababini tanlang yoki yozing.");
        return;
    }

    setIsSaving(true);
    try {
      await onUpdateCustomer(editingCustomer);
      setEditingCustomer(null);
      alert("Mijoz ma'lumotlari yangilandi!");
    } catch (error) { alert("Saqlashda muammo bo'ldi."); }
    finally { setIsSaving(false); }
  };

  const handleSaveTask = async () => {
    if (!viewingTasks || !newTaskText || !newTaskTime) {
      alert("Topshiriq matni va vaqtini kiriting.");
      return;
    }
    setIsSavingTask(true);
    try {
      const now = new Date();
      const timeData = now.toLocaleString('uz-UZ', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });

      const numericIds = customerTasks.map(t => parseInt(String(t.id))).filter(id => !isNaN(id));
      const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
      const nextId = (maxId + 1).toString();

      const task: CustomerTask = {
        id: nextId,
        mijoz_id: viewingTasks.id,
        time_data: timeData,
        operator_id: currentUser.id,
        operator: `${currentUser.name} ${currentUser.surname}`,
        yaratuvchi_id: currentUser.id,
        yaratuvchi: `${currentUser.name} ${currentUser.surname}`,
        topshiriq: newTaskText,
        topshiriq_vaqti: newTaskTime.replace('T', ' '),
        holati: 'Yangi'
      };

      await onAddTask(task);
      setNewTaskText('');
      setNewTaskTime('');
      setViewingTasks(null);
      alert("Topshiriq muvaffaqiyatli saqlandi!");
    } catch (e) {
      alert("Xatolik: Topshiriq saqlanmadi.");
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleAddressPicked = (newAddress: string) => {
      if (editingCustomer) setEditingCustomer({ ...editingCustomer, manzil: newAddress });
  };

  // Add new status logic
  const handleAddStatus = () => {
    if (!newStatusName.trim()) return;
    if (availableStatuses.includes(newStatusName.trim())) {
      alert("Bu status allaqachon mavjud.");
      return;
    }
    setAvailableStatuses([...availableStatuses, newStatusName.trim()]);
    setNewStatusName('');
    setIsAddingStatus(false);
  };

  const handleDeleteStatus = (status: string) => {
    if (confirm(`"${status}" statusini o'chirishni tasdiqlaysizmi?`)) {
      setAvailableStatuses(availableStatuses.filter(s => s !== status));
    }
  };

  const statusTabs = ['Barchasi', ...availableStatuses];

  const customerOrdersMap = useMemo(() => {
    const map: Record<string, Order[]> = {};
    orders.forEach(o => {
      if (!map[o.mijoz_id]) map[o.mijoz_id] = [];
      map[o.mijoz_id].push(o);
    });
    return map;
  }, [orders]);

  const customerTasksMap = useMemo(() => {
    const map: Record<string, CustomerTask[]> = {};
    customerTasks.forEach(t => {
      if (!map[t.mijoz_id]) map[t.mijoz_id] = [];
      map[t.mijoz_id].push(t);
    });
    return map;
  }, [customerTasks]);

  const accessibleCustomers = useMemo(() => {
    if (isAdmin) return customers;
    return customers.filter(c => String(c.operator_id) === String(currentUser.id));
  }, [customers, isAdmin, currentUser]);

  const filtered = useMemo(() => {
    return accessibleCustomers.filter(c => {
      const matchesSearch = 
        c.ism.toLowerCase().includes(search.toLowerCase()) || 
        c.familiya.toLowerCase().includes(search.toLowerCase()) ||
        c.telefon.includes(search) ||
        (c.biznes_turi || '').toLowerCase().includes(search.toLowerCase());
      
      const currentStatus = c.voronka || c.holati || 'Yangi';
      const matchesTab = activeTab === 'Barchasi' || currentStatus === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [accessibleCustomers, search, activeTab]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { Barchasi: accessibleCustomers.length };
    accessibleCustomers.forEach(c => {
      const s = c.voronka || c.holati || 'Yangi';
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [accessibleCustomers]);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('yangi')) return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    if (s.includes('ofis') || s.includes('keldi')) return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-blue-500/20';
    if (s.includes('aloqa')) return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    if (s.includes('otkaz') || s.includes('rad')) return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
    if (s.includes('to‘lov') || s.includes('muvaffaqiyat')) return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    return 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-700';
  };

  // Helper logic for custom rejection reason
  const getRejectionSelectValue = (currentReason?: string) => {
    if (!currentReason) return "";
    if (STANDARD_REASONS.includes(currentReason)) return currentReason;
    return "Boshqa sabab (izoh)";
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Tabs (No changes here, skipped for brevity) */}
      <div className="space-y-4 sticky top-0 z-40 bg-[#F8FAFC]/80 dark:bg-[#0B1120]/80 backdrop-blur-md pt-2 pb-4">
        <div className="bg-white dark:bg-slate-800 p-3 lg:p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center space-x-3 transition-colors">
          <span className="text-slate-400 text-lg">🔍</span>
          <input 
            type="text" 
            placeholder="Qidirish..."
            className="flex-1 outline-none text-slate-800 dark:text-white font-semibold text-sm bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isAdmin && (
            <button 
              onClick={() => setIsAddingStatus(!isAddingStatus)}
              className="px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-[10px] uppercase border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 transition-all"
            >
              + Voronka
            </button>
          )}
        </div>

        {isAdmin && isAddingStatus && (
          <div className="flex gap-2 animate-in slide-in-from-top-2">
            <input 
              type="text" 
              placeholder="Yangi status nomi..."
              className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold outline-none dark:text-white"
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
            />
            <button 
              onClick={handleAddStatus}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase shadow-lg hover:bg-indigo-500 active:scale-95 transition-all"
            >
              Qo'shish
            </button>
          </div>
        )}

        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
          {statusTabs.map((tab) => (
            <div key={tab} className="relative group">
              <button
                onClick={() => setActiveTab(tab)}
                className={`flex items-center space-x-2 px-5 py-3 rounded-2xl whitespace-nowrap transition-all duration-300 border font-semibold text-xs uppercase tracking-tight ${
                  activeTab === tab 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/30' 
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500'
                }`}
              >
                <span>{tab}</span>
                <span className={`ml-1 px-1.5 py-0.5 rounded-lg text-[10px] ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                  {counts[tab] || 0}
                </span>
              </button>
              {isAdmin && tab !== 'Barchasi' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteStatus(tab); }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Customers Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {filtered.map(customer => {
            const uniqueOrderCount = new Set((customerOrdersMap[customer.id] || []).map(o => o.id)).size;
            const customerTasksList = customerTasksMap[customer.id] || [];
            
            return (
              <div key={customer.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group">
                <div className="p-5 pb-3 flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-lg">👤</div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight uppercase tracking-tight">{customer.ism} {customer.familiya}</h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{customer.telefon}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase border ${getStatusColor(customer.voronka || customer.holati || 'Yangi')}`}>
                      {customer.voronka || customer.holati || 'Yangi'}
                    </span>
                  </div>
                </div>

                <div className="px-5 py-3 space-y-3 flex-1">
                   {/* Info Chips */}
                   <div className="flex flex-wrap gap-2">
                     {customer.qiziqgan_kurs && (
                        <div className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                          <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{customer.qiziqgan_kurs}</p>
                        </div>
                     )}
                     {customer.lead_manbasi && (
                        <div className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                          <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{customer.lead_manbasi}</p>
                        </div>
                     )}
                   </div>

                   {/* Otkaz Sababi Display */}
                   {(customer.voronka === 'Otkaz' || customer.holati === 'Otkaz') && customer.otkaz_sababi && (
                     <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
                        <p className="text-[8px] font-bold text-rose-400 uppercase tracking-widest mb-1">Otkaz sababi:</p>
                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{customer.otkaz_sababi}</p>
                     </div>
                   )}

                   {uniqueOrderCount > 0 && (
                     <button 
                       onClick={() => setViewingOrders(customer)}
                       className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-all group/btn"
                     >
                       <div className="text-left">
                         <span className="text-[8px] font-bold uppercase tracking-widest block opacity-60">Xarid tarixi</span>
                         <span className="font-bold text-sm">{uniqueOrderCount} ta xarid</span>
                       </div>
                       <span className="text-sm font-bold opacity-40 group-hover/btn:opacity-100 transition-opacity">➜</span>
                     </button>
                   )}

                   <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                     <div className="flex justify-between items-center mb-1">
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Manzil:</p>
                       <button onClick={() => handleViewLocation(customer.manzil, `${customer.ism} ${customer.familiya}`)} className="text-[8px] text-indigo-500 dark:text-indigo-400 font-bold hover:underline">📍 Kartada</button>
                     </div>
                     <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium line-clamp-1">{customer.manzil.split('(')[0] || 'Ko\'rsatilmagan'}</p>
                   </div>
                </div>

                <div className="p-4 pt-2 space-y-3 bg-white dark:bg-slate-800">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleCall(customer.telefon)}
                      className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 h-10 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-all"
                    >📞</button>
                    <button 
                      onClick={() => setEditingCustomer({...customer})}
                      className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-100 dark:border-slate-600 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all"
                    >✏️</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => onStartOrder(customer)}
                      className="py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <span>🛒</span> Buyurtma
                    </button>
                    <button 
                      onClick={() => setViewingTasks(customer)}
                      className="py-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-1.5 relative"
                    >
                      <span>📝</span> Topshiriq
                      {customerTasksList.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-full border border-white dark:border-slate-800">
                          {customerTasksList.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-20"><span className="text-6xl mb-4">📂</span><p className="font-black uppercase tracking-widest text-[10px]">Mijozlar yo'q</p></div>
      )}

      {/* Task Modal (Existing...) */}
      {viewingTasks && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           {/* ... Task Content ... */}
           <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 text-left">
              <div className="p-6 lg:p-8 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">📝 Topshiriqlar</h3>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Mijoz: {viewingTasks.ism} {viewingTasks.familiya}</p>
                 </div>
                 <button onClick={() => setViewingTasks(null)} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/50">
                {(customerTasksMap[viewingTasks.id] || []).slice().reverse().map((task, idx) => (
                   <div key={idx} onClick={() => onNavigateToTask && onNavigateToTask(task.id)} className="bg-white dark:bg-slate-800 p-5 rounded-[1.8rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group cursor-pointer hover:border-indigo-400 transition-all active:scale-[0.98]">
                      <p className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed mb-3 italic">"{task.topshiriq}"</p>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50 dark:border-slate-700">
                         <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vaqti:</p><p className="text-[9px] font-bold text-slate-500">{task.time_data}</p></div>
                         <div><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Bajarish kerak:</p><p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{task.topshiriq_vaqti}</p></div>
                      </div>
                      <div className="mt-2 text-right"><span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Holat: {task.holati}</span></div>
                   </div>
                ))}
                {(!customerTasksMap[viewingTasks.id] || customerTasksMap[viewingTasks.id].length === 0) && (
                   <div className="py-20 text-center opacity-20 italic"><span className="text-4xl block mb-2">📝</span><p className="font-black text-[10px] uppercase tracking-widest">Hozircha topshiriqlar yo'q</p></div>
                )}
              </div>
              <div className="p-8 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 space-y-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Topshiriq matni</label>
                    <textarea className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 outline-none text-xs font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 min-h-[80px] resize-none" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Bajarish vaqti</label>
                       <input type="datetime-local" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 outline-none text-[10px] font-black dark:text-white focus:ring-2 focus:ring-indigo-500" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                       <button onClick={handleSaveTask} disabled={isSavingTask || !newTaskText || !newTaskTime} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2">{isSavingTask ? "..." : "Saqlash 🚀"}</button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-white/10 custom-scrollbar text-left relative">
            <button onClick={() => setEditingCustomer(null)} className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">✕</button>
            
            <div>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Tahrirlash</h3>
               <p className="text-indigo-500 font-bold text-xs uppercase tracking-widest mt-1">Mijoz ID: {editingCustomer.id}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Section */}
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
                               // Agar avvalgi status ham Otkaz bo'lsa, sababni saqlab qolamiz, aks holda tozalaymiz
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

                 {/* Otkaz Sababi Dropdown & Input */}
                 {((editingCustomer.voronka === 'Otkaz' || editingCustomer.holati === 'Otkaz')) && (
                    <div className="mt-4 animate-in slide-in-from-top-2">
                        <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2 block ml-2">Rad etish sababi</label>
                        <select 
                            className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 text-xs font-bold outline-none dark:text-white"
                            value={getRejectionSelectValue(editingCustomer.otkaz_sababi)}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === "Boshqa sabab (izoh)") {
                                    // " " (bo'sh joy) belgisini qo'yamiz, shunda select "Boshqa"ni ko'rsatib turadi, input esa paydo bo'ladi
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
                        
                        {/* Custom Input for "Boshqa sabab (izoh)" */}
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

              {/* Chap Ustun - Asosiy Ma'lumotlar */}
              <div className="space-y-4">
                 <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">Shaxsiy Ma'lumotlar</h4>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Ism</label><input type="text" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.ism || ''} onChange={(e) => setEditingCustomer({...editingCustomer, ism: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Familiya</label><input type="text" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.familiya || ''} onChange={(e) => setEditingCustomer({...editingCustomer, familiya: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Telefon</label><input type="text" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.telefon || ''} onChange={(e) => setEditingCustomer({...editingCustomer, telefon: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Qo'shimcha Telefon</label><input type="text" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.qoshimcha_telefon || ''} onChange={(e) => setEditingCustomer({...editingCustomer, qoshimcha_telefon: e.target.value})} placeholder="+998..." /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Yosh</label><input type="text" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" value={editingCustomer.mijoz_yoshi || ''} onChange={(e) => setEditingCustomer({...editingCustomer, mijoz_yoshi: e.target.value})} /></div>
              </div>

              {/* O'ng Ustun - Qo'shimcha Ma'lumotlar */}
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
                      list="courses"
                      className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none dark:text-white" 
                      value={editingCustomer.qiziqgan_kurs || ''} 
                      onChange={(e) => setEditingCustomer({...editingCustomer, qiziqgan_kurs: e.target.value})}
                   />
                   <datalist id="courses">
                      {products.map(p => <option key={p.id} value={p.nomi} />)}
                   </datalist>
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

              {/* Manzil va Izoh (Pastki qism) */}
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

      <LocationPicker isOpen={isMapPickerOpen} onClose={() => setIsMapPickerOpen(false)} onConfirm={handleAddressPicked} initialAddress={editingCustomer?.manzil} />
      {viewingLocation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[2.5rem] overflow-hidden relative shadow-2xl">
              <button onClick={() => setViewingLocation(null)} className="absolute top-4 right-4 z-[1000] bg-white px-4 py-2 rounded-xl font-bold shadow-lg">Yopish</button>
              <MapContainer center={[viewingLocation.lat, viewingLocation.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[viewingLocation.lat, viewingLocation.lng]} icon={iconPerson}>
                  <Popup>{viewingLocation.title}</Popup>
                </Marker>
              </MapContainer>
           </div>
        </div>
      )}
    </div>
  );
};
