import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { Category } from "@/data/categories";

interface CategoryDisplayProps {
  category: Category;
  isActive: boolean;
}

export const CategoryDisplay = ({ category, isActive }: CategoryDisplayProps) => {
  const { t, language } = useLanguage();
  
  // Don't render anything if the game is not active
  if (!isActive) {
    return null;
  }
  
  return (
    <div className={cn(
      "text-center p-4 mx-4 rounded-2xl transition-all duration-300",
      "bg-gradient-secondary shadow-game",
      "scale-100 opacity-100"
    )}>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
        {t('game.category')}
      </h2>
      <p className="text-xl font-bold text-foreground capitalize leading-tight">
        {category[language]}
      </p>
    </div>
  );
};