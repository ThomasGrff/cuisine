/**
 * Gestionnaire de la modale détaillée de recette
 */
import { store } from './store.js';
import { CostCalculator } from './cost-calculator.js';

export const RecipeModal = {
  activeRecipe: null,
  currentPortions: 4,
  checkedIngredients: new Set(),
  checkedSteps: new Set(),

  init() {
    // Écouter les événements du store
    store.subscribe((event, data) => {
      if (event === 'OPEN_RECIPE_MODAL') {
        this.open(data);
      } else if (event === 'CLOSE_RECIPE_MODAL') {
        this.close();
      }
    });

    // Fermeture avec la touche Échap
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeRecipe) {
        store.closeRecipeModal();
      }
    });
  },

  open(recipe) {
    this.activeRecipe = recipe;
    this.currentPortions = recipe.portions || 4;
    this.checkedIngredients.clear();
    this.checkedSteps.clear();

    const modalContainer = document.getElementById('recipe-modal-container');
    if (!modalContainer) return;

    modalContainer.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    this.render();
  },

  close() {
    this.activeRecipe = null;
    const modalContainer = document.getElementById('recipe-modal-container');
    if (modalContainer) {
      modalContainer.classList.add('hidden');
    }
    document.body.classList.remove('overflow-hidden');
  },

  changePortions(delta) {
    const newPortions = Math.max(1, Math.min(30, this.currentPortions + delta));
    if (newPortions !== this.currentPortions) {
      this.currentPortions = newPortions;
      this.render();
    }
  },

  toggleIngredientCheck(index) {
    if (this.checkedIngredients.has(index)) {
      this.checkedIngredients.delete(index);
    } else {
      this.checkedIngredients.add(index);
    }
    this.render();
  },

  toggleStepCheck(index) {
    if (this.checkedSteps.has(index)) {
      this.checkedSteps.delete(index);
    } else {
      this.checkedSteps.add(index);
    }
    this.render();
  },

  formatQuantity(baseQty, basePortions, currentPortions) {
    if (!baseQty) return '';
    const scaled = (baseQty / basePortions) * currentPortions;
    // Arrondir joliment (ex: 2.5 au lieu de 2.5000000001, 1/3 -> 0.33)
    const rounded = Math.round(scaled * 10) / 10;
    return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1).replace('.', ',');
  },

  render() {
    const recipe = this.activeRecipe;
    if (!recipe) return;

    const modalContent = document.getElementById('recipe-modal-body');
    if (!modalContent) return;

    const basePortions = recipe.portions || 1;
    const scaleFactor = this.currentPortions / basePortions;
    const costInfo = CostCalculator.calculateRecipeCost(recipe, this.currentPortions);
    const totalTime = (recipe.temps_preparation || 0) + (recipe.temps_cuisson || 0);
    const isFav = store.isFavorite(recipe.id);

    modalContent.innerHTML = `
      <div class="relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full mx-auto my-6 border border-amber-100/60 max-h-[90vh] flex flex-col">
        
        <!-- En-tête avec Image de couverture -->
        <div class="relative h-64 sm:h-80 w-full shrink-0 overflow-hidden bg-amber-950">
          <img 
            src="${recipe.image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80'}" 
            alt="${recipe.titre}" 
            class="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
          
          <!-- Boutons flottants hauts -->
          <div class="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button 
              id="modal-fav-btn"
              title="Ajouter aux favoris"
              class="p-2.5 rounded-full backdrop-blur-md ${isFav ? 'bg-rose-500 text-white' : 'bg-white/80 text-gray-700 hover:bg-white'} shadow-md transition-all active:scale-95"
            >
              <i data-lucide="heart" class="w-5 h-5 ${isFav ? 'fill-current' : ''}"></i>
            </button>
            <button 
              id="modal-print-btn"
              title="Imprimer la fiche recette"
              class="p-2.5 rounded-full backdrop-blur-md bg-white/80 text-gray-700 hover:bg-white shadow-md transition-all active:scale-95 no-print"
            >
              <i data-lucide="printer" class="w-5 h-5"></i>
            </button>
            <button 
              id="modal-close-btn"
              title="Fermer"
              class="p-2.5 rounded-full backdrop-blur-md bg-white/80 text-gray-700 hover:bg-white shadow-md transition-all active:scale-95"
            >
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <!-- Titre & Catégorie sur l'image -->
          <div class="absolute bottom-4 left-4 right-4 text-white">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="px-3 py-1 bg-amber-600/90 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase shadow-sm">
                ${recipe.categorie || 'Recette'}
              </span>
              ${(recipe.tags || []).map(tag => `
                <span class="px-2.5 py-0.5 bg-black/40 backdrop-blur-md text-amber-200 border border-amber-300/30 rounded-full text-xs font-medium">
                  #${tag}
                </span>
              `).join('')}
            </div>
            <h2 class="text-2xl sm:text-3xl font-bold font-serif text-amber-50 drop-shadow-md">
              ${recipe.titre}
            </h2>
          </div>
        </div>

        <!-- Métadonnées Rapides (Temps, Difficulté, Coût estimé) -->
        <div class="bg-amber-50/70 border-b border-amber-100/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-700 shrink-0">
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <i data-lucide="clock" class="w-4 h-4 text-amber-600"></i>
              <span>Total : <strong class="text-gray-900">${totalTime} min</strong></span>
              <span class="text-xs text-gray-500 font-normal">(${recipe.temps_preparation}m prép + ${recipe.temps_cuisson}m cuisson)</span>
            </div>
            <div class="flex items-center gap-2">
              <i data-lucide="chef-hat" class="w-4 h-4 text-amber-600"></i>
              <span>Difficulté : <strong class="text-gray-900">${recipe.difficulte || 'Facile'}</strong></span>
            </div>
          </div>

          <div class="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-full border border-amber-200/70 shadow-sm text-emerald-800 font-semibold">
            <i data-lucide="coins" class="w-4 h-4 text-emerald-600"></i>
            <span>Coût total : ${CostCalculator.formatCurrency(costInfo.totalCost)}</span>
            <span class="text-xs text-emerald-600/80 font-normal">(${CostCalculator.formatCurrency(costInfo.costPerPortion)}/pers.)</span>
          </div>
        </div>

        <!-- Corps scrollable de la modale -->
        <div class="overflow-y-auto p-6 space-y-8 flex-1 custom-scrollbar">
          
          <!-- Description -->
          <p class="text-gray-600 text-base leading-relaxed italic border-l-4 border-amber-500 pl-4 bg-amber-50/40 py-2 rounded-r-lg">
            « ${recipe.description} »
          </p>

          <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            <!-- Colonne de Gauche : Ingrédients & Portions (5 cols) -->
            <div class="md:col-span-5 bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
              
              <!-- Ajusteur de portions interactif -->
              <div class="flex items-center justify-between pb-4 mb-4 border-b border-amber-200/60">
                <div>
                  <h3 class="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <i data-lucide="shopping-basket" class="w-5 h-5 text-amber-600"></i>
                    Ingrédients
                  </h3>
                  <p class="text-xs text-gray-500">Quantités recalculées en direct</p>
                </div>
                
                <div class="flex items-center bg-white border border-amber-300 rounded-xl p-1 shadow-sm">
                  <button 
                    id="btn-decrease-portion"
                    class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 text-gray-700 font-bold transition active:scale-95"
                    title="Diminuer les portions"
                  >
                    -
                  </button>
                  <span class="px-3 text-sm font-bold text-amber-900 whitespace-nowrap">
                    ${this.currentPortions} <span class="text-xs font-normal text-gray-500">${this.currentPortions > 1 ? 'pers.' : 'pers.'}</span>
                  </span>
                  <button 
                    id="btn-increase-portion"
                    class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 text-gray-700 font-bold transition active:scale-95"
                    title="Augmenter les portions"
                  >
                    +
                  </button>
                </div>
              </div>

              <!-- Liste des ingrédients cochables -->
              <ul class="space-y-2.5">
                ${(recipe.ingredients || []).map((item, idx) => {
                  const ingObj = store.ingredientsMap.get(item.ingredient_id) || { nom: 'Ingrédient', unite: item.unite };
                  const isChecked = this.checkedIngredients.has(idx);
                  const isOwnedInPantry = store.state.pantryIngredients.has(item.ingredient_id);
                  const scaledQty = this.formatQuantity(item.quantite, basePortions, this.currentPortions);
                  const itemCost = CostCalculator.calculateIngredientCost(item, scaleFactor);

                  return `
                    <li 
                      data-ingredient-idx="${idx}"
                      class="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition border ${isChecked ? 'bg-amber-100/60 border-amber-200 opacity-60 line-through' : 'bg-white border-amber-100 hover:border-amber-300 shadow-sm'}"
                    >
                      <div class="flex items-center gap-3 min-w-0 pr-2">
                        <input 
                          type="checkbox" 
                          ${isChecked ? 'checked' : ''} 
                          class="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 pointer-events-none"
                        />
                        <div class="truncate">
                          <span class="font-medium text-gray-900 text-sm ${isChecked ? 'line-through text-gray-500' : ''}">
                            ${ingObj.nom}
                          </span>
                          ${isOwnedInPantry ? `
                            <span class="ml-1.5 inline-flex items-center text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                              Placard ✓
                            </span>
                          ` : ''}
                        </div>
                      </div>

                      <div class="text-right shrink-0">
                        <span class="font-semibold text-amber-900 text-sm">
                          ${scaledQty} ${item.unite || ''}
                        </span>
                        <div class="text-[11px] text-gray-400 font-normal">
                          ~ ${CostCalculator.formatCurrency(itemCost)}
                        </div>
                      </div>
                    </li>
                  `;
                }).join('')}
              </ul>
            </div>

            <!-- Colonne de Droite : Étapes de Préparation (7 cols) -->
            <div class="md:col-span-7 space-y-4">
              <div class="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 class="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <i data-lucide="list-ordered" class="w-5 h-5 text-amber-600"></i>
                  Étapes de Préparation
                </h3>
                <span class="text-xs text-gray-500 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                  ${this.checkedSteps.size} / ${(recipe.etapes || []).length} terminées
                </span>
              </div>

              <div class="space-y-3.5">
                ${(recipe.etapes || []).map((etape, idx) => {
                  const isDone = this.checkedSteps.has(idx);
                  return `
                    <div 
                      data-step-idx="${idx}"
                      class="flex items-start gap-3.5 p-4 rounded-2xl cursor-pointer transition border ${isDone ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-gray-100 hover:border-amber-200 shadow-sm'}"
                    >
                      <div class="mt-0.5 shrink-0">
                        <span class="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition ${isDone ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-800'}">
                          ${isDone ? '✓' : idx + 1}
                        </span>
                      </div>
                      <div class="flex-1 text-sm leading-relaxed ${isDone ? 'text-gray-500 line-through' : 'text-gray-800 font-normal'}">
                        ${etape}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

          </div>

        </div>

        <!-- Pied de page avec bouton de fermeture / impression -->
        <div class="bg-gray-50 px-6 py-3.5 border-t border-gray-200/80 flex items-center justify-between shrink-0">
          <div class="text-xs text-gray-500 flex items-center gap-1.5">
            <i data-lucide="info" class="w-4 h-4 text-amber-600"></i>
            <span>Cochez les ingrédients et étapes au fur et à mesure en cuisinant.</span>
          </div>
          <button 
            id="modal-bottom-close-btn"
            class="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            Fermer la fiche
          </button>
        </div>

      </div>
    `;

    // Attacher les gestionnaires d'événements
    this.attachEventListeners();
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  attachEventListeners() {
    // Boutons de fermeture
    document.getElementById('modal-close-btn')?.addEventListener('click', () => store.closeRecipeModal());
    document.getElementById('modal-bottom-close-btn')?.addEventListener('click', () => store.closeRecipeModal());

    // Favoris
    document.getElementById('modal-fav-btn')?.addEventListener('click', () => {
      if (this.activeRecipe) {
        store.toggleFavorite(this.activeRecipe.id);
        this.render();
      }
    });

    // Impression
    document.getElementById('modal-print-btn')?.addEventListener('click', () => {
      window.print();
    });

    // Ajustement de portions
    document.getElementById('btn-decrease-portion')?.addEventListener('click', () => this.changePortions(-1));
    document.getElementById('btn-increase-portion')?.addEventListener('click', () => this.changePortions(+1));

    // Clic sur un ingrédient
    document.querySelectorAll('[data-ingredient-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-ingredient-idx'), 10);
        this.toggleIngredientCheck(idx);
      });
    });

    // Clic sur une étape
    document.querySelectorAll('[data-step-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-step-idx'), 10);
        this.toggleStepCheck(idx);
      });
    });
  }
};
