/**
 * Point d'entrée principal de l'application Carnet de Cuisine
 */
import { store } from './store.js';
import { SearchFilter } from './search-filter.js';
import { PantryEngine } from './pantry-engine.js';
import { CostCalculator } from './cost-calculator.js';
import { RecipeModal } from './recipe-modal.js';

export const App = {
  async init() {
    RecipeModal.init();

    // Abonnement aux changements d'état
    store.subscribe((event) => {
      this.handleStateChange(event);
    });

    // Initialisation des listeners globaux (tabs, inputs)
    this.setupGlobalEvents();

    // Chargement initial des données
    const success = await store.init();
    if (success) {
      this.render();
    }
  },

  setupGlobalEvents() {
    // Changement d'onglets
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab-target');
        store.setActiveTab(tab);
      });
    });

    // Barre de recherche textuelle globale
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        store.setSearchQuery(e.target.value);
      });
    }

    // Réinitialisation des filtres
    document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
      store.clearFilters();
      if (searchInput) searchInput.value = '';
    });

    // Clic sur l'arrière-plan de la modale pour fermer
    const modalContainer = document.getElementById('recipe-modal-container');
    if (modalContainer) {
      modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
          store.closeRecipeModal();
        }
      });
    }
  },

  handleStateChange(event) {
    if (event === 'TAB_CHANGED') {
      this.updateActiveTabUI();
      this.renderCurrentView();
    } else if (event === 'FILTER_CHANGED' || event === 'FAVORITES_CHANGED') {
      this.renderCatalog();
      this.renderFilterBadges();
    } else if (event === 'PANTRY_CHANGED') {
      this.renderPantry();
      this.updatePantryCounter();
      // Si on est sur le catalogue, on met à jour les indicateurs
      if (store.state.activeTab === 'catalog') {
        this.renderCatalog();
      }
    } else if (event === 'DATA_LOADED') {
      this.render();
    }
  },

  updateActiveTabUI() {
    const activeTab = store.state.activeTab;
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      const target = btn.getAttribute('data-tab-target');
      const isActive = target === activeTab;
      if (isActive) {
        btn.classList.add('bg-amber-600', 'text-white', 'shadow-md');
        btn.classList.remove('text-gray-600', 'hover:bg-amber-50');
      } else {
        btn.classList.remove('bg-amber-600', 'text-white', 'shadow-md');
        btn.classList.add('text-gray-600', 'hover:bg-amber-50');
      }
    });

    // Afficher la bonne section
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.add('hidden');
    });
    const activeSec = document.getElementById(`view-${activeTab}`);
    if (activeSec) {
      activeSec.classList.remove('hidden');
    }
  },

  updatePantryCounter() {
    const count = store.state.pantryIngredients.size;
    const badge = document.getElementById('pantry-count-badge');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  },

  render() {
    this.updateActiveTabUI();
    this.updatePantryCounter();
    this.renderCategoryFilters();
    this.renderTagFilters();
    this.renderCurrentView();
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  renderCurrentView() {
    const tab = store.state.activeTab;
    if (tab === 'catalog') {
      this.renderCatalog();
    } else if (tab === 'pantry') {
      this.renderPantry();
    } else if (tab === 'ingredients') {
      this.renderIngredientsDirectory();
    }
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // ==========================================
  // 1. CATALOGUE & FILTRES
  // ==========================================

  renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;

    const currentCat = store.state.selectedCategory;
    const categories = ['all', ...store.categories];

    const categoryLabels = {
      'all': 'Toutes les recettes',
      'Entrée': '🥗 Entrées',
      'Plat': '🍲 Plats',
      'Dessert': '🍰 Desserts'
    };

    container.innerHTML = categories.map(cat => {
      const isSelected = currentCat === cat;
      return `
        <button 
          data-category="${cat}"
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
            isSelected 
              ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600 ring-offset-2' 
              : 'bg-white text-gray-700 hover:bg-amber-50 border border-amber-200/70'
          }"
        >
          ${categoryLabels[cat] || cat}
        </button>
      `;
    }).join('');

    container.querySelectorAll('[data-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        store.setSelectedCategory(btn.getAttribute('data-category'));
      });
    });
  },

  renderTagFilters() {
    const container = document.getElementById('tag-filters');
    if (!container) return;

    container.innerHTML = store.allTags.map(tag => {
      const isSelected = store.state.selectedTags.has(tag);
      return `
        <button 
          data-tag="${tag}"
          class="px-3 py-1 rounded-full text-xs font-medium transition-all ${
            isSelected
              ? 'bg-amber-800 text-amber-50 shadow-sm ring-1 ring-amber-900'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
          }"
        >
          #${tag} ${isSelected ? '✕' : ''}
        </button>
      `;
    }).join('');

    container.querySelectorAll('[data-tag]').forEach(btn => {
      btn.addEventListener('click', () => {
        store.toggleTag(btn.getAttribute('data-tag'));
      });
    });
  },

  renderFilterBadges() {
    this.renderCategoryFilters();
    this.renderTagFilters();
  },

  renderCatalog() {
    const grid = document.getElementById('recipes-grid');
    const emptyState = document.getElementById('catalog-empty-state');
    const resultsCount = document.getElementById('results-count');
    if (!grid) return;

    const filtered = SearchFilter.filterRecipes();

    if (resultsCount) {
      resultsCount.textContent = `${filtered.length} recette${filtered.length > 1 ? 's' : ''}`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }

    emptyState?.classList.add('hidden');

    grid.innerHTML = filtered.map(recipe => {
      const isFav = store.isFavorite(recipe.id);
      const costInfo = CostCalculator.calculateRecipeCost(recipe);
      const totalTime = (recipe.temps_preparation || 0) + (recipe.temps_cuisson || 0);

      // Calcul des ingrédients du placard possédés
      const totalIng = (recipe.ingredients || []).length;
      const ownedIng = (recipe.ingredients || []).filter(i => store.state.pantryIngredients.has(i.ingredient_id)).length;
      const hasPantryMatches = store.state.pantryIngredients.size > 0 && ownedIng > 0;

      return `
        <article 
          data-recipe-card="${recipe.id}"
          class="group bg-white rounded-3xl overflow-hidden border border-amber-100/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
        >
          <!-- Image de la recette -->
          <div class="relative h-48 w-full overflow-hidden bg-amber-100">
            <img 
              src="${recipe.image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80'}" 
              alt="${recipe.titre}"
              loading="lazy"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>
            
            <!-- Badges hauts -->
            <div class="absolute top-3 left-3 flex items-center gap-1.5">
              <span class="px-2.5 py-1 bg-white/90 backdrop-blur-md text-amber-900 text-xs font-bold rounded-full shadow-sm">
                ${recipe.categorie}
              </span>
            </div>

            <!-- Bouton favori -->
            <button 
              data-fav-recipe="${recipe.id}"
              class="absolute top-3 right-3 p-2 rounded-full backdrop-blur-md ${isFav ? 'bg-rose-500 text-white' : 'bg-white/80 text-gray-700 hover:bg-white'} shadow-sm transition active:scale-90"
              title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}"
            >
              <i data-lucide="heart" class="w-4 h-4 ${isFav ? 'fill-current' : ''}"></i>
            </button>

            <!-- Badge Placard si disponible -->
            ${hasPantryMatches ? `
              <div class="absolute bottom-3 left-3">
                <span class="px-2.5 py-1 bg-emerald-600/95 backdrop-blur-md text-white text-xs font-semibold rounded-full shadow-sm flex items-center gap-1">
                  <i data-lucide="check" class="w-3 h-3"></i>
                  ${ownedIng}/${totalIng} dans le placard
                </span>
              </div>
            ` : ''}
          </div>

          <!-- Contenu texte -->
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="font-serif font-bold text-gray-900 text-lg group-hover:text-amber-700 transition line-clamp-1 mb-1.5">
                ${recipe.titre}
              </h3>
              <p class="text-xs text-gray-500 line-clamp-2 mb-3">
                ${recipe.description}
              </p>

              <!-- Tags -->
              <div class="flex flex-wrap gap-1.5 mb-4">
                ${(recipe.tags || []).slice(0, 3).map(tag => `
                  <span class="text-[11px] font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200/50">
                    #${tag}
                  </span>
                `).join('')}
              </div>
            </div>

            <!-- Pied de carte : Temps & Prix estimé -->
            <div class="pt-3 border-t border-amber-100 flex items-center justify-between text-xs text-gray-600 font-medium">
              <div class="flex items-center gap-1.5">
                <i data-lucide="clock" class="w-3.5 h-3.5 text-amber-600"></i>
                <span>${totalTime} min</span>
                <span class="text-gray-300">•</span>
                <span>${recipe.portions} pers.</span>
              </div>

              <div class="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/80">
                ~ ${CostCalculator.formatCurrency(costInfo.costPerPortion)}/p.
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Listeners pour l'ouverture de modale et favoris
    grid.querySelectorAll('[data-recipe-card]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-fav-recipe]')) return;
        const recipeId = card.getAttribute('data-recipe-card');
        store.openRecipeModal(recipeId);
      });
    });

    grid.querySelectorAll('[data-fav-recipe]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const recipeId = btn.getAttribute('data-fav-recipe');
        store.toggleFavorite(recipeId);
      });
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // ==========================================
  // 2. MODULE « DANS MON PLACARD »
  // ==========================================

  renderPantry() {
    this.renderPantryIngredientSelector();
    this.renderPantrySuggestions();
  },

  renderPantryIngredientSelector() {
    const container = document.getElementById('pantry-ingredients-selector');
    if (!container) return;

    // Grouper les ingrédients par catégorie
    const byCategory = {};
    store.ingredients.forEach(ing => {
      const cat = ing.categorie || 'Autre';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(ing);
    });

    container.innerHTML = Object.entries(byCategory).map(([category, items]) => {
      return `
        <div class="bg-white p-4 rounded-2xl border border-amber-100/80 shadow-sm">
          <h4 class="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
            <i data-lucide="tag" class="w-4 h-4 text-amber-600"></i>
            ${category}
          </h4>
          <div class="flex flex-wrap gap-2">
            ${items.map(ing => {
              const isSelected = store.state.pantryIngredients.has(ing.id);
              return `
                <button 
                  data-pantry-toggle="${ing.id}"
                  class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isSelected 
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500 ring-offset-1' 
                      : 'bg-gray-50 text-gray-700 hover:bg-amber-50 border border-gray-200'
                  }"
                >
                  <span>${isSelected ? '✓' : '+'}</span>
                  <span>${ing.nom}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Listener sur chaque ingrédient
    container.querySelectorAll('[data-pantry-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-pantry-toggle');
        store.togglePantryIngredient(id);
      });
    });

    // Bouton vider mon placard
    document.getElementById('btn-clear-pantry')?.addEventListener('click', () => {
      store.clearPantry();
    });
  },

  renderPantrySuggestions() {
    const container = document.getElementById('pantry-suggestions-grid');
    const emptyState = document.getElementById('pantry-empty-state');
    const noSelectionState = document.getElementById('pantry-no-selection-state');
    if (!container) return;

    if (store.state.pantryIngredients.size === 0) {
      container.innerHTML = '';
      noSelectionState?.classList.remove('hidden');
      emptyState?.classList.add('hidden');
      return;
    }

    noSelectionState?.classList.add('hidden');

    const matches = PantryEngine.matchRecipes(store.state.pantryIngredients);

    if (matches.length === 0) {
      container.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }

    emptyState?.classList.add('hidden');

    container.innerHTML = matches.map(match => {
      const { recipe, matchPercentage, isFullyAvailable, ownedIngredients, missingIngredients } = match;
      const costInfo = CostCalculator.calculateRecipeCost(recipe);

      return `
        <div 
          data-recipe-card="${recipe.id}"
          class="bg-white rounded-3xl p-5 border ${isFullyAvailable ? 'border-emerald-300 ring-2 ring-emerald-400/40' : 'border-amber-100'} shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
        >
          <div>
            <!-- En-tête de la suggestion -->
            <div class="flex items-start justify-between gap-4 mb-3">
              <div class="flex items-center gap-3">
                <img 
                  src="${recipe.image || ''}" 
                  alt="${recipe.titre}" 
                  class="w-14 h-14 rounded-2xl object-cover shrink-0 shadow-sm"
                />
                <div>
                  <h4 class="font-serif font-bold text-gray-900 text-base leading-tight">
                    ${recipe.titre}
                  </h4>
                  <span class="text-xs text-gray-500">${recipe.categorie} • ${(recipe.temps_preparation || 0) + (recipe.temps_cuisson || 0)} min</span>
                </div>
              </div>

              <!-- Jauge de Matching -->
              <div class="shrink-0 text-right">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  isFullyAvailable 
                    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' 
                    : matchPercentage >= 60 
                      ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' 
                      : 'bg-gray-100 text-gray-700'
                }">
                  ${matchPercentage}% dispo
                </span>
              </div>
            </div>

            <!-- Ingrédients possédés -->
            <div class="mb-2">
              <span class="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                ✓ Possédés (${ownedIngredients.length}) :
              </span>
              <div class="flex flex-wrap gap-1">
                ${ownedIngredients.map(item => `
                  <span class="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg">
                    ${item.nom}
                  </span>
                `).join('')}
              </div>
            </div>

            <!-- Ingrédients manquants -->
            ${missingIngredients.length > 0 ? `
              <div class="mb-4">
                <span class="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                  ✕ Manquants (${missingIngredients.length}) :
                </span>
                <div class="flex flex-wrap gap-1">
                  ${missingIngredients.map(item => `
                    <span class="text-xs bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-lg">
                      ${item.nom}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : `
              <div class="mb-4 p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <i data-lucide="sparkles" class="w-4 h-4 text-emerald-600"></i>
                Vous avez tous les ingrédients nécessaires pour cuisiner ce plat !
              </div>
            `}
          </div>

          <!-- Action & Prix -->
          <div class="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span class="text-gray-500 font-medium">
              Coût total ~ <strong>${CostCalculator.formatCurrency(costInfo.totalCost)}</strong>
            </span>
            <button class="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-sm transition">
              Voir la recette →
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Listener d'ouverture de modale
    container.querySelectorAll('[data-recipe-card]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-recipe-card');
        store.openRecipeModal(id);
      });
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // ==========================================
  // 3. RÉPERTOIRE DES INGRÉDIENTS & PRIX
  // ==========================================

  renderIngredientsDirectory() {
    const container = document.getElementById('ingredients-directory-list');
    if (!container) return;

    // Regrouper par catégorie
    const byCategory = {};
    store.ingredients.forEach(ing => {
      const cat = ing.categorie || 'Autre';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(ing);
    });

    container.innerHTML = Object.entries(byCategory).map(([category, items]) => {
      return `
        <div class="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-amber-100 pb-3">
            <h3 class="font-serif font-bold text-gray-900 text-lg flex items-center gap-2">
              <i data-lucide="layers" class="w-5 h-5 text-amber-600"></i>
              ${category}
            </h3>
            <span class="text-xs text-gray-500 font-medium">${items.length} ingrédient${items.length > 1 ? 's' : ''}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            ${items.map(ing => {
              const isPantry = store.state.pantryIngredients.has(ing.id);
              return `
                <div class="p-3 rounded-2xl border ${isPantry ? 'bg-emerald-50/60 border-emerald-200' : 'bg-gray-50/70 border-gray-100'} flex items-center justify-between gap-2 transition hover:border-amber-300">
                  <div class="min-w-0">
                    <span class="font-semibold text-gray-900 text-sm block truncate">
                      ${ing.nom}
                    </span>
                    <span class="text-xs text-amber-700 font-medium">
                      ${CostCalculator.formatCurrency(ing.prix_indicatif)} / ${ing.unite}
                    </span>
                  </div>

                  <button 
                    data-ing-pantry-toggle="${ing.id}"
                    class="p-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                      isPantry 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'bg-white text-gray-600 hover:bg-amber-100 border border-gray-200'
                    }"
                    title="${isPantry ? 'Présent dans mon placard' : 'Ajouter à mon placard'}"
                  >
                    <i data-lucide="${isPantry ? 'check' : 'plus'}" class="w-4 h-4"></i>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-ing-pantry-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-ing-pantry-toggle');
        store.togglePantryIngredient(id);
        this.renderIngredientsDirectory();
      });
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
};

// Démarrage de l'application dès chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
