export interface CountryData {
  code: string;
  name: string;
  flag: string;
  languages: { code: string; name: string }[];
  constitutionName: string;
}

export const countries: CountryData[] = [
  { code: "US", name: "United States", flag: "🇺🇸", languages: [{ code: "en", name: "English" }, { code: "es", name: "Spanish" }], constitutionName: "Constitution of the United States" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", languages: [{ code: "en", name: "English" }, { code: "cy", name: "Welsh" }], constitutionName: "UK Constitutional Law" },
  { code: "IN", name: "India", flag: "🇮🇳", languages: [{ code: "hi", name: "Hindi" }, { code: "en", name: "English" }, { code: "ta", name: "Tamil" }, { code: "te", name: "Telugu" }, { code: "bn", name: "Bengali" }], constitutionName: "Constitution of India" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", languages: [{ code: "en", name: "English" }, { code: "ha", name: "Hausa" }, { code: "yo", name: "Yoruba" }, { code: "ig", name: "Igbo" }], constitutionName: "Constitution of the Federal Republic of Nigeria" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", languages: [{ code: "en", name: "English" }, { code: "af", name: "Afrikaans" }, { code: "zu", name: "Zulu" }, { code: "xh", name: "Xhosa" }], constitutionName: "Constitution of South Africa" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", languages: [{ code: "en", name: "English" }, { code: "sw", name: "Swahili" }], constitutionName: "Constitution of Kenya" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", languages: [{ code: "en", name: "English" }, { code: "ak", name: "Akan" }], constitutionName: "Constitution of Ghana" },
  { code: "DE", name: "Germany", flag: "🇩🇪", languages: [{ code: "de", name: "German" }], constitutionName: "Basic Law for the Federal Republic of Germany" },
  { code: "FR", name: "France", flag: "🇫🇷", languages: [{ code: "fr", name: "French" }], constitutionName: "Constitution of France" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", languages: [{ code: "pt", name: "Portuguese" }], constitutionName: "Constitution of Brazil" },
  { code: "JP", name: "Japan", flag: "🇯🇵", languages: [{ code: "ja", name: "Japanese" }], constitutionName: "Constitution of Japan" },
  { code: "CN", name: "China", flag: "🇨🇳", languages: [{ code: "zh", name: "Chinese (Mandarin)" }], constitutionName: "Constitution of the People's Republic of China" },
  { code: "RU", name: "Russia", flag: "🇷🇺", languages: [{ code: "ru", name: "Russian" }], constitutionName: "Constitution of the Russian Federation" },
  { code: "CA", name: "Canada", flag: "🇨🇦", languages: [{ code: "en", name: "English" }, { code: "fr", name: "French" }], constitutionName: "Constitution of Canada" },
  { code: "AU", name: "Australia", flag: "🇦🇺", languages: [{ code: "en", name: "English" }], constitutionName: "Australian Constitution" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", languages: [{ code: "es", name: "Spanish" }], constitutionName: "Constitution of Mexico" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", languages: [{ code: "ar", name: "Arabic" }], constitutionName: "Constitution of Egypt" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", languages: [{ code: "ar", name: "Arabic" }], constitutionName: "Basic Law of Saudi Arabia" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", languages: [{ code: "ur", name: "Urdu" }, { code: "en", name: "English" }], constitutionName: "Constitution of Pakistan" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", languages: [{ code: "en", name: "English" }, { code: "tl", name: "Filipino" }], constitutionName: "Constitution of the Philippines" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", languages: [{ code: "sw", name: "Swahili" }, { code: "en", name: "English" }], constitutionName: "Constitution of Tanzania" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", languages: [{ code: "am", name: "Amharic" }, { code: "en", name: "English" }], constitutionName: "Constitution of Ethiopia" },
  { code: "UG", name: "Uganda", flag: "🇺🇬", languages: [{ code: "en", name: "English" }, { code: "sw", name: "Swahili" }], constitutionName: "Constitution of Uganda" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", languages: [{ code: "en", name: "English" }, { code: "fr", name: "French" }, { code: "rw", name: "Kinyarwanda" }], constitutionName: "Constitution of Rwanda" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲", languages: [{ code: "fr", name: "French" }, { code: "en", name: "English" }], constitutionName: "Constitution of Cameroon" },
  { code: "SN", name: "Senegal", flag: "🇸🇳", languages: [{ code: "fr", name: "French" }, { code: "wo", name: "Wolof" }], constitutionName: "Constitution of Senegal" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", languages: [{ code: "fr", name: "French" }], constitutionName: "Constitution of Côte d'Ivoire" },
  { code: "IT", name: "Italy", flag: "🇮🇹", languages: [{ code: "it", name: "Italian" }], constitutionName: "Constitution of Italy" },
  { code: "ES", name: "Spain", flag: "🇪🇸", languages: [{ code: "es", name: "Spanish" }, { code: "ca", name: "Catalan" }], constitutionName: "Spanish Constitution" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", languages: [{ code: "ko", name: "Korean" }], constitutionName: "Constitution of South Korea" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", languages: [{ code: "id", name: "Indonesian" }], constitutionName: "Constitution of Indonesia" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", languages: [{ code: "tr", name: "Turkish" }], constitutionName: "Constitution of Turkey" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", languages: [{ code: "es", name: "Spanish" }], constitutionName: "Constitution of Argentina" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", languages: [{ code: "es", name: "Spanish" }], constitutionName: "Constitution of Colombia" },
  { code: "CL", name: "Chile", flag: "🇨🇱", languages: [{ code: "es", name: "Spanish" }], constitutionName: "Constitution of Chile" },
  { code: "AE", name: "UAE", flag: "🇦🇪", languages: [{ code: "ar", name: "Arabic" }, { code: "en", name: "English" }], constitutionName: "Constitution of the UAE" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", languages: [{ code: "th", name: "Thai" }], constitutionName: "Constitution of Thailand" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", languages: [{ code: "ms", name: "Malay" }, { code: "en", name: "English" }], constitutionName: "Federal Constitution of Malaysia" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", languages: [{ code: "bn", name: "Bengali" }], constitutionName: "Constitution of Bangladesh" },
  { code: "NP", name: "Nepal", flag: "🇳🇵", languages: [{ code: "ne", name: "Nepali" }], constitutionName: "Constitution of Nepal" },
];
