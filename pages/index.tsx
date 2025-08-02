import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/hooks/useLanguage";
import { DiscordProvider } from "@/hooks/useDiscordSDK";
import MultiplayerIndex from "@/pages/MultiplayerIndex";
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