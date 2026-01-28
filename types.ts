
export type UserRole = 'Operator' | 'Admin' | 'SuperAdmin';

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  surname: string;
  phone: string;
  role: UserRole;
  isProfileComplete: boolean;
  address?: string;
  photoUrl?: string;
}

export interface Customer {
  id: string;
  ism: string;
  familiya: string;
  telefon: string;
  manzil: string;
  holati: string; // Asosiy holat (eski tizim uchun)
  voronka?: string; // Yangi voronka statusi
  biznes_turi?: string;
  izoh: string;
  vaqt?: string;
  operator_id?: string;
  operator_name?: string;
  
  // Yangi qo'shilgan maydonlar
  qoshimcha_telefon?: string;
  mijoz_yoshi?: string;
  social_url?: string;
  lead_manbasi?: string;
  qiziqgan_kurs?: string;
  maqsad?: string;
  talim_turi?: string;
  otkaz_sababi?: string; // Yangi maydon
}

export interface CustomerTask {
  id: string;
  mijoz_id: string;
  time_data: string;
  operator_id: string;
  operator: string;
  yaratuvchi_id?: string;
  yaratuvchi?: string;
  topshiriq: string;
  topshiriq_vaqti: string;
  holati: string;
}

export interface Product {
  id: string;
  nomi: string; // 'product' ustuni
  davomiyligi: string; // 'davomiyligi' ustuni
  oylik_narx: number; // 'oylik narxi' ustuni
  narx: number; // 'jami narxi' ustuni
  izoh?: string;
  video?: string;
  hujjat?: string;
  
  // Tizim uchun yordamchi maydonlar
  kategoriya: string; // UI filtrlash uchun (default: Kurs)
  birlik: string; // default: dona
  minimal_miqdor: number; // default: 1
  rasm_url?: string; // Video rasm sifatida ishlatiladi
}

export interface OrderHistoryEntry {
  date: string;
  status: string;
  operator_id: string;
  izoh?: string;
}

export interface Order {
  id: string;
  sana: string;
  operator_id: string;
  mijoz_id: string;
  mijoz_ism: string;
  mijoz_familya: string;
  mijoz_tel_nomer: string;
  tovar_id: string; // kurs id
  tovar: string; // kurs turi
  tovar_birlik: string; // davomiyligi o'rnida ishlatilishi mumkin
  narxi: number; // oyli to'lov
  miqdor: number; // har doim 1
  jami_summa: number;
  holat: string;
  izoh: string;
  kurs_boshlash_vaqti: string; // yetkazish_vaqti o'rniga
  history?: OrderHistoryEntry[]; // Full history log
}

export interface SheetConfig {
  operatorsScriptUrl: string;
  customersScriptUrl: string;
  statusScriptUrl: string;
  productsScriptUrl: string;
  ordersScriptUrl: string;
  orderHistoryScriptUrl: string;
  customerTasksScriptUrl: string;
}

export type View = 'dashboard' | 'customers' | 'orders' | 'order-entry' | 'products' | 'reports' | 'operators' | 'tasks';
