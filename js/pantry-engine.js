/**
 * Moteur de suggestions "Dans mon Placard"
 */
import { store } from './store.js';

export const PantryEngine = {
  /**
   * Analyse toutes les recettes en fonction des ingrédients sélectionnés dans le placard
   * @param {Set<string>} pantryIngredientIds 
   * @returns {Array<Object>} Liste des recettes enrichies avec métadonnées de matching
   */
  matchRecipes(pantryIngredientIds) {
    if (!pantryIngredientIds || pantryIngredientIds.size === 0) {
      return [];
    }

    const results = [];

    store.recipes.forEach(recipe => {
      const totalIngredients = recipe.ingredients || [];
      const totalCount = totalIngredients.length;
      if (totalCount === 0) return;

      const ownedIngredients = [];
      const missingIngredients = [];

      totalIngredients.forEach(item => {
        const isOwned = pantryIngredientIds.has(item.ingredient_id);
        const ingredientInfo = store.ingredientsMap.get(item.ingredient_id) || { nom: 'Ingrédient', unite: item.unite };
        const enrichedItem = {
          ...item,
          nom: ingredientInfo.nom,
          categorie: ingredientInfo.categorie
        };

        if (isOwned) {
          ownedIngredients.push(enrichedItem);
        } else {
          missingIngredients.push(enrichedItem);
        }
      });

      const ownedCount = ownedIngredients.length;
      const matchPercentage = Math.round((ownedCount / totalCount) * 100);

      // On ne retient que les recettes ayant au moins 1 ingrédient correspondant
      if (ownedCount > 0) {
        results.push({
          recipe,
          totalCount,
          ownedCount,
          missingCount: missingIngredients.length,
          matchPercentage,
          ownedIngredients,
          missingIngredients,
          isFullyAvailable: ownedCount === totalCount
        });
      }
    });

    // Tri : 100% de matching en premier, puis pourcentage décroissant, puis nombre d'ingrédients possédés
    results.sort((a, b) => {
      if (b.matchPercentage !== a.matchPercentage) {
        return b.matchPercentage - a.matchPercentage;
      }
      return b.ownedCount - a.ownedCount;
    });

    return results;
  }
};
