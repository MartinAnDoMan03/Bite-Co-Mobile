import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from '../locales';

const LANGUAGE_STORAGE_KEY = '@biteco_language';

const LanguageContext = createContext(undefined);

// Ambil value dari object translation pakai dot notation, contoh:
// getNestedValue(id, 'settings.sections.notifications.title')
const getNestedValue = (obj, path) => {
  return path
    .split('.')
    .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

// Ganti semua {{variable}} di dalam string dengan value dari params
// interpolate('{{count}} pesanan', { count: 5 }) -> '5 pesanan'
const interpolate = (text, params) => {
  if (typeof text !== 'string' || !params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : match;
  });
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && translations[savedLanguage]) {
          setLanguageState(savedLanguage);
        }
      } catch (error) {
        console.error('Error loading saved language:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setLanguage = async (langCode) => {
    if (!translations[langCode]) {
      console.warn(`Language "${langCode}" is not registered in locales/index.js`);
      return;
    }
    try {
      setLanguageState(langCode); // update UI langsung, tidak nunggu storage
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  // t('settings.headerTitle') -> string sesuai bahasa aktif
  // t('some.missing.key', 'Fallback text') -> pakai fallback kalau key tidak ada (fallback berupa string)
  // t('pelanggan.growth.newCustomers', { count: 5 }) -> interpolasi {{count}} jadi 5 (param kedua berupa object)
  // t('some.missing.key', { count: 5 }, 'Fallback text') -> interpolasi + fallback kalau key tidak ada
  const t = useMemo(() => {
    return (key, paramsOrFallback, maybeFallback) => {
      // Pisahin: param kedua bisa berupa object (params interpolasi) atau string (fallback lama)
      const isParamsObject = paramsOrFallback !== null && typeof paramsOrFallback === 'object';
      const params = isParamsObject ? paramsOrFallback : undefined;
      const fallback = isParamsObject ? maybeFallback : paramsOrFallback;

      const value = getNestedValue(translations[language], key);
      if (value !== undefined) return interpolate(value, params);

      const defaultValue = getNestedValue(translations[DEFAULT_LANGUAGE], key);
      if (defaultValue !== undefined) return interpolate(defaultValue, params);

      return fallback !== undefined ? interpolate(fallback, params) : key;
    };
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isLoading,
        availableLanguages: AVAILABLE_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used inside <LanguageProvider>');
  }
  return context;
};