import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Search, X, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import ReactMarkdown from "react-markdown";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prolaw-chat`;

const ConstitutionBrowser = () => {
  const { selectedCountry, selectedLanguage } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const searchConstitution = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !selectedCountry || !selectedLanguage) return;
    setIsLoading(true);
    setResult("");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Search the ${selectedCountry.constitutionName} for: ${searchQuery}. List all relevant articles, sections and amendments with their full text.` }],
          country: selectedCountry.name,
          constitution: selectedCountry.constitutionName,
          language: selectedLanguage.name,
          mode: "constitution-browse",
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setResult(content);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      setResult("Error loading constitutional articles. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCountry, selectedLanguage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchConstitution(query);
  };

  const quickSearches = [
    "Fundamental Rights",
    "Freedom of Speech",
    "Right to Property",
    "Right to Education",
    "Criminal Procedure",
    "Emergency Provisions",
    "Amendment Process",
    "Judicial Powers",
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        title="Browse Constitution"
      >
        <BookOpen className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel glow-border w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Constitution Browser</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedCountry?.flag} {selectedCountry?.constitutionName}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <form onSubmit={handleSearch} className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search articles, rights, amendments..."
                    className="w-full bg-secondary/50 border border-border rounded-lg py-2.5 pl-9 pr-20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-40"
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
                  </button>
                </div>

                {/* Quick searches */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {quickSearches.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => { setQuery(q); searchConstitution(q); }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/80 text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </form>

              {/* Results */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                {result ? (
                  <div className="prose prose-sm prose-invert max-w-none text-sm [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_li]:text-secondary-foreground [&_p]:text-secondary-foreground [&_code]:text-primary [&_a]:text-primary">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Search for articles, rights, or amendments in the
                    </p>
                    <p className="text-sm text-primary font-medium">{selectedCountry?.constitutionName}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ConstitutionBrowser;
