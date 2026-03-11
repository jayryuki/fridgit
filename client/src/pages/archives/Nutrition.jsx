import { useState, useEffect, useMemo } from 'react';
import { Clock, Trash2, Save, Loader2, TrendingUp, Flame, Beef, Wheat, Droplet } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import MacroGrid from '../components/MacroGrid.jsx';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { r2 } from '../utils/helpers.js';

export default function NutritionPage() {
  const [consumed, setConsumed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('daily');
  const [editingId, setEditingId] = useState(null);
  const [editServings, setEditServings] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/meals/consumed')
      .then(r => setConsumed(r.data))
      .catch(() => toast.error('Failed to load consumption history'))
      .finally(() => setLoading(false));
  }, []);

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
    // If no dates match the filter, show all dates (fixes timezone issues)
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
    if (lower.includes('meat') || lower.includes('protein') || lower.includes('chicken')) return <Beef size={14} />;
    if (lower.includes('dairy') || lower.includes('milk') || lower.includes('cheese')) return <Droplet size={14} />;
    if (lower.includes('grain') || lower.includes('bread') || lower.includes('carb')) return <Wheat size={14} />;
    return <Flame size={14} />;
  };

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
        {/* Header with view toggle */}
        <section className="hero-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif text-fridgit-text dark:text-dracula-fg">
                Nutrition
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

        {/* Macro Summary - uses compact grid on mobile */}
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

        {/* Daily Average - only show on weekly/monthly */}
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

        {/* Categories - collapsible on mobile */}
        {categoryBreakdown.length > 0 && (
          <CollapsibleSection 
            title="Food Categories" 
            showOnMobile={true} 
            defaultOpen={false}
            icon={<Flame size={14} />}
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

        {/* Most Consumed - collapsible on mobile */}
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
                {/* Date header with macros - compact on mobile */}
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
                
                {/* Items list */}
                <div className="space-y-1.5">
                  {(groupedByDate[date] || []).map(item => {
                    const macros = getMacros(item);
                    return (
                      <div key={item.id} className="flex items-center gap-2 rounded-lg border border-fridgit-border bg-white p-2 dark:border-dracula-line dark:bg-dracula-surface">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-fridgit-surfaceAlt text-sm dark:bg-dracula-bg">
                          {item.emoji || '🍽️'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs sm:text-sm font-medium text-fridgit-text dark:text-dracula-fg">{item.name}</p>
                          <p className="text-[9px] sm:text-[10px] text-fridgit-textMuted dark:text-dracula-comment hidden sm:block">
                            {r2(macros.calories)} kcal | {r2(macros.protein)}P {r2(macros.carbs)}C {r2(macros.fat)}F
                          </p>
                        </div>
                        {editingId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              value={editServings}
                              onChange={e => setEditServings(parseFloat(e.target.value) || 1)}
                              className="w-12 sm:w-14 rounded-lg border border-fridgit-border bg-fridgit-bg px-1 py-0.5 text-xs dark:border-dracula-line dark:bg-dracula-bg dark:text-dracula-fg"
                            />
                            <button onClick={() => saveEdit(item.id)} disabled={saving} className="rounded p-1 bg-fridgit-primary text-white">
                              {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => startEdit(item)} 
                            className="rounded px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-fridgit-accent hover:bg-fridgit-accentPale dark:text-dracula-orange dark:hover:bg-dracula-orange/20"
                          >
                            {item.servings || 1}
                          </button>
                        )}
                        <button onClick={() => deleteConsumption(item.id)} className="rounded p-1 text-fridgit-textMuted hover:text-fridgit-danger dark:text-dracula-comment dark:hover:text-dracula-red">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </Layout>
  );
}
