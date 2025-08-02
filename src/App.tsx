import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/hooks/useLanguage";
import { DiscordProvider } from "@/hooks/useDiscordSDK";
import Index from "./pages/Index";
import MultiplayerIndex from "./pages/MultiplayerIndex";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <DiscordProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              // Check if we're in Discord iframe
              window.parent !== window ? <MultiplayerIndex /> : <Index />
            } />
            <Route path="/multiplayer" element={<MultiplayerIndex />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </DiscordProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
