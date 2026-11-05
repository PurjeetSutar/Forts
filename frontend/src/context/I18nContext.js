import { createContext, useContext, useState } from "react";

const STR = {
  en: { explore: "Explore All Forts", map: "Discover the Map", search: "Search forts by name, district, location or historical association" },
};

export const LANGS = [
  { code: "en", label: "English", ready: true },
  { code: "mr", label: "मराठी", ready: false },
  { code: "hi", label: "हिन्दी", ready: false },
];

const I18n = createContext({ lang: "en", t: (k) => k });

export function I18nProvider({ children }) {
  const [lang, setLang] = useState("en");
  const t = (k) => STR[lang]?.[k] ?? STR.en[k] ?? k;
  return <I18n.Provider value={{ lang, setLang, t }}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);
