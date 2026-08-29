/**
 * Store - Gestionnaire d'état centralisé pour le carnet de recettes
 */
export const store = {
  ingredients: [],
  ingredientsMap: new Map(),
  recipes: [],
  categories: [],
  allTags: [],
  
  // État de l'interface
  state: {
    activeTab: 'catalog', // 'catalog' | 'pantry' | 'ingredients'
    searchQuery: '',
    selectedCategory: 'all',
    selectedTags: new Set(),
    pantryIngredients: new Set(JSON.parse(localStorage.getItem('cuisine_pantry') || '[]')),
    favorites: new Set(JSON.parse(localStorage.getItem('cuisine_favorites') || '[]')),
    activeRecipeModal: null
  },

  listeners: new Set(),

  // Abonnement aux changements d'état
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },

  notify(event, data) {
    this.listeners.forEach(cb => cb(event, data, this.state));
  },

  // Chargement des données JSON
  async init() {
    try {
      const [ingRes, recRes] = await Promise.all([
        fetch('data/ingredients.json'),
        fetch('data/recipes.json')
      ]);

      if (!ingRes.ok || !recRes.ok) {
        throw new Error('Erreur lors du chargement des fichiers JSON de données.');
      }

      this.ingredients = await ingRes.json();
      this.recipes = await recRes.json();

      // Indexation des ingrédients par ID
      this.ingredientsMap.clear();
      this.ingredients.forEach(ing => this.ingredientsMap.set(ing.id, ing));

      // Extraction des catégories et tags uniques
      const categoriesSet = new Set(this.recipes.map(r => r.categorie));
      this.categories = Array.from(categoriesSet);

      const tagsSet = new Set();
      this.recipes.forEach(r => r.tags?.forEach(t => tagsSet.add(t)));
      this.allTags = Array.from(tagsSet);

      this.notify('DATA_LOADED');
      return true;
    } catch (err) {
      console.error('Erreur initialisation store:', err);
      this.notify('DATA_ERROR', err);
      return false;
    }
  },

  // Actions d'état
  setActiveTab(tab) {
    this.state.activeTab = tab;
    this.notify('TAB_CHANGED', tab);
  },

  setSearchQuery(query) {
    this.state.searchQuery = query;
    this.notify('FILTER_CHANGED');
  },

  setSelectedCategory(cat) {
    this.state.selectedCategory = cat;
    this.notify('FILTER_CHANGED');
  },

  toggleTag(tag) {
    if (this.state.selectedTags.has(tag)) {
      this.state.selectedTags.delete(tag);
    } else {
      this.state.selectedTags.add(tag);
    }
    this.notify('FILTER_CHANGED');
  },

  clearFilters() {
    this.state.searchQuery = '';
    this.state.selectedCategory = 'all';
    this.state.selectedTags.clear();
    this.notify('FILTER_CHANGED');
  },

  // Placard
  togglePantryIngredient(ingId) {
    if (this.state.pantryIngredients.has(ingId)) {
      this.state.pantryIngredients.delete(ingId);
    } else {
      this.state.pantryIngredients.add(ingId);
    }
    localStorage.setItem('cuisine_pantry', JSON.stringify(Array.from(this.state.pantryIngredients)));
    this.notify('PANTRY_CHANGED');
  },

  clearPantry() {
    this.state.pantryIngredients.clear();
    localStorage.setItem('cuisine_pantry', JSON.stringify([]));
    this.notify('PANTRY_CHANGED');
  },

  // Favoris
  toggleFavorite(recipeId) {
    if (this.state.favorites.has(recipeId)) {
      this.state.favorites.delete(recipeId);
    } else {
      this.state.favorites.add(recipeId);
    }
    localStorage.setItem('cuisine_favorites', JSON.stringify(Array.from(this.state.favorites)));
    this.notify('FAVORITES_CHANGED');
  },

  isFavorite(recipeId) {
    return this.state.favorites.has(recipeId);
  },

  // Modal Recette
  openRecipeModal(recipeId) {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (recipe) {
      this.state.activeRecipeModal = recipe;
      this.notify('OPEN_RECIPE_MODAL', recipe);
    }
  },

  closeRecipeModal() {
    this.state.activeRecipeModal = null;
    this.notify('CLOSE_RECIPE_MODAL');
  }
};
