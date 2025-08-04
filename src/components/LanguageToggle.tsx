import { useLanguage } from "@/hooks/useLanguage";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es');
  };

  // Don't render until client is ready to prevent hydration mismatch
  if (!isClient) {
    return (
      <button
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200",
          "bg-gradient-secondary text-foreground hover:scale-105 active:scale-95",
          "shadow-letter touch-manipulation"
        )}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-semibold uppercase">ES</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200",
        "bg-gradient-secondary text-foreground hover:scale-105 active:scale-95",
        "shadow-letter touch-manipulation"
      )}
    >
      <Globe className="w-4 h-4" />
      <span className="text-sm font-semibold uppercase">
        {language === 'es' ? 'ES' : 'EN'}
      </span>
    </button>
  );
};