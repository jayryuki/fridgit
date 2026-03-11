import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout.jsx';
import { UtensilsCrossed, Search, ChevronDown, ChevronUp, Loader2, ExternalLink } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

const DIFFICULTY_ORDER = ['Easy', 'Medium', 'Hard'];

function getDifficulty(readyInMinutes) {
  if (readyInMinutes == null) return 'Medium';
  if (readyInMinutes <= 30) return 'Easy';
  if (readyInMinutes <= 60) return 'Medium';
  return 'Hard';
}

function getCuisineLabel(cuisines) {
  if (!Array.isArray(cuisines) || cuisines.length === 0) return 'Other';
  return cuisines[0];
}

export default function RecipesPage() {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [recipeDetail, setRecipeDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [expandedDifficulties, setExpandedDifficulties] = useState({ Easy: true, Medium: false, Hard: false });
  const [expandedCuisines, setExpandedCuisines] = useState({});

  useEffect(() => {
    api.get('/items').then(r => { setItems(r.data); }).catch(() => {}).finally(() => setItemsLoading(false));
  }, []);

  const toggleItem = (name) => {
    setSelectedItems(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const toggleDifficulty = (difficulty) => {
    setExpandedDifficulties(prev => ({ ...prev, [difficulty]: !prev[difficulty] }));
  };

  const toggleCuisine = (key) => {
    setExpandedCuisines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const searchRecipes = async () => {
    if (selectedItems.length === 0) { toast.error('Select at least one ingredient'); return; }
    setLoading(true);
    setRecipes([]);
    setExpandedRecipe(null);
    setRecipeDetail(null);
    setExpandedDifficulties({ Easy: true, Medium: false, Hard: false });
    setExpandedCuisines({});
    try {
      const res = await api.get(`/recipes/suggestions?ingredients=${encodeURIComponent(selectedItems.join(','))}`);
      if (res.data.error) {
        toast.error(res.data.error);
      } else {
        const baseSorted = [...res.data].sort((a, b) => {
          if (b.usedIngredientCount !== a.usedIngredientCount) return b.usedIngredientCount - a.usedIngredientCount;
          return a.missedIngredientCount - b.missedIngredientCount;
        });

        if (baseSorted.length === 0) {
          setRecipes([]);
          toast('No recipes found for these ingredients');
        } else {
          let infoById = {};
          try {
            const bulkRes = await api.post('/recipes/bulk-info', { ids: baseSorted.map(r => r.id) });
            infoById = Object.fromEntries((bulkRes.data || []).map(r => [r.id, r]));
          } catch {
            toast.error('Loaded recipes, but could not load cook time and cuisine info');
          }

          const enriched = baseSorted.map(recipe => {
            const info = infoById[recipe.id] || {};
            return {
              ...recipe,
              readyInMinutes: info.readyInMinutes ?? null,
              cuisines: info.cuisines ?? [],
              difficulty: getDifficulty(info.readyInMinutes ?? null),
              cuisineLabel: getCuisineLabel(info.cuisines ?? []),
            };
          });

          setRecipes(enriched);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to fetch recipes';
      toast.error(msg);
    }
    setLoading(false);
  };

  const groupedRecipes = useMemo(() => {
    const grouped = { Easy: {}, Medium: {}, Hard: {} };

    recipes.forEach(recipe => {
      const difficulty = recipe.difficulty || 'Medium';
      const cuisine = recipe.cuisineLabel || 'Other';
      if (!grouped[difficulty]) grouped[difficulty] = {};
      if (!grouped[difficulty][cuisine]) grouped[difficulty][cuisine] = [];
      grouped[difficulty][cuisine].push(recipe);
    });

    DIFFICULTY_ORDER.forEach(difficulty => {
      const cuisines = grouped[difficulty] || {};
      Object.keys(cuisines).forEach(cuisine => {
        cuisines[cuisine].sort((a, b) => {
          if (b.usedIngredientCount !== a.usedIngredientCount) return b.usedIngredientCount - a.usedIngredientCount;
          return a.missedIngredientCount - b.missedIngredientCount;
        });
      });
    });

    return grouped;
  }, [recipes]);

  const loadRecipeDetail = async (id) => {
    if (expandedRecipe === id) { setExpandedRecipe(null); setRecipeDetail(null); return; }
    setExpandedRecipe(id);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/recipes/${id}`);
      setRecipeDetail(res.data);
    } catch {
      toast.error('Failed to load recipe details');
    }
    setLoadingDetail(false);
  };

  const addToMealPlan = async (recipe) => {
    try {
      await api.post('/meals', {
        name: recipe.title,
        date: new Date().toISOString().split('T')[0],
        meal_type: 'dinner',
        recipe_id: String(recipe.id),
        ingredients: recipe.usedIngredients?.map(i => i.name) || [],
        calories: recipeDetail?.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || null,
      });
      toast.success('Added to meal plan!');
    } catch {
      toast.error('Failed to add to meal plan');
    }
  };

  const renderRecipeCard = (recipe) => (
    <div key={recipe.id} className="bg-white rounded-xl border border-fridgit-border overflow-hidden">
      <button onClick={() => loadRecipeDetail(recipe.id)} className="w-full p-3 flex items-center gap-3 text-left">
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-fridgit-surfaceAlt flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed size={24} className="text-fridgit-textMuted" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-fridgit-text text-sm">{recipe.title}</h3>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-fridgit-primaryPale text-fridgit-primary font-medium">
              {recipe.usedIngredientCount} used
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-fridgit-accentPale text-fridgit-accent font-medium">
              {recipe.missedIngredientCount} missing
            </span>
            {recipe.readyInMinutes != null && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-fridgit-surfaceAlt text-fridgit-textMid font-medium">
                {recipe.readyInMinutes} min
              </span>
            )}
          </div>
        </div>
        {expandedRecipe === recipe.id ? <ChevronUp size={18} className="text-fridgit-textMuted" /> : <ChevronDown size={18} className="text-fridgit-textMuted" />}
      </button>

      {expandedRecipe === recipe.id && (
        <div className="px-3 pb-3 border-t border-fridgit-border pt-3">
          {loadingDetail ? (
            <div className="text-center py-4"><Loader2 size={20} className="animate-spin text-fridgit-primary mx-auto" /></div>
          ) : recipeDetail ? (
            <div className="space-y-2">
              {recipeDetail.readyInMinutes && (
                <p className="text-xs text-fridgit-textMid">Ready in {recipeDetail.readyInMinutes} min | Serves {recipeDetail.servings}</p>
              )}
              {recipeDetail.summary && (
                <p className="text-xs text-fridgit-textMuted leading-relaxed" dangerouslySetInnerHTML={{ __html: recipeDetail.summary.substring(0, 200) + '...' }} />
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => addToMealPlan(recipe)} className="flex-1 text-xs py-2 rounded-lg bg-fridgit-primaryPale text-fridgit-primary font-medium hover:bg-fridgit-primary hover:text-white transition-colors">
                  Add to Meals
                </button>
                {recipeDetail.sourceUrl && (
                  <a href={recipeDetail.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs py-2 px-3 rounded-lg bg-fridgit-surfaceAlt text-fridgit-textMid font-medium hover:bg-fridgit-border transition-colors">
                    <ExternalLink size={12} /> Full Recipe
                  </a>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="slide-up">
        <h1 className="text-2xl font-serif text-fridgit-text mb-4">Recipe Ideas</h1>

        <div className="bg-white rounded-xl border border-fridgit-border p-4 mb-4">
          <h3 className="text-sm font-semibold text-fridgit-textMid mb-2">Select ingredients from your fridge:</h3>
          {itemsLoading ? (
            <div className="text-center py-4 text-fridgit-textMuted text-sm">Loading inventory...</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-fridgit-textMuted">No items in your fridge. Add some first!</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {[...new Set(items.map(i => i.name))].map(name => (
                <button
                  key={name}
                  onClick={() => toggleItem(name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${selectedItems.includes(name) ? 'bg-fridgit-primary text-white' : 'bg-fridgit-surfaceAlt text-fridgit-textMid hover:bg-fridgit-primaryPale'}`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          {selectedItems.length > 0 && (
            <button onClick={searchRecipes} disabled={loading} className="mt-3 w-full py-2.5 rounded-xl bg-fridgit-primary text-white font-semibold hover:bg-fridgit-primaryLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Find Recipes ({selectedItems.length} ingredients)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIFFICULTY_ORDER.map(difficulty => {
            const cuisines = groupedRecipes[difficulty] || {};
            const cuisineEntries = Object.entries(cuisines).sort((a, b) => a[0].localeCompare(b[0]));
            const recipeCount = cuisineEntries.reduce((sum, [, list]) => sum + list.length, 0);
            if (recipeCount === 0) return null;

            return (
              <div key={difficulty} className="bg-white rounded-xl border border-fridgit-border overflow-hidden">
                <button onClick={() => toggleDifficulty(difficulty)} className="w-full p-4 flex items-center justify-between text-left bg-fridgit-surfaceAlt/50">
                  <div>
                    <h2 className="font-semibold text-fridgit-text">{difficulty}</h2>
                    <p className="text-xs text-fridgit-textMuted mt-0.5">{recipeCount} recipe{recipeCount === 1 ? '' : 's'}</p>
                  </div>
                  {expandedDifficulties[difficulty] ? <ChevronUp size={18} className="text-fridgit-textMuted" /> : <ChevronDown size={18} className="text-fridgit-textMuted" />}
                </button>

                {expandedDifficulties[difficulty] && (
                  <div className="p-3 space-y-3 border-t border-fridgit-border">
                    {cuisineEntries.map(([cuisine, cuisineRecipes]) => {
                      const cuisineKey = `${difficulty}:${cuisine}`;
                      const isExpanded = expandedCuisines[cuisineKey] ?? cuisine === cuisineEntries[0][0];
                      return (
                        <div key={cuisineKey} className="rounded-xl border border-fridgit-border overflow-hidden">
                          <button onClick={() => toggleCuisine(cuisineKey)} className="w-full px-3 py-2.5 flex items-center justify-between text-left bg-white">
                            <div>
                              <h3 className="text-sm font-medium text-fridgit-text">{cuisine}</h3>
                              <p className="text-[11px] text-fridgit-textMuted mt-0.5">{cuisineRecipes.length} recipe{cuisineRecipes.length === 1 ? '' : 's'}</p>
                            </div>
                            {isExpanded ? <ChevronUp size={16} className="text-fridgit-textMuted" /> : <ChevronDown size={16} className="text-fridgit-textMuted" />}
                          </button>

                          {isExpanded && (
                            <div className="p-3 border-t border-fridgit-border space-y-3 bg-fridgit-surfaceAlt/30">
                              {cuisineRecipes.map(renderRecipeCard)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!loading && recipes.length === 0 && selectedItems.length > 0 && (
          <div className="text-center py-8">
            <UtensilsCrossed size={48} className="text-fridgit-textMuted mx-auto mb-3" />
            <p className="text-fridgit-textMuted text-sm">Select ingredients and search to find recipe ideas</p>
          </div>
        )}
      </div>
    </Layout>
  );
}