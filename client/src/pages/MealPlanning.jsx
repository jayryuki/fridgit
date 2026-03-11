import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout.jsx';
import MacroGrid from '../components/MacroGrid.jsx';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import { Search, ChevronDown, ChevronUp, Loader2, ExternalLink, TrendingUp, Clock, Trash2, Save, UtensilsCrossed } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { r2 } from '../utils/helpers.js';

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

export default function MealPlanningPage() {
  // Nutrition state
  const [consumed, setConsumed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('daily');
  const [editingId, setEditingId] = useState(null);
  const [editServings, setEditServings] = useState(1);
  const [saving, setSaving] = useState(false);

  // Recipes state
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [recipeDetail, setRecipeDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [expandedDifficulties, setExpandedDifficulties] = useState({ Easy: true, Medium: false, Hard: false });
  const [expandedCuisines, setExpandedCuisines] = useState({});

  // Fetch consumption data
  useEffect(() => {
    api.get('/meals/consumed')
      .then(r => setConsumed(r.data))
      .catch(() => toast.error('Failed to load consumption history'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch fridge items for recipes
  useEffect(() => {
    api.get('/items').then(r => { setItems(r.data); }).catch(() => {}).finally(() => setItemsLoading(false));
  }, []);

  // Nutrition helpers
  const getMacros = (item) => {
    const servings = parseFloat(item.servings) || 1;
    const cal = (parseFloat(item.item_calories) || parseFloat(item.calories) || 0) * servings;
    const pro = (parseFloat(item.item_protein) || 0) * servings;
    const carb = (parseFloat(item.item_carbs) || 0) * servings;
    const fat = (parseFloat(item.item_fat) || 0) * servings;
    return { calories: cal, protein: pro, carbs: carb, fat };
  };

  const groupedByDate = useMemo(() => {
    return consumed.reduce((acc, item) => {
      let dateStr = item.date;
      if (!dateStr && item.consumed_at) {
        dateStr = item.consumed_at;
      }
      if (dateStr) {
        dateStr = dateStr.split('T')[0];
      } else {
        dateStr = 'Unknown';
      }
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(item);
      return acc;
    }, {});
  }, [consumed]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
  }, [groupedByDate]);

  const today = new Date().toISOString().split('T')[0];

  const getDateRange = (mode) => {
    const dates = [];
    const now = new Date();
    const days = mode === 'daily' ? 1 : mode === 'weekly' ? 7 : 30;
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const filteredDates = useMemo(() => {
    const range = getDateRange(viewMode);
    const filtered = sortedDates.filter(d => range.includes(d));
    return filtered.length > 0 ? filtered : sortedDates;
  }, [viewMode, sortedDates]);

  const dayStats = useMemo(() => {
    return filteredDates.reduce((acc, date) => {
      const items = groupedByDate[date] || [];
      const totals = items.reduce((t, item) => {
        const m = getMacros(item);
        return { calories: t.calories + m.calories, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
      acc[date] = { items, ...totals };
      return acc;
    }, {});
  }, [filteredDates, groupedByDate]);

  const periodTotals = useMemo(() => {
    return filteredDates.reduce((t, date) => {
      const stats = dayStats[date];
      return { calories: t.calories + stats.calories, protein: t.protein + stats.protein, carbs: t.carbs + stats.carbs, fat: t.fat + stats.fat };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [filteredDates, dayStats]);

  const averages = useMemo(() => {
    const count = filteredDates.length || 1;
    return { calories: periodTotals.calories / count, protein: periodTotals.protein / count, carbs: periodTotals.carbs / count, fat: periodTotals.fat / count };
  }, [periodTotals, filteredDates]);

  const categoryBreakdown = useMemo(() => {
    const cats = {};
    filteredDates.forEach(date => {
      const items = groupedByDate[date] || [];
      items.forEach(item => {
        const cat = item.item_category || 'Other';
        if (!cats[cat]) cats[cat] = { count: 0, calories: 0 };
        cats[cat].count += 1;
        cats[cat].calories += getMacros(item).calories;
      });
    });
    return Object.entries(cats).sort((a, b) => b[1].calories - a[1].calories);
  }, [filteredDates, groupedByDate]);

  const topItems = useMemo(() => {
    const counts = {};
    filteredDates.forEach(date => {
      const items = groupedByDate[date] || [];
      items.forEach(item => {
        const name = item.name;
        if (!counts[name]) counts[name] = { name, emoji: item.emoji, count: 0, calories: 0 };
        counts[name].count += 1;
        counts[name].calories += getMacros(item).calories;
      });
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredDates, groupedByDate]);

  const streak = useMemo(() => {
    let currentStreak = 0;
    const checkDates = [];
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      checkDates.push(d.toISOString().split('T')[0]);
    }
    for (const date of checkDates) {
      if (groupedByDate[date] && groupedByDate[date].length > 0) {
        currentStreak++;
      } else if (date !== today) {
        break;
      }
    }
    return currentStreak;
  }, [groupedByDate, today]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const todayDate = new Date();
    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditServings(parseFloat(item.servings) || 1);
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/meals/${id}`, { servings: editServings });
      setConsumed(prev => prev.map(c => c.id === id ? { ...c, servings: editServings } : c));
      setEditingId(null);
      toast.success('Servings updated');
    } catch {
      toast.error('Failed to update');
    }
    setSaving(false);
  };

  const deleteConsumption = async (id) => {
    try {
      await api.delete(`/meals/${id}`);
      setConsumed(prev => prev.filter(c => c.id !== id));
      toast.success('Removed from history');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const getCategoryIcon = (cat) => {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('meat') || lower.includes('protein') || lower.includes('chicken')) return <UtensilsCrossed size={14} />;
    return <Clock size={14} />;
  };

  // Recipe helpers
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
    setRecipesLoading(true);
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
    setRecipesLoading(false);
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-fridgit-primary dark:text-dracula-green" size={32} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-stack slide-up">
        {/* ==================== NUTRITION SECTION ==================== */}
        <section className="hero-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif text-fridgit-text dark:text-dracula-fg">
                Meal Planning
              </h1>
              {streak > 0 && (
                <div className="mt-1 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-fridgit-primary dark:text-dracula-green" />
                  <span className="text-xs font-medium text-fridgit-primary dark:text-dracula-green">
                    {streak} day{streak !== 1 ? 's' : ''} streak
                  </span>
                </div>
              )}
            </div>
            <div className="flex rounded-xl bg-fridgit-surfaceAlt p-1 dark:bg-dracula-selection/30 self-start">
              {['daily', 'weekly', 'monthly'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all capitalize ${
                    viewMode === mode
                      ? 'bg-white text-fridgit-primary shadow-sm dark:bg-dracula-currentLine dark:text-dracula-green'
                      : 'text-fridgit-textMuted hover:text-fridgit-text dark:text-dracula-comment dark:hover:text-dracula-fg'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Macro Summary */}
        <section className="panel-section">
          <MacroGrid 
            calories={periodTotals.calories}
            protein={periodTotals.protein}
            carbs={periodTotals.carbs}
            fat={periodTotals.fat}
            size="compact"
            dailyLabel={viewMode === 'daily' ? 'Today' : 'Total'}
          />
        </section>

        {/* Daily Average - weekly/monthly only */}
        {viewMode !== 'daily' && (
          <section className="panel-section">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-fridgit-textMuted dark:text-dracula-comment">
              Daily Average
            </div>
            <MacroGrid 
              calories={averages.calories}
              protein={averages.protein}
              carbs={averages.carbs}
              fat={averages.fat}
              size="compact"
              showLabel={false}
            />
          </section>
        )}

        {/* Categories - collapsible */}
        {categoryBreakdown.length > 0 && (
          <CollapsibleSection 
            title="Food Categories" 
            showOnMobile={true} 
            defaultOpen={false}
          >
            <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1 -mx-1 px-1 scrollbar-hide">
              {categoryBreakdown.map(([cat, data]) => (
                <div 
                  key={cat} 
                  className="flex items-center gap-2 shrink-0 rounded-lg bg-fridgit-surfaceAlt px-3 py-2 dark:bg-dracula-selection/30"
                >
                  <span className="text-fridgit-textMuted dark:text-dracula-comment">{getCategoryIcon(cat)}</span>
                  <span className="text-sm font-medium capitalize text-fridgit-text dark:text-dracula-fg">{cat}</span>
                  <span className="text-xs text-fridgit-textMuted dark:text-dracula-comment">({data.count})</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Most Consumed - collapsible */}
        {topItems.length > 0 && (
          <CollapsibleSection 
            title="Most Consumed" 
            showOnMobile={true}
            defaultOpen={false}
          >
            <div className="space-y-1.5">
              {topItems.map((item) => (
                <div key={item.name} className="flex items-center gap-2 rounded-lg bg-fridgit-surfaceAlt px-3 py-2 dark:bg-dracula-selection/30">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm dark:bg-dracula-currentLine">
                    {item.emoji || '🍽️'}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium text-fridgit-text dark:text-dracula-fg truncate">{item.name}</span>
                  <span className="text-xs text-fridgit-textMuted dark:text-dracula-comment shrink-0">{item.count}x</span>
                  <span className="text-xs font-medium text-fridgit-accent dark:text-dracula-orange shrink-0">{r2(item.calories)}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Consumption Log */}
        <section className="panel-section">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fridgit-textMuted dark:text-dracula-comment">
            Consumption Log
          </h2>
          {filteredDates.length === 0 ? (
            <div className="py-8 text-center">
              <Clock size={32} className="mx-auto mb-3 text-fridgit-textMuted dark:text-dracula-comment" />
              <p className="text-sm text-fridgit-textMuted dark:text-dracula-comment">
                No items consumed in this period.
              </p>
            </div>
          ) : (
            filteredDates.map(date => (
              <div key={date} className="mb-4 last:mb-0">
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h3 className="text-sm font-medium text-fridgit-text dark:text-dracula-fg">
                    {formatDate(date)}
                  </h3>
                  <div className="flex gap-2 text-xs">
                    <span className="text-fridgit-accent dark:text-dracula-orange">{r2(dayStats[date]?.calories)}</span>
                    <span className="text-fridgit-primary dark:text-dracula-green">{r2(dayStats[date]?.protein)}P</span>
                    <span className="text-blue-600 dark:text-blue-400">{r2(dayStats[date]?.carbs)}C</span>
                    <span className="text-fridgit-danger dark:text-dracula-red">{r2(dayStats[date]?.fat)}F</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {(groupedByDate[date] || []).map(item => {
                    const macros = getMacros(item);
                    return (
                      <div key={item.id} className="flex items-center gap-2 rounded-lg border border-fridgit-border bg-white p-3 sm:p-2 dark:border-dracula-line dark:bg-dracula-surface">
                        <span className="flex h-10 w-10 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-fridgit-surfaceAlt text-lg sm:text-sm dark:bg-dracula-bg">
                          {item.emoji || '🍽️'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-fridgit-text dark:text-dracula-fg">{item.name}</p>
                          <p className="text-xs text-fridgit-textMuted dark:text-dracula-comment sm:hidden">{r2(macros.calories)} kcal</p>
                        </div>
                        {editingId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              value={editServings}
                              onChange={e => setEditServings(parseFloat(e.target.value) || 1)}
                              className="w-14 sm:w-12 rounded-lg border border-fridgit-border bg-fridgit-bg px-2 py-1.5 sm:py-1 text-sm dark:border-dracula-line dark:bg-dracula-bg dark:text-dracula-fg"
                            />
                            <button onClick={() => saveEdit(item.id)} disabled={saving} className="rounded-lg p-2 bg-fridgit-primary text-white touch-manipulation">
                              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => startEdit(item)} 
                              className="rounded-lg px-3 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-xs font-medium text-fridgit-accent hover:bg-fridgit-accentPale dark:text-dracula-orange dark:hover:bg-dracula-orange/20 touch-manipulation"
                            >
                              {item.servings || 1} serv
                            </button>
                            <button onClick={() => deleteConsumption(item.id)} className="rounded-lg p-2 text-fridgit-textMuted hover:text-fridgit-danger dark:text-dracula-comment dark:hover:text-dracula-red touch-manipulation">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>

        {/* ==================== RECIPES SECTION ==================== */}
        <CollapsibleSection 
          title="Recipe Ideas" 
          showOnMobile={true}
          defaultOpen={false}
          icon={<UtensilsCrossed size={16} />}
        >
        <section className="panel-section">
          <h3 className="text-sm font-semibold text-fridgit-textMid dark:text-dracula-comment mb-2">Select ingredients from your fridge:</h3>
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
            <button onClick={searchRecipes} disabled={recipesLoading} className="mt-3 w-full py-2.5 rounded-xl bg-fridgit-primary text-white font-semibold hover:bg-fridgit-primaryLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {recipesLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Find Recipes ({selectedItems.length} ingredients)
            </button>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIFFICULTY_ORDER.map(difficulty => {
            const cuisines = groupedRecipes[difficulty] || {};
            const cuisineEntries = Object.entries(cuisines).sort((a, b) => a[0].localeCompare(b[0]));
            const recipeCount = cuisineEntries.reduce((sum, [, list]) => sum + list.length, 0);
            if (recipeCount === 0) return null;

            return (
              <div key={difficulty} className="bg-white rounded-xl border border-fridgit-border overflow-hidden dark:bg-dracula-surface dark:border-dracula-line">
                <button onClick={() => toggleDifficulty(difficulty)} className="w-full p-4 flex items-center justify-between text-left bg-fridgit-surfaceAlt/50 dark:bg-dracula-selection/30">
                  <div>
                    <h2 className="font-semibold text-fridgit-text dark:text-dracula-fg">{difficulty}</h2>
                    <p className="text-xs text-fridgit-textMuted dark:text-dracula-comment mt-0.5">{recipeCount} recipe{recipeCount === 1 ? '' : 's'}</p>
                  </div>
                  {expandedDifficulties[difficulty] ? <ChevronUp size={18} className="text-fridgit-textMuted" /> : <ChevronDown size={18} className="text-fridgit-textMuted" />}
                </button>

                {expandedDifficulties[difficulty] && (
                  <div className="p-3 space-y-3 border-t border-fridgit-border dark:border-dracula-line">
                    {cuisineEntries.map(([cuisine, cuisineRecipes]) => {
                      const cuisineKey = `${difficulty}:${cuisine}`;
                      const isExpanded = expandedCuisines[cuisineKey] ?? cuisine === cuisineEntries[0][0];
                      return (
                        <div key={cuisineKey} className="rounded-xl border border-fridgit-border overflow-hidden dark:border-dracula-line">
                          <button onClick={() => toggleCuisine(cuisineKey)} className="w-full px-3 py-2.5 flex items-center justify-between text-left bg-white dark:bg-dracula-surface">
                            <div>
                              <h3 className="text-sm font-medium text-fridgit-text dark:text-dracula-fg">{cuisine}</h3>
                              <p className="text-[11px] text-fridgit-textMuted dark:text-dracula-comment mt-0.5">{cuisineRecipes.length} recipe{cuisineRecipes.length === 1 ? '' : 's'}</p>
                            </div>
                            {isExpanded ? <ChevronUp size={16} className="text-fridgit-textMuted" /> : <ChevronDown size={16} className="text-fridgit-textMuted" />}
                          </button>

                          {isExpanded && (
                            <div className="p-3 border-t border-fridgit-border space-y-3 bg-fridgit-surfaceAlt/30 dark:bg-dracula-bg">
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
        </section>

        {!recipesLoading && recipes.length === 0 && selectedItems.length > 0 && (
          <div className="text-center py-8">
            <UtensilsCrossed size={48} className="text-fridgit-textMuted dark:text-dracula-comment mx-auto mb-3" />
            <p className="text-fridgit-textMuted dark:text-dracula-comment text-sm">Select ingredients and search to find recipe ideas</p>
          </div>
        )}
        </CollapsibleSection>
      </div>
    </Layout>
  );
}
