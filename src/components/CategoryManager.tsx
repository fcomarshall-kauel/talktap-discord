import React, { useState, useMemo } from 'react';
import { Category, gameCategories, getRandomCategory } from '../data/categories';
import { useLanguage } from '../hooks/useLanguage';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Search, Shuffle, Filter, X } from 'lucide-react';

interface CategoryManagerProps {
  onCategorySelect?: (category: Category) => void;
  showRandomButton?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  maxDisplay?: number;
  className?: string;
}

interface CategoryFilter {
  type: 'all' | 'things' | 'emotions' | 'animals' | 'food' | 'places' | 'activities' | 'objects';
  search: string;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  onCategorySelect,
  showRandomButton = true,
  showSearch = true,
  showFilters = true,
  maxDisplay = 20,
  className = ''
}) => {
  const { language } = useLanguage();
  const [filter, setFilter] = useState<CategoryFilter>({
    type: 'all',
    search: ''
  });

  // Filter categories based on search and type
  const filteredCategories = useMemo(() => {
    let filtered = gameCategories;

    // Apply search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(category => 
        category.es.toLowerCase().includes(searchLower) ||
        category.en.toLowerCase().includes(searchLower) ||
        category.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (filter.type !== 'all') {
      filtered = filtered.filter(category => {
        const id = category.id.toLowerCase();
        switch (filter.type) {
          case 'things':
            return id.includes('things-') || id.includes('items') || id.includes('objects');
          case 'emotions':
            return id.includes('emotions') || id.includes('feelings');
          case 'animals':
            return id.includes('animals') || id.includes('creatures');
          case 'food':
            return id.includes('food') || id.includes('drinks') || id.includes('fruits') || 
                   id.includes('vegetables') || id.includes('cooking') || id.includes('fast-food');
          case 'places':
            return id.includes('countries') || id.includes('cities') || id.includes('places') ||
                   id.includes('office') || id.includes('hospital') || id.includes('classroom') ||
                   id.includes('park') || id.includes('bedroom') || id.includes('farm') ||
                   id.includes('store') || id.includes('beach') || id.includes('space');
          case 'activities':
            return id.includes('dance') || id.includes('music') || id.includes('sports') ||
                   id.includes('games') || id.includes('play') || id.includes('transport');
          case 'objects':
            return id.includes('tools') || id.includes('furniture') || id.includes('electronics') ||
                   id.includes('clothing') || id.includes('jewelry') || id.includes('shapes') ||
                   id.includes('brands') || id.includes('currencies') || id.includes('elements');
          default:
            return true;
        }
      });
    }

    return filtered.slice(0, maxDisplay);
  }, [filter, maxDisplay]);

  const handleRandomCategory = () => {
    const randomCategory = getRandomCategory();
    onCategorySelect?.(randomCategory);
  };

  const handleCategoryClick = (category: Category) => {
    onCategorySelect?.(category);
  };

  const getCategoryDisplayName = (category: Category) => {
    return language === 'es' ? category.es : category.en;
  };

  const filterOptions = [
    { value: 'all', label: language === 'es' ? 'Todos' : 'All' },
    { value: 'things', label: language === 'es' ? 'Cosas' : 'Things' },
    { value: 'emotions', label: language === 'es' ? 'Emociones' : 'Emotions' },
    { value: 'animals', label: language === 'es' ? 'Animales' : 'Animals' },
    { value: 'food', label: language === 'es' ? 'Comida' : 'Food' },
    { value: 'places', label: language === 'es' ? 'Lugares' : 'Places' },
    { value: 'activities', label: language === 'es' ? 'Actividades' : 'Activities' },
    { value: 'objects', label: language === 'es' ? 'Objetos' : 'Objects' }
  ];

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          {language === 'es' ? 'Gestor de Categorías' : 'Category Manager'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'es' ? 'Buscar categorías...' : 'Search categories...'}
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
              {filter.search && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter(prev => ({ ...prev, search: '' }))}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          
          {showFilters && (
            <select
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value as any }))}
              className="px-3 py-2 border rounded-md bg-background"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Random Button */}
        {showRandomButton && (
          <Button
            onClick={handleRandomCategory}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            {language === 'es' ? 'Categoría Aleatoria' : 'Random Category'}
          </Button>
        )}

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredCategories.map((category) => (
            <Button
              key={category.id}
              variant="outline"
              onClick={() => handleCategoryClick(category)}
              className="h-auto p-3 text-left justify-start"
            >
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm">
                  {getCategoryDisplayName(category)}
                </span>
                <Badge variant="secondary" className="text-xs mt-1">
                  {category.id}
                </Badge>
              </div>
            </Button>
          ))}
        </div>

        {/* Results Info */}
        <div className="text-sm text-muted-foreground text-center">
          {language === 'es' 
            ? `Mostrando ${filteredCategories.length} de ${gameCategories.length} categorías`
            : `Showing ${filteredCategories.length} of ${gameCategories.length} categories`
          }
        </div>
      </CardContent>
    </Card>
  );
};

// Utility functions for external use
export const categoryUtils = {
  getRandomCategory,
  getAllCategories: () => gameCategories,
  getCategoryById: (id: string) => gameCategories.find(cat => cat.id === id),
  getCategoriesByType: (type: string) => {
    return gameCategories.filter(category => {
      const id = category.id.toLowerCase();
      switch (type) {
        case 'things':
          return id.includes('things-') || id.includes('items') || id.includes('objects');
        case 'emotions':
          return id.includes('emotions') || id.includes('feelings');
        case 'animals':
          return id.includes('animals') || id.includes('creatures');
        case 'food':
          return id.includes('food') || id.includes('drinks') || id.includes('fruits') || 
                 id.includes('vegetables') || id.includes('cooking') || id.includes('fast-food');
        case 'places':
          return id.includes('countries') || id.includes('cities') || id.includes('places') ||
                 id.includes('office') || id.includes('hospital') || id.includes('classroom') ||
                 id.includes('park') || id.includes('bedroom') || id.includes('farm') ||
                 id.includes('store') || id.includes('beach') || id.includes('space');
        case 'activities':
          return id.includes('dance') || id.includes('music') || id.includes('sports') ||
                 id.includes('games') || id.includes('play') || id.includes('transport');
        case 'objects':
          return id.includes('tools') || id.includes('furniture') || id.includes('electronics') ||
                 id.includes('clothing') || id.includes('jewelry') || id.includes('shapes') ||
                 id.includes('brands') || id.includes('currencies') || id.includes('elements');
        default:
          return true;
      }
    });
  },
  searchCategories: (query: string) => {
    const queryLower = query.toLowerCase();
    return gameCategories.filter(category => 
      category.es.toLowerCase().includes(queryLower) ||
      category.en.toLowerCase().includes(queryLower) ||
      category.id.toLowerCase().includes(queryLower)
    );
  }
}; 