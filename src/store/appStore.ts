import { create } from "zustand";
import type { CountryData } from "@/data/countries";

interface AppState {
  selectedCountry: CountryData | null;
  selectedLanguage: { code: string; name: string } | null;
  setCountry: (country: CountryData) => void;
  setLanguage: (lang: { code: string; name: string }) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedCountry: null,
  selectedLanguage: null,
  setCountry: (country) => set({ selectedCountry: country, selectedLanguage: null }),
  setLanguage: (lang) => set({ selectedLanguage: lang }),
  reset: () => set({ selectedCountry: null, selectedLanguage: null }),
}));
