import id from './id';
import en from './en';
import ms from './ms';

// Tambah bahasa baru: 1) buat file locales/xx.js (copy dari en.js lalu terjemahkan)
// 2) import di sini, 3) daftarkan di `translations` dan `AVAILABLE_LANGUAGES`.
export const translations = {
  id,
  en,
  ms,
};

export const AVAILABLE_LANGUAGES = [
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
];

export const DEFAULT_LANGUAGE = 'id';