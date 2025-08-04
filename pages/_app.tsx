import type { AppProps } from 'next/app'
import '../src/index.css'
import { LanguageProvider } from "@/hooks/useLanguage";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Component {...pageProps} />
      </TooltipProvider>
    </LanguageProvider>
  );
}