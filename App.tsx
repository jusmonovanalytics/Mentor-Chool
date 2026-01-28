
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CustomerManagement } from './components/CustomerManagement';
import { OrderEntry } from './components/OrderEntry';
import { OrderList } from './components/OrderList';
import { ProductManagement } from './components/ProductManagement';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { ProfileSetup } from './components/ProfileSetup';
import { OperatorManagement } from './components/OperatorManagement';
import { TaskManagement } from './components/TaskManagement';
import { View, Customer, Product, User, Order, SheetConfig, CustomerTask } from './types';
import { syncAllData, saveData, logOrderUpdate, saveCustomerTask, addProduct, addOperator } from './services/sheetService';

const CONFIG_STORAGE_KEY = 'mentor_school_config_v6';
const VORONKA_STATUSES_KEY = 'mentor_voronka_statuses_v1';

// Default Voronka Statuses
const DEFAULT_VORONKA = [
  'Yangi',
  'Aloqa o\'rnatildi',
  'Ofisga keldi',
  'Probniy darsga kirdi',
  'Qaror bosqichi',
  'To‘lov qildi',
  'Otkaz'
];

// Helper function for consistent date formatting
const formatDate = (date: Date) => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${d}.${m}.${y} ${h}:${min}:${s}`;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('app_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [viewHistory, setViewHistory] = useState<View[]>([]);
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  
  // Voronka Statuses State
  const [voronkaStatuses, setVoronkaStatuses] = useState<string[]>(() => {
    const saved = localStorage.getItem(VORONKA_STATUSES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_VORONKA;
  });

  useEffect(() => {
    localStorage.setItem(VORONKA_STATUSES_KEY, JSON.stringify(voronkaStatuses));
  }, [voronkaStatuses]);
  
  const orderStatusCache = useRef<Record<string, string>>({});

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  
  const [config, setConfig] = useState<SheetConfig>(() => {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    
    return { 
      operatorsScriptUrl: 'https://script.google.com/macros/s/AKfycbyd8xD0wCVJIKCx00hhJvWFzFlnMntXenjF_8AKIkArpPzJLkzmHWw8OKiiGe-AvHxlKg/exec', 
      customersScriptUrl: 'https://script.google.com/macros/s/AKfycbx6toiCBhayaSOOIsJ3A__BwY04md-JexVXyHRAs55iSzvzKSuNpVlYW4dHeaDNw7VA/exec', 
      statusScriptUrl: 'https://script.google.com/macros/s/AKfycbyZxq2n29qatc0o7DcTN7pjXhBLKOObdcDdDbi_nV5mn3CXMzevcE3sbtz6T9T1LQqE/exec',
      productsScriptUrl: 'https://script.google.com/macros/s/AKfycbzFvr6fw1rItYKAyx_gByNvJFqgLZ_CNttBL2ZqBDLev2uHRk5wEnewxSM9cuuP19Jl/exec', 
      ordersScriptUrl: 'https://script.google.com/macros/s/AKfycbxvpydyr46lVfVDCSeGedBnlw5CMj3LN3Ux48fM0Z6v5rLzi01J4c1yrhV6px5PtKsECQ/exec',
      orderHistoryScriptUrl: 'https://script.google.com/macros/s/AKfycbzaU0q56wjH5T0ciMSnzStnXL_8hKZxkJwsIMK9R5RebJnpZ9Acsco37n4WfD0CLneuyQ/exec', 
      customerTasksScriptUrl: 'https://script.google.com/macros/s/AKfycbwF7WPDm7nUDuYqur5EV9amH7a2ZmeWX4-4d0rwmBnik4vNzY9yw1jbbkiakR4uV_bW/exec'
    };
  });

  const [data, setData] = useState<{
    customers: Customer[], 
    products: Product[], 
    orders: Order[],
    operators: User[],
    customerTasks: CustomerTask[]
  }>({ customers: [], products: [], orders: [], operators: [], customerTasks: [] });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeCallCustomer, setActiveCallCustomer] = useState<Customer | null>(null);

  const handleSync = async () => {
    if (!config.operatorsScriptUrl) return;
    setIsSyncing(true);
    try {
      const synced = await syncAllData(config);
      
      const processedOrders = synced.orders.map((o: Order) => {
        const cachedStatus = orderStatusCache.current[o.id];
        if (cachedStatus && o.holat !== cachedStatus) {
           return { ...o, holat: cachedStatus };
        }
        if (cachedStatus === o.holat) {
           delete orderStatusCache.current[o.id];
        }
        return o;
      });

      setData({
        customers: synced.clients,
        products: synced.products,
        orders: processedOrders,
        operators: synced.operators,
        customerTasks: synced.customerTasks || []
      });
      
      if (user) {
        const refreshedUser = synced.operators.find(o => o.email.toLowerCase() === user.email.toLowerCase());
        if (refreshedUser) {
          setUser(refreshedUser);
          localStorage.setItem('app_user', JSON.stringify(refreshedUser));
        }
      }
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    handleSync();
    const interval = setInterval(handleSync, 60000); 
    return () => clearInterval(interval);
  }, [config]);

  const handleUpdateOrderStatus = async (ordersToUpdate: Order[], newStatus: string) => {
    if (!config.orderHistoryScriptUrl || !user) return;
    try {
      ordersToUpdate.forEach(o => {
        orderStatusCache.current[o.id] = newStatus;
      });

      setData(prev => ({
        ...prev,
        orders: prev.orders.map(o => {
          const match = ordersToUpdate.find(u => u.id === o.id);
          return match ? { ...o, holat: newStatus } : o;
        })
      }));

      await logOrderUpdate(config.orderHistoryScriptUrl, ordersToUpdate, newStatus);
      setTimeout(handleSync, 5000);
    } catch (err) {
      console.error("Holatni yangilashda xatolik:", err);
      alert("Xatolik yuz berdi. Status saqlanmadi.");
    }
  };

  const handleUpdateCustomer = async (customer: Customer) => {
    if (!config.statusScriptUrl) return;
    try {
      const now = new Date();
      const timeStr = formatDate(now);

      // Logika: Agar operator biriktirilayotgan bo'lsa va voronka bo'sh yoki aniqlanmagan bo'lsa, 'Yangi' deb belgilash
      let newVoronka = customer.voronka || customer.holati || 'Yangi';
      
      // Eski ma'lumotni tekshirish (o'zgarish bo'lganini bilish uchun)
      const oldCustomer = data.customers.find(c => c.id === customer.id);
      
      // Agar avval operator yo'q bo'lsa va endi bor bo'lsa -> Voronka 'Yangi' bo'ladi
      const isNewlyAssigned = (!oldCustomer?.operator_id || oldCustomer.operator_id === '0') && 
                              (customer.operator_id && customer.operator_id !== '0');
                              
      if (isNewlyAssigned && (newVoronka === '' || !newVoronka)) {
          newVoronka = 'Yangi';
      }

      // Otkaz sababini aniqlash va bo'shliqlardan tozalash
      const otkazSababi = newVoronka === 'Otkaz' && customer.otkaz_sababi ? customer.otkaz_sababi.trim() : '';

      // AppSheet ustun nomlariga moslash (JSON keys)
      // Biz "Otkaz sababi"ni bir necha xil variantda yuboramiz, chunki Google Sheet Headeri qanday yozilganligini aniq bilmaymiz.
      const logEntry = { 
        "mijoz id": customer.id,
        "operator id": customer.operator_id || "",
        "operator": customer.operator_name || "",
        "saqlash vaqti": timeStr,
        "time data": timeStr, // Eski format uchun ham
        "voronka": newVoronka,
        
        "ism": customer.ism,
        "familiya": customer.familiya,
        "telefon": customer.telefon.startsWith("'") ? customer.telefon : "'" + customer.telefon,
        
        // Yangi talab qilingan maydonlar
        "qo'shimcha telefon nomer": customer.qoshimcha_telefon || "",
        "mijoz yoshi": customer.mijoz_yoshi || "",
        "url": customer.social_url || "",
        "manzili": customer.manzil || "",
        "lead manbasi": customer.lead_manbasi || "",
        "qaysi kursga qiziqmoqda": customer.qiziqgan_kurs || "",
        "maqsadi": customer.maqsad || "",
        "taʼlim turi": customer.talim_turi || "",
        "izoh": customer.izoh || "",
        
        // Otkaz sababi uchun variantlar (Ehtiyot chorasi)
        "Otkaz sababi": otkazSababi,
        "otkaz sababi": otkazSababi,
        "otkaz_sababi": otkazSababi,
        "Otkaz Sababi": otkazSababi,
        
        "biznes turi": customer.biznes_turi || "", // Legacy
        "holati": newVoronka // Legacy support
      };

      await saveData(config.statusScriptUrl, logEntry);
      
      // Lokal bazani yangilash
      const updatedCustomer = {
          ...customer, 
          voronka: newVoronka,
          holati: newVoronka,
          otkaz_sababi: otkazSababi,
          vaqt: timeStr
      };

      setData(prev => ({
        ...prev,
        customers: prev.customers.map(c => c.id === customer.id ? updatedCustomer : c)
      }));
    } catch (error) {
      console.error("Holatni yangilashda xatolik:", error);
      throw error;
    }
  };

  const handleAddOrUpdateCustomerTask = async (task: CustomerTask) => {
    if (!config.customerTasksScriptUrl) return;
    try {
      await saveCustomerTask(config.customerTasksScriptUrl, task);
      
      setData(prev => {
        const existingIdx = prev.customerTasks.findIndex(t => t.id === task.id);
        const newTasks = [...prev.customerTasks];
        if (existingIdx >= 0) {
          newTasks[existingIdx] = task;
        } else {
          newTasks.push(task);
        }
        return {
          ...prev,
          customerTasks: newTasks
        };
      });
      
      setTimeout(handleSync, 2000);
    } catch (error) {
      console.error("Topshiriq saqlashda xatolik:", error);
      throw error;
    }
  };

  const handleCreateProduct = async (productData: Partial<Product>) => {
    if (!config.productsScriptUrl) {
      alert("Mahsulotlar skripti sozlanmagan!");
      return;
    }
    
    // ID Generatsiya
    const numericIds = data.products.map(p => parseInt(p.id.replace(/\D/g, ''))).filter(id => !isNaN(id));
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
    const newId = (maxId + 1).toString();

    const newProduct: Product = {
      id: newId,
      nomi: productData.nomi || '',
      davomiyligi: productData.davomiyligi || '',
      oylik_narx: Number(productData.oylik_narx) || 0,
      narx: Number(productData.narx) || 0,
      izoh: productData.izoh || '',
      video: productData.video || '',
      hujjat: productData.hujjat || '',
      kategoriya: productData.kategoriya || 'Kurs',
      birlik: 'dona',
      minimal_miqdor: 1
    };

    try {
      await addProduct(config.productsScriptUrl, newProduct);
      setData(prev => ({
        ...prev,
        products: [...prev.products, newProduct]
      }));
      alert("Yangi kurs qo'shildi!");
    } catch (e) {
      console.error(e);
      alert("Xatolik yuz berdi");
    }
  };

  const handleCreateOperator = async (operatorData: Partial<User>) => {
     if (!config.operatorsScriptUrl) {
       alert("Operatorlar skripti sozlanmagan!");
       return;
     }

     const numericIds = data.operators.map(o => parseInt(o.id)).filter(id => !isNaN(id));
     const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
     const newId = (maxId + 1).toString();

     const newOperator: User = {
       id: newId,
       name: operatorData.name || '',
       surname: operatorData.surname || '',
       email: operatorData.email || '',
       phone: operatorData.phone || '',
       role: operatorData.role || 'Operator',
       password: operatorData.password || '123456',
       isProfileComplete: true, // Admin yaratgani uchun to'liq deb hisoblaymiz
       address: operatorData.address || ''
     };

     try {
       await addOperator(config.operatorsScriptUrl, newOperator);
       setData(prev => ({
         ...prev,
         operators: [...prev.operators, newOperator]
       }));
       alert("Yangi operator yaratildi!");
     } catch (e) {
       console.error(e);
       alert("Xatolik yuz berdi");
     }
  };

  const navigateTo = useCallback((view: View) => {
    if (view !== currentView) {
      setViewHistory(prev => [...prev, currentView]);
      setCurrentView(view);
    }
  }, [currentView]);

  const navigateToTask = useCallback((taskId: string) => {
    setTaskSearchTerm(taskId);
    navigateTo('tasks');
  }, [navigateTo]);

  const navigateBack = useCallback(() => {
    if (viewHistory.length > 0) {
      const newHistory = [...viewHistory];
      const previousView = newHistory.pop();
      if (previousView) {
        setViewHistory(newHistory);
        setCurrentView(previousView);
      }
    } else {
      setCurrentView('dashboard');
    }
  }, [viewHistory]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('app_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
    setViewHistory([]);
    setCurrentView('dashboard');
  };

  const handleCompleteProfile = async (updatedUser: User) => {
    // User ID ni aniqlash yoki yangilash
    const existingOp = data.operators.find(o => o.email.toLowerCase() === updatedUser.email.toLowerCase());
    let finalId = updatedUser.id;
    if (!finalId || finalId === "0") {
      if (existingOp && existingOp.id && existingOp.id !== "0") {
        finalId = existingOp.id;
      } else {
        const numericIds = data.operators.map(o => parseInt(o.id)).filter(id => !isNaN(id));
        const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
        finalId = (maxId + 1).toString();
      }
    }
    const userToSave = { ...updatedUser, id: finalId };
    if (config.operatorsScriptUrl) {
      try {
        const sheetData = {
          "operator id": userToSave.id,
          "gmail": userToSave.email.toLowerCase().trim(),
          "ism": userToSave.name,
          "familya": userToSave.surname,
          "telefon nomer": userToSave.phone.startsWith("'") ? userToSave.phone : "'" + userToSave.phone,
          "lavozim": userToSave.role,
          "parol": userToSave.password || '' 
        };
        await saveData(config.operatorsScriptUrl, sheetData);
      } catch (err) {
        console.error("Profilni saqlashda xatolik:", err);
      }
    }
    setUser(userToSave);
    localStorage.setItem('app_user', JSON.stringify(userToSave));
    setTimeout(handleSync, 2000);
  };

  if (!user) return <Login onLogin={handleLogin} existingOperators={data.operators} />;
  if (!user.isProfileComplete) return <ProfileSetup user={user} onComplete={handleCompleteProfile} />;

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': 
        return (
          <Dashboard 
            orders={data.orders} 
            customers={data.customers}
            currentUser={user} 
            allOperators={data.operators} 
            isDarkMode={isDarkMode} 
            onUpdateCustomer={handleUpdateCustomer}
            onStartOrder={(c) => { setActiveCallCustomer(c); navigateTo('order-entry'); }}
            availableStatuses={voronkaStatuses}
          />
        );
      case 'tasks':
        return (
          <TaskManagement 
            tasks={data.customerTasks}
            customers={data.customers}
            currentUser={user}
            allOperators={data.operators}
            onUpdateTask={handleAddOrUpdateCustomerTask}
            externalSearch={taskSearchTerm}
            onClearExternalSearch={() => setTaskSearchTerm('')}
          />
        );
      case 'operators':
        return (
          <OperatorManagement 
            operators={data.operators}
            customers={data.customers}
            orders={data.orders}
            currentUser={user}
            onUpdateCustomer={handleUpdateCustomer}
            onSync={handleSync}
            onAddOperator={handleCreateOperator}
          />
        );
      case 'customers': 
        return (
          <CustomerManagement 
            customers={data.customers} 
            products={data.products} 
            orders={data.orders}
            operators={data.operators}
            currentUser={user}
            customerTasks={data.customerTasks}
            onStartOrder={(c) => { setActiveCallCustomer(c); navigateTo('order-entry'); }}
            onUpdateCustomer={handleUpdateCustomer}
            onAddTask={handleAddOrUpdateCustomerTask}
            onNavigateToTask={navigateToTask}
            availableStatuses={voronkaStatuses}
            setAvailableStatuses={setVoronkaStatuses}
          />
        );
      case 'products':
        return (
          <ProductManagement 
            products={data.products} 
            currentUser={user}
            onSaveProduct={async (p) => { /* Edit logic can be added here */ }} 
            onCreateProduct={handleCreateProduct}
          />
        );
      case 'reports':
        return <Reports orders={data.orders} products={data.products} />;
      case 'order-entry': 
        return (
          <OrderEntry 
            products={data.products} 
            selectedCustomer={activeCallCustomer}
            currentUser={user}
            scriptUrl={config.ordersScriptUrl}
            existingOrders={data.orders}
            onClose={() => { setActiveCallCustomer(null); navigateBack(); handleSync(); }}
          />
        );
      case 'orders':
        return (
          <OrderList 
            orders={data.orders} 
            operators={data.operators} 
            customers={data.customers} 
            currentUser={user} 
            onUpdateStatus={handleUpdateOrderStatus} 
          />
        );
      default: return (
        <Dashboard 
          orders={data.orders} 
          customers={data.customers}
          currentUser={user} 
          allOperators={data.operators} 
          isDarkMode={isDarkMode} 
          onUpdateCustomer={handleUpdateCustomer}
          onStartOrder={(c) => { setActiveCallCustomer(c); navigateTo('order-entry'); }}
          availableStatuses={voronkaStatuses}
        />
      );
    }
  };

  return (
    <Layout 
      activeView={currentView} 
      setView={navigateTo} 
      onBack={navigateBack} 
      canGoBack={viewHistory.length > 0 || currentView !== 'dashboard'} 
      user={user} 
      onLogout={handleLogout}
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
