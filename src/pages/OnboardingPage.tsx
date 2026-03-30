import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Globe, Languages, ArrowRight, Scale } from "lucide-react";
import { countries } from "@/data/countries";
import { useAppStore } from "@/store/appStore";
import { useNavigate } from "react-router-dom";
import prolawLogo from "@/assets/prolaw-logo.jpeg";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { selectedCountry, selectedLanguage, setCountry, setLanguage } = useAppStore();
  const [countrySearch, setCountrySearch] = useState("");
  const [step, setStep] = useState<"country" | "language">("country");

  const filteredCountries = useMemo(
    () => countries.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase())),
    [countrySearch]
  );

  const handleContinue = () => {
    if (selectedCountry && selectedLanguage) {
      navigate("/chat");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(210_60%_15%/0.4),transparent_60%)]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <img src={prolawLogo} alt="ProLAW" className="w-24 h-24 rounded-2xl shadow-lg shadow-primary/20" />
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">ProLAW</h1>
          <p className="text-text-silver mt-1 text-sm">AI-Powered Legal Assistant</p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 items-center text-xs text-muted-foreground">
          <span className={step === "country" ? "text-primary font-semibold" : ""}>
            <Globe className="inline w-3 h-3 mr-1" />Country
          </span>
          <ArrowRight className="w-3 h-3" />
          <span className={step === "language" ? "text-primary font-semibold" : ""}>
            <Languages className="inline w-3 h-3 mr-1" />Language
          </span>
          <ArrowRight className="w-3 h-3" />
          <span><Scale className="inline w-3 h-3 mr-1" />Chat</span>
        </div>

        {/* Selection Panel */}
        <div className="glass-panel glow-border w-full p-5">
          {step === "country" ? (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Select Your Country</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search countries..."
                  className="w-full bg-secondary/50 border border-border rounded-lg py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-1">
                {filteredCountries.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCountry(c);
                      setStep("language");
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      selectedCountry?.code === c.code
                        ? "bg-primary/20 text-foreground border border-primary/40"
                        : "hover:bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <span className="flex-1 text-left">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Select Language</label>
                <button onClick={() => setStep("country")} className="text-xs text-primary hover:underline">
                  ← Change country
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedCountry?.flag} {selectedCountry?.name} — {selectedCountry?.constitutionName}
              </p>
              <div className="space-y-1">
                {selectedCountry?.languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                      selectedLanguage?.code === lang.code
                        ? "bg-primary/20 text-foreground border border-primary/40"
                        : "hover:bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Continue Button */}
        {selectedCountry && selectedLanguage && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleContinue}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/25"
          >
            Start Legal Consultation
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}

        <p className="text-[11px] text-muted-foreground text-center max-w-sm">
          ProLAW provides AI-powered legal guidance based on your country's constitution. This is not a substitute for professional legal advice.
        </p>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
