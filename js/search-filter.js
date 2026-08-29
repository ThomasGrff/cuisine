/**
 * Moteur de recherche et filtrage multi-critères
 */
import { store } from './store.js';

export const SearchFilter = {
  /**
   * Normalise une chaîne de caractères (minuscules, sans accents)
   */
  normalize(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  },

  /**
   * Filtre la liste des recettes selon l'état actuel du store
   * @returns {Array<Object>}
   */
  filterRecipes() {
    const { searchQuery, selectedCategory, selectedTags } = store.state;
    const query = this.normalize(searchQuery);

    return store.recipes.filter(recipe => {
      // 1. Filtre par Catégorie
      if (selectedCategory && selectedCategory !== 'all') {
        if (recipe.categorie !== selectedCategory) {
          return false;
        }
      }

      // 2. Filtre par Tags (tous les tags sélectionnés doivent être présents)
      if (selectedTags.size > 0) {
        const recipeTags = new Set(recipe.tags || []);
        for (const tag of selectedTags) {
          if (!recipeTags.has(tag)) {
            return false;
          }
        }
      }

      // 3. Recherche textuelle
      if (query) {
        const titleNorm = this.normalize(recipe.titre);
        const descNorm = this.normalize(recipe.description);
        const tagsNorm = (recipe.tags || []).map(t => this.normalize(t)).join(' ');

        // Recherche aussi dans les noms des ingrédients
        const ingredientsNorm = (recipe.ingredients || [])
          .map(i => {
            const ingObj = store.ingredientsMap.get(i.ingredient_id);
            return ingObj ? this.normalize(ingObj.nom) : '';
          })
          .join(' ');

        const matchesTitle = titleNorm.includes(query);
        const matchesDesc = descNorm.includes(query);
        const matchesTags = tagsNorm.includes(query);
        const matchesIng = ingredientsNorm.includes(query);

        if (!matchesTitle && !matchesDesc && !matchesTags && !matchesIng) {
          return false;
        }
      }

      return true;
    });
  }
};
