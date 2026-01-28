
import { Customer, Product, Order, User, SheetConfig, CustomerTask, OrderHistoryEntry } from '../types';

// Sanani DD.MM.YYYY HH:mm:ss formatiga o'tkazish uchun yordamchi funksiya
const formatDate = (dateInput: Date | string) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');

  return `${d}.${m}.${y} ${h}:${min}:${s}`;
};

export const syncAllData = async (config: SheetConfig) => {
  const fetchJson = async (url: string) => {
    if (!url) return [];
    try {
      const res = await fetch(url);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn(`Fetch failed for ${url}`, e);
      return [];
    }
  };

  const cleanPhone = (phone: any) => {
    if (!phone) return '';
    const str = String(phone);
    return str.startsWith("'") ? str.substring(1) : str;
  };

  try {
    const [opsData, clientsData, statusLogData, productsData, ordersData, historyData, tasksData] = await Promise.all([
      fetchJson(config.operatorsScriptUrl),
      fetchJson(config.customersScriptUrl),
      fetchJson(config.statusScriptUrl),
      fetchJson(config.productsScriptUrl),
      fetchJson(config.ordersScriptUrl),
      fetchJson(config.orderHistoryScriptUrl),
      fetchJson(config.customerTasksScriptUrl)
    ]);

    // Operatorlarni map qilish
    const operators: User[] = opsData
      .filter((o: any) => {
         const email = o.gmail || o.email;
         return email && String(email).includes('@');
      })
      .map((o: any) => {
        const ism = String(o.ism || o.name || '').trim();
        const familiya = String(o.familya || o.familiya || o.surname || '').trim();
        const telefon = cleanPhone(o['telefon nomer'] || o.telefon || o.phone).trim();

        return {
          id: String(o['operator id'] || o.id || '0'),
          email: String(o.gmail || o.email).toLowerCase().trim(),
          password: String(o.parol || o.password || ''),
          name: ism,
          surname: familiya,
          phone: telefon,
          role: (o.lavozim || o.role) || 'Operator',
          isProfileComplete: true,
          address: o.manzil || o.address || ''
        };
      });
    
    // Mijozlarni map qilish
    const clients: Customer[] = clientsData
      .filter((c: any) => c.ism || c.telefon)
      .map((c: any) => {
        const id = String(c['mijoz id'] || c.id || '');
        const statusLogs = statusLogData.filter((log: any) => String(log['mijoz id'] || log.id) === id);
        const latestStatus = statusLogs.length > 0 ? statusLogs[statusLogs.length - 1] : null;
        
        const biznesTuri = latestStatus 
          ? (latestStatus['biznes turi'] || latestStatus.biznes_turi) 
          : (c['biznes turi'] || c.biznes_turi || '');
        
        const opId = latestStatus?.['operator id'] || latestStatus?.operator_id || c['operator id'] || c.operator_id || '';
        const opName = latestStatus?.operator || c.operator || '';

        const getField = (key1: string, key2: string) => {
           return latestStatus ? (latestStatus[key1] || latestStatus[key2] || '') : (c[key1] || c[key2] || '');
        };

        return {
          id: id,
          ism: c.ism || '',
          familiya: c.familiya || c.familya || '',
          telefon: cleanPhone(c['telefon nomer'] || c.telefon),
          manzil: getField('manzili', 'manzil'),
          holati: latestStatus ? (latestStatus.voronka || latestStatus.holati) : (c.voronka || c.holati || 'Yangi'),
          voronka: latestStatus ? (latestStatus.voronka || latestStatus.holati) : (c.voronka || c.holati || 'Yangi'),
          biznes_turi: biznesTuri || '',
          izoh: latestStatus ? (latestStatus.izoh || latestStatus.note) : (c.izoh || ''),
          vaqt: latestStatus ? (latestStatus['saqlash vaqti'] || latestStatus.vaqt) : '',
          operator_id: String(opId),
          operator_name: opName,
          
          qoshimcha_telefon: getField("qo'shimcha telefon nomer", "qoshimcha_telefon"),
          mijoz_yoshi: getField("mijoz yoshi", "yosh"),
          social_url: getField("url", "social_url"),
          lead_manbasi: getField("lead manbasi", "lead_manbasi"),
          qiziqgan_kurs: getField("qaysi kursga qiziqmoqda", "qiziqgan_kurs"),
          maqsad: getField("maqsadi", "maqsad"),
          talim_turi: getField("taʼlim turi", "talim_turi"),
          otkaz_sababi: getField("Otkaz sababi", "otkaz_sababi")
        };
      });

    // Mahsulotlarni map qilish
    const products: Product[] = productsData
      .filter((p: any) => p['product id'] || p.product || p.id)
      .map((p: any) => ({
        id: String(p['product id'] || p.id || ''),
        nomi: p.product || p.nomi || 'Nomsiz Kurs',
        davomiyligi: p.davomiyligi || '',
        oylik_narx: parseFloat(String(p['oylik narxi'] || p.oylik_narx || '0').replace(/\s/g, '')) || 0,
        narx: parseFloat(String(p['jami narxi'] || p.narx || '0').replace(/\s/g, '')) || 0,
        izoh: p.izoh || '',
        video: p.video || '',
        hujjat: p.hujjat || p.hujjati || '',
        kategoriya: 'Kurs',
        birlik: 'dona',
        minimal_miqdor: 1,
        rasm_url: undefined
      }));

    // Tarixni o'qish va guruhlash
    const historyMap: Record<string, OrderHistoryEntry[]> = {};
    if (Array.isArray(historyData)) {
      historyData.forEach((h: any) => {
        const hId = String(h['buyurtma id'] || h.id || '');
        if (!hId) return;
        if (!historyMap[hId]) historyMap[hId] = [];
        
        historyMap[hId].push({
            date: h['saqlash vaqti'] || h['taxrirlangan vaqti'] || h.sana || '',
            status: h['buyurtma holati'] || h.holat || 'Noma\'lum',
            operator_id: String(h['operator id'] || h.operator_id || ''),
            izoh: h.izoh || ''
        });
      });
    }

    // Buyurtmalarni map qilish
    const orders: Order[] = ordersData
      .filter((o: any) => o['buyurtma id'] || o.id)
      .map((o: any) => {
        const idStr = String(o['buyurtma id'] || o.id || '');
        const itemHistory = historyMap[idStr] || [];
        // Eng so'nggi holatni olish (agar tarixda bo'lsa)
        const latestUpdate = itemHistory.length > 0 ? itemHistory[itemHistory.length - 1] : null;
        
        return {
          id: idStr,
          sana: o['saqlash vaqti'] || o.sana || '',
          operator_id: String(o['operator id'] || o.operator_id || ''),
          mijoz_id: String(o['mijoz id'] || o.mijoz_id || ''),
          mijoz_ism: o['mijoz ism'] || o.mijoz_ism || '',
          mijoz_familya: o['mijoz familya'] || o.mijoz_familya || '',
          mijoz_tel_nomer: cleanPhone(o['mijoz tel nomer'] || o.mijoz_tel_nomer),
          tovar_id: String(o['tovar id'] || o.tovar_id || ''),
          tovar: o['kurs turi'] || o.tovar || '',
          tovar_birlik: o['davomiyligi'] || o.davomiyligi || '',
          narxi: parseFloat(String(o["oyli to'lov"] || o.narxi).replace(/\s/g, '')) || 0,
          miqdor: 1, 
          jami_summa: parseFloat(String(o["jami to'lov"] || o.jami_summa).replace(/\s/g, '')) || 0,
          holat: latestUpdate ? latestUpdate.status : (o['buyurtma holati'] || o.holat || 'Kutilmoqda'),
          izoh: latestUpdate ? (latestUpdate.izoh || '') : (o.izoh || ''),
          kurs_boshlash_vaqti: o['kursni boshlash vaqti'] || o.kurs_boshlash_vaqti || '',
          history: itemHistory // Full history attach qilinadi
        };
      });

    // Topshiriqlarni map qilish
    const taskGroups: Record<string, CustomerTask> = {};
    if (Array.isArray(tasksData)) {
      tasksData.forEach((t: any) => {
        const id = String(t['topshiriq id'] || t.id || '');
        const timeData = t['saqlash vaqti'] || t['time data'] || t.time_data || '';
        
        const taskObj: CustomerTask = {
          id: id,
          mijoz_id: String(t['mijoz id'] || t.mijoz_id || ''),
          time_data: timeData,
          operator_id: String(t['operator id'] || t.operator_id || ''),
          operator: t.operator || '',
          yaratuvchi_id: String(t['yaratuvchi id'] || t.yaratuvchi_id || ''),
          yaratuvchi: t.yaratuvchi || '',
          topshiriq: t.topshiriq || '',
          topshiriq_vaqti: t['bajarish vaqti'] || t['topshiriq vaqti'] || t.topshiriq_vaqti || '',
          holati: t['topshiriq holati'] || t.holati || 'Yangi'
        };

        if (id && (!taskGroups[id] || timeData > taskGroups[id].time_data)) {
          taskGroups[id] = taskObj;
        }
      });
    }

    return { operators, clients, products, orders, customerTasks: Object.values(taskGroups) };
  } catch (error) {
    console.error("Data Sync Error:", error);
    throw error;
  }
};

export const saveData = async (scriptUrl: string, data: any) => {
  if (!scriptUrl) throw new Error("Script URL missing");
  const payload = JSON.parse(JSON.stringify(data));
  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return true;
};

export const saveCustomerTask = async (scriptUrl: string, task: CustomerTask) => {
  if (!scriptUrl) throw new Error("Customer Tasks Script URL missing");
  const payload = {
    "mijoz id": task.mijoz_id,
    "saqlash vaqti": task.time_data,
    "operator id": task.operator_id,
    "operator": task.operator,
    "yaratuvchi id": task.yaratuvchi_id || task.operator_id,
    "yaratuvchi": task.yaratuvchi || task.operator,
    "topshiriq": task.topshiriq,
    "bajarish vaqti": task.topshiriq_vaqti,
    "topshiriq holati": task.holati,
    "topshiriq id": task.id
  };
  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return true;
};

export const addProduct = async (scriptUrl: string, product: Product) => {
  if (!scriptUrl) throw new Error("Products Script URL missing");
  const payload = {
    "product id": product.id,
    "product": product.nomi,
    "davomiyligi": product.davomiyligi,
    "oylik narxi": product.oylik_narx,
    "jami narxi": product.narx,
    "izoh": product.izoh,
    "video": product.video,
    "hujjati": product.hujjat
  };
  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return true;
};

export const addOperator = async (scriptUrl: string, operator: User) => {
    if (!scriptUrl) throw new Error("Operators Script URL missing");
    const payload = {
        "operator id": operator.id,
        "gmail": operator.email.toLowerCase().trim(),
        "ism": operator.name,
        "familya": operator.surname,
        "telefon nomer": operator.phone.startsWith("'") ? operator.phone : "'" + operator.phone,
        "lavozim": operator.role,
        "parol": operator.password || ''
    };
    await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return true;
};

export const submitOrder = async (scriptUrl: string, orders: any[]) => {
  if (!scriptUrl) throw new Error("Script URL missing");
  // Ma'lumotlarni Google Sheet talab qilgan ustun nomlariga o'tkazish
  const sheetPayload = orders.map(o => ({
    "buyurtma id": o.id,
    "mijoz id": o.mijoz_id,
    "operator id": o.operator_id,
    "saqlash vaqti": o.sana,
    "buyurtma holati": o.holat, // Default 'Kutilmoqda'
    "kurs turi": o.tovar,
    "davomiyligi": o.tovar_birlik,
    "oyli to'lov": o.narxi,
    "jami to'lov": o.jami_summa,
    "kursni boshlash vaqti": o.kurs_boshlash_vaqti
  }));

  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sheetPayload),
  });
  return true;
};

export const logOrderUpdate = async (scriptUrl: string, orders: Order[], newStatus: string) => {
  if (!scriptUrl) throw new Error("Order History Script URL missing");
  
  const now = new Date();
  const editTimeStr = formatDate(now);

  const historyPayload = orders.map(o => ({
    "buyurtma id": o.id,
    "mijoz id": o.mijoz_id,
    "operator id": o.operator_id,
    "saqlash vaqti": o.sana, 
    "buyurtma holati": newStatus,
    "kurs turi": o.tovar,
    "davomiyligi": o.tovar_birlik,
    "oyli to'lov": o.narxi,
    "jami to'lov": o.jami_summa,
    "kursni boshlash vaqti": o.kurs_boshlash_vaqti,
    "taxrirlangan vaqti": editTimeStr,
    "izoh": o.izoh ? o.izoh : "Status o'zgardi"
  }));

  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(historyPayload),
  });
  return true;
};
