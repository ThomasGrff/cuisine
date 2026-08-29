/**
 * Calculateur de coût pour les recettes et ingrédients
 */
import { store } from './store.js';

export const CostCalculator = {
  /**
   * Calcule le coût d'une ligne d'ingrédient dans une recette
   * @param {Object} recipeIngredient - { ingredient_id, quantite, unite }
   * @param {number} scaleFactor - multiplicateur de portion (ex: 1.5)
   * @returns {number} coût calculé en euros
   */
  calculateIngredientCost(recipeIngredient, scaleFactor = 1) {
    const ingredient = store.ingredientsMap.get(recipeIngredient.ingredient_id);
    if (!ingredient || typeof ingredient.prix_indicatif !== 'number') {
      return 0;
    }

    const qty = recipeIngredient.quantite * scaleFactor;
    const reqUnit = (recipeIngredient.unite || '').toLowerCase().trim();
    const baseUnit = (ingredient.unite || '').toLowerCase().trim();
    const basePrice = ingredient.prix_indicatif;

    // Conversion g -> kg
    if (baseUnit === 'kg' && (reqUnit === 'g' || reqUnit === 'gr')) {
      return (qty / 1000) * basePrice;
    }

    // Conversion ml / cl -> l
    if (baseUnit === 'l' && reqUnit === 'ml') {
      return (qty / 1000) * basePrice;
    }
    if (baseUnit === 'l' && reqUnit === 'cl') {
      return (qty / 100) * basePrice;
    }

    // Unités directes (pièce, botte, sachet, kg, l)
    return qty * basePrice;
  },

  /**
   * Calcule le coût total estimé d'une recette
   * @param {Object} recipe 
   * @param {number} targetPortions 
   * @returns {{ totalCost: number, costPerPortion: number }}
   */
  calculateRecipeCost(recipe, targetPortions = null) {
    if (!recipe || !Array.isArray(recipe.ingredients)) {
      return { totalCost: 0, costPerPortion: 0 };
    }

    const basePortions = recipe.portions || 1;
    const currentPortions = targetPortions || basePortions;
    const scaleFactor = currentPortions / basePortions;

    const totalCost = recipe.ingredients.reduce((sum, item) => {
      return sum + this.calculateIngredientCost(item, scaleFactor);
    }, 0);

    const costPerPortion = currentPortions > 0 ? totalCost / currentPortions : totalCost;

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      costPerPortion: Math.round(costPerPortion * 100) / 100
    };
  },

  /**
   * Formate un montant en devise française (€)
   * @param {number} amount 
   * @returns {string} ex: "4,50 €"
   */
  formatCurrency(amount) {
    if (isNaN(amount)) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
};
