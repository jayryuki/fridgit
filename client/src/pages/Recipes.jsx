import { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import { UtensilsCrossed, Search, ChevronDown, ChevronUp, Loader2, ExternalLink } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function RecipesPage() {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [recipeDetail, setRecipeDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);

  useEffect(() => {
    api.get('/items').then(r => { setItems(r.data); }).catch(() => {}).finally(() => setItemsLoading(false));
  }, []);

  const toggleItem = (name) => {
    setSelectedItems(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const searchRecipes = async () => {
    if (selectedItems.length === 0) { toast.error('Select at least one ingredient'); return; }
    setLoading(true);
    setRecipes([]);
    setExpandedRecipe(null);
    try {
      const res = await api.get(`/recipes/suggestions?ingredients=${encodeURIComponent(selectedItems.join(','))}`);
      if (res.data.error) { toast.error(res.data.error); }
      else { setRecipes(res.data); if (res.data.length === 0) toast('No recipes found for these ingredients'); }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to fetch recipes';
      toast.error(msg);
    }
    setLoading(false);
  };

  const loadRecipeDetail = async (id) => {
    if (expandedRecipe === id) { setExpandedRecipe(null); setRecipeDetail(null); return; }
    setExpandedRecipe(id);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/recipes/${id}`);
      setRecipeDetail(res.data);
    } catch { toast.error('Failed to load recipe details'); }
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
    } catch { toast.error('Failed to add to meal plan'); }
  };

  return (
    <Layout>
      <div className="slide-up">
        <h1 className="text-2xl font-serif text-fridgit-text mb-4">Recipe Ideas</h1>

        {/* Ingredient selection */}
        <div className="bg-white rounded-xl border border-fridgit-border p-4 mb-4">
          <h3 className="text-sm font-semibold text-fridgit-textMid mb-2">Select ingredients from your fridge:</h3>
          {itemsLoading ? (
            <div className="text-center py-4 text-fridgit-textMuted text-sm">Loading inventory...</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-fridgit-textMuted">No items in your fridge. Add some first!</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {[...new Set(items.map(i => i.name))].map(name => (
                <button key={name} onClick={() => toggleItem(name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedItems.includes(name) ? 'bg-fridgit-primary text-white' : 'bg-fridgit-surfaceAlt text-fridgit-textMid hover:bg-fridgit-primaryPale'
                  }`}>
                  {name}
                </button>
              ))}
            </div>
          )}
          {selectedItems.length > 0 && (
            <button onClick={searchRecipes} disabled={loading}
              className="mt-3 w-full py-2.5 rounded-xl bg-fridgit-primary text-white font-semibold hover:bg-fridgit-primaryLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Find Recipes ({selectedItems.length} ingredients)
            </button>
          )}
        </div>

        {/* Results */}
        <div className="space-y-3">
          {recipes.map(recipe => (
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
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-fridgit-primaryPale text-fridgit-primary font-medium">
                      {recipe.usedIngredientCount} used
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-fridgit-accentPale text-fridgit-accent font-medium">
                      {recipe.missedIngredientCount} missing
                    </span>
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
                        <button onClick={() => addToMealPlan(recipe)}
                          className="flex-1 text-xs py-2 rounded-lg bg-fridgit-primaryPale text-fridgit-primary font-medium hover:bg-fridgit-primary hover:text-white transition-colors">
                          Add to Meals
                        </button>
                        {recipeDetail.sourceUrl && (
                          <a href={recipeDetail.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs py-2 px-3 rounded-lg bg-fridgit-surfaceAlt text-fridgit-textMid font-medium hover:bg-fridgit-border transition-colors">
                            <ExternalLink size={12} /> Full Recipe
                          </a>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
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
