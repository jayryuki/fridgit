import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import useItemActions from "../hooks/useItemActions.js";
import Layout from "../components/Layout.jsx";
import ItemDetailModal from "../components/ItemDetailModal.jsx";
import FridgeItemCard from "../components/FridgeItemCard.jsx";
import { Search, Plus, List, Grid3X3, ChevronDown, X } from "lucide-react";
import { categories } from "../utils/constants.js";
import api from "../services/api.js";
import toast from "react-hot-toast";

export default function FridgePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("detailed");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const {
    selected,
    setSelected,
    editForm,
    setEditForm,
    saving,
    openDetail,
    saveDetail,
    deleteItem,
    consumeItem,
    addToShoppingList,
  } = useItemActions({ items, setItems });

  const fetchItems = () => {
    api
      .get("/items")
      .then((r) => setItems(r.data))
      .catch(() => toast.error("Failed to load items"))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter((item) => {
    const matchCat = category === "all" || item.category === category;
    const matchSearch =
      !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <Layout>
      <div className="page-stack slide-up">
        <section className="hero-card">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-serif text-fridgit-text dark:text-dracula-fg sm:text-[2rem]">
                My Fridge
              </h1>
              <p className="mt-2 text-sm text-fridgit-textMuted dark:text-dracula-comment sm:text-base">
                Search, filter, and manage your inventory comfortably on desktop
                or mobile.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex rounded-xl border border-fridgit-border dark:border-dracula-line">
                <button
                  onClick={() => setViewMode("detailed")}
                  className={`flex items-center gap-1.5 rounded-l-xl px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === "detailed"
                      ? "bg-fridgit-primary text-white dark:bg-dracula-green dark:text-dracula-bg"
                      : "bg-white text-fridgit-textMid hover:bg-fridgit-primaryPale dark:bg-dracula-surface dark:text-dracula-fg dark:hover:bg-dracula-green/10"
                  }`}
                >
                  <List size={16} />
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  className={`flex items-center gap-1.5 rounded-r-xl px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === "compact"
                      ? "bg-fridgit-primary text-white dark:bg-dracula-green dark:text-dracula-bg"
                      : "bg-white text-fridgit-textMid hover:bg-fridgit-primaryPale dark:bg-dracula-surface dark:text-dracula-fg dark:hover:bg-dracula-green/10"
                  }`}
                >
                  <Grid3X3 size={16} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
              </div>
              <button
                onClick={() => navigate("/new-item")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-fridgit-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-fridgit-primaryLight dark:bg-dracula-green dark:text-dracula-bg dark:hover:bg-dracula-green/80"
              >
                <Plus size={18} />
                Add item
              </button>
            </div>
          </div>
        </section>

        <section className="panel-section">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-fridgit-textMuted dark:text-dracula-comment"
              />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-fridgit-border bg-white py-3 pl-10 pr-4 text-fridgit-text transition placeholder:text-fridgit-textMuted focus:border-fridgit-primary focus:ring-1 focus:ring-fridgit-primary dark:border-dracula-line dark:bg-dracula-surface dark:text-dracula-fg dark:placeholder:text-dracula-comment dark:focus:border-dracula-green dark:focus:ring-dracula-green"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:hidden">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    category === cat.key
                      ? "bg-fridgit-primary text-white dark:bg-dracula-green dark:text-dracula-bg"
                      : "border border-fridgit-border bg-white text-fridgit-textMid hover:bg-fridgit-primaryPale dark:border-dracula-line dark:bg-dracula-surface dark:text-dracula-fg dark:hover:bg-dracula-green/10"
                  }`}
                >
                  <span className="mr-1.5">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative hidden lg:block">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-fridgit-border bg-white px-4 py-2.5 text-sm font-medium text-fridgit-text dark:border-dracula-line dark:bg-dracula-surface dark:text-dracula-fg hover:border-fridgit-primary dark:hover:border-dracula-green transition-colors min-w-[140px]"
              >
                <span>{categories.find((c) => c.key === category)?.emoji}</span>
                <span>{categories.find((c) => c.key === category)?.label}</span>
                <ChevronDown
                  size={16}
                  className={`ml-auto transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-fridgit-border bg-white/90 dark:border-dracula-line dark:bg-dracula-currentLine/90 backdrop-blur-xl shadow-lg overflow-hidden">
                    {categories.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => {
                          setCategory(cat.key);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                          category === cat.key
                            ? "bg-fridgit-primary text-white dark:bg-dracula-green dark:text-dracula-bg"
                            : "text-fridgit-textMid dark:text-dracula-fg hover:bg-fridgit-primaryPale dark:hover:bg-dracula-selection"
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section>
          {loading ? (
            <div className="py-16 text-center text-fridgit-textMuted dark:text-dracula-comment">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="panel-section text-center">
              <p className="text-fridgit-textMuted dark:text-dracula-comment">
                No items found
              </p>
              <button
                onClick={() => navigate("/new-item")}
                className="mt-3 text-sm font-semibold text-fridgit-primary hover:underline dark:text-dracula-green"
              >
                Add your first item
              </button>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                viewMode === "compact"
                  ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5"
                  : "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
              }`}
            >
              {filtered.map((item) => (
                <FridgeItemCard
                  key={item.id}
                  item={item}
                  viewMode={viewMode}
                  onOpenDetail={openDetail}
                  onConsume={consumeItem}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <ItemDetailModal
        selected={selected}
        editForm={editForm}
        saving={saving}
        user={user}
        onClose={() => setSelected(null)}
        onSave={saveDetail}
        onConsume={consumeItem}
        onDelete={deleteItem}
        onAddToShoppingList={addToShoppingList}
        onEditFormChange={setEditForm}
      />
    </Layout>
  );
}
