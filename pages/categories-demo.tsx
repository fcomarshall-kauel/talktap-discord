import React, { useState } from 'react';
import { CategoryManager, categoryUtils } from '../src/components/CategoryManager';
import { Category } from '../src/data/categories';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Badge } from '../src/components/ui/badge';
import { Button } from '../src/components/ui/button';
import { LanguageToggle } from '../src/components/LanguageToggle';
import { useLanguage } from '../src/hooks/useLanguage';

export default function CategoriesDemo() {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [randomCategory, setRandomCategory] = useState<Category | null>(null);
  const [searchResults, setSearchResults] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleRandomCategory = () => {
    const random = categoryUtils.getRandomCategory();
    setRandomCategory(random);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const results = categoryUtils.searchCategories(searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const getCategoryDisplayName = (category: Category) => {
    return language === 'es' ? category.es : category.en;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {language === 'es' ? 'Demo del Gestor de Categorías' : 'Category Manager Demo'}
            </h1>
            <p className="text-gray-600 mt-2">
              {language === 'es' 
                ? 'Explora y gestiona las categorías del juego de manera independiente'
                : 'Explore and manage game categories independently'
              }
            </p>
          </div>
          <LanguageToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Manager */}
          <div>
            <CategoryManager
              onCategorySelect={handleCategorySelect}
              showRandomButton={true}
              showSearch={true}
              showFilters={true}
              maxDisplay={15}
            />
          </div>

          {/* Selected Category Display */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'es' ? 'Categoría Seleccionada' : 'Selected Category'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCategory ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{selectedCategory.id}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {language === 'es' ? 'ID de categoría' : 'Category ID'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Español:</p>
                      <p className="text-sm bg-gray-50 p-2 rounded">{selectedCategory.es}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">English:</p>
                      <p className="text-sm bg-gray-50 p-2 rounded">{selectedCategory.en}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {language === 'es' 
                      ? 'Selecciona una categoría del gestor'
                      : 'Select a category from the manager'
                    }
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Random Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{language === 'es' ? 'Categoría Aleatoria' : 'Random Category'}</span>
                  <Button onClick={handleRandomCategory} size="sm" variant="outline">
                    {language === 'es' ? 'Generar' : 'Generate'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {randomCategory ? (
                  <div className="space-y-2">
                    <Badge variant="secondary">{randomCategory.id}</Badge>
                    <p className="font-medium">{getCategoryDisplayName(randomCategory)}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {language === 'es' 
                      ? 'Haz clic en "Generar" para obtener una categoría aleatoria'
                      : 'Click "Generate" to get a random category'
                    }
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Utility Functions Demo */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'es' ? 'Funciones de Utilidad' : 'Utility Functions'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Demo */}
            <div className="space-y-2">
              <h3 className="font-medium">
                {language === 'es' ? 'Búsqueda de Categorías' : 'Category Search'}
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md bg-white text-gray-900 placeholder-gray-500"
                />
                <Button onClick={handleSearch} size="sm">
                  {language === 'es' ? 'Buscar' : 'Search'}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {searchResults.slice(0, 6).map((category) => (
                    <div key={category.id} className="p-2 bg-gray-50 rounded text-sm">
                      <Badge variant="outline" className="text-xs">{category.id}</Badge>
                      <p className="font-medium mt-1">{getCategoryDisplayName(category)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Types Demo */}
            <div className="space-y-2">
              <h3 className="font-medium">
                {language === 'es' ? 'Tipos de Categorías' : 'Category Types'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['things', 'emotions', 'animals', 'food', 'places', 'activities', 'objects'].map((type) => {
                  const categories = categoryUtils.getCategoriesByType(type);
                  return (
                    <div key={type} className="p-2 bg-blue-50 rounded text-center">
                      <p className="font-medium text-sm capitalize">{type}</p>
                      <p className="text-xs text-muted-foreground">{categories.length} {language === 'es' ? 'categorías' : 'categories'}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-2">
              <h3 className="font-medium">
                {language === 'es' ? 'Estadísticas' : 'Statistics'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 bg-green-50 rounded text-center">
                  <p className="font-medium text-sm">
                    {language === 'es' ? 'Total' : 'Total'}
                  </p>
                  <p className="text-lg font-bold">{categoryUtils.getAllCategories().length}</p>
                </div>
                <div className="p-2 bg-yellow-50 rounded text-center">
                  <p className="font-medium text-sm">
                    {language === 'es' ? 'Cosas' : 'Things'}
                  </p>
                  <p className="text-lg font-bold">{categoryUtils.getCategoriesByType('things').length}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded text-center">
                  <p className="font-medium text-sm">
                    {language === 'es' ? 'Animales' : 'Animals'}
                  </p>
                  <p className="text-lg font-bold">{categoryUtils.getCategoriesByType('animals').length}</p>
                </div>
                <div className="p-2 bg-red-50 rounded text-center">
                  <p className="font-medium text-sm">
                    {language === 'es' ? 'Comida' : 'Food'}
                  </p>
                  <p className="text-lg font-bold">{categoryUtils.getCategoriesByType('food').length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 