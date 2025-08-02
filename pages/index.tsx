import { Toaster } from "@/src/components/ui/toaster";
import { Toaster as Sonner } from "@/src/components/ui/sonner";
import { TooltipProvider } from "@/src/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/src/hooks/useLanguage";
import { DiscordProvider } from "@/src/hooks/useDiscordSDK";
import MultiplayerIndex from "@/src/pages/MultiplayerIndex";
import { useState } from "react";

export default function Home() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <DiscordProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <MultiplayerIndex />
          </TooltipProvider>
        </DiscordProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}