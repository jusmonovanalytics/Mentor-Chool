
import { Customer, Product } from './types';

export const MOCK_CUSTOMERS: Customer[] = [
  { id: '1', ism: 'Ali', familiya: 'Karimov', telefon: '+998 90 123 45 67', manzil: 'Toshkent, Mirobod t.', holati: 'aktiv', izoh: 'VIP mijoz' },
  { id: '2', ism: 'Malika', familiya: 'Ergasheva', telefon: '+998 93 456 78 90', manzil: 'Samarqand, Markaziy k.', holati: 'aktiv', izoh: 'Regular' },
  { id: '3', ism: 'Dilshod', familiya: 'Normatov', telefon: '+998 99 987 65 43', manzil: 'Buxoro, Qadimiy sh.', holati: 'aktiv', izoh: 'Yangi' },
  { id: '4', ism: 'Zaynab', familiya: 'Toirova', telefon: '+998 97 111 22 33', manzil: 'Farg\'ona, Bog\'dod t.', holati: 'aktiv', izoh: 'Regular' },
];

export const MOCK_PRODUCTS: Product[] = [
  { 
    id: 'p1', 
    nomi: 'Smartfon X12', 
    narx: 3500000, 
    kategoriya: 'Elektronika', 
    rasm_url: 'https://picsum.photos/200/200?random=1', 
    minimal_miqdor: 1, 
    birlik: 'dona',
    davomiyligi: 'Cheksiz',
    oylik_narx: 0
  },
  { 
    id: 'p2', 
    nomi: 'Quloqchin Pro', 
    narx: 850000, 
    kategoriya: 'Elektronika', 
    rasm_url: 'https://picsum.photos/200/200?random=2', 
    minimal_miqdor: 1, 
    birlik: 'dona',
    davomiyligi: 'Cheksiz',
    oylik_narx: 0
  },
  { 
    id: 'p3', 
    nomi: 'Kofe mashinasi', 
    narx: 1200000, 
    kategoriya: 'Maishiy texnika', 
    rasm_url: 'https://picsum.photos/200/200?random=3', 
    minimal_miqdor: 1, 
    birlik: 'dona',
    davomiyligi: 'Cheksiz',
    oylik_narx: 0
  },
  { 
    id: 'p4', 
    nomi: 'Yugurish poyabzali', 
    narx: 550000, 
    kategoriya: 'Sport', 
    rasm_url: 'https://picsum.photos/200/200?random=4', 
    minimal_miqdor: 1, 
    birlik: 'dona',
    davomiyligi: 'Cheksiz',
    oylik_narx: 0
  },
];