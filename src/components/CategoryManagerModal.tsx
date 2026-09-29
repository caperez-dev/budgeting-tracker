import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Palette, GripVertical } from 'lucide-react';
import { Category, TransactionType } from '../types';
import { CategoryIcon, ICON_MAP } from './CategoryIcon';

interface CategoryManagerModalProps {
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories?: (categories: Category[]) => void;
  onClose: () => void;
  initialType?: TransactionType;
}

const PRESET_COLORS = [
  '#0284C7', // Sky
  '#2563EB', // Blue
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#9333EA', // Purple
  '#DB2777', // Pink
  '#E11D48', // Rose
  '#EA580C', // Orange
  '#D97706', // Amber
  '#059669', // Emerald
  '#0D9488', // Teal
  '#52525B', // Zinc
];

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export function CategoryManagerModal({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  onClose,
  initialType = 'expense',
}: CategoryManagerModalProps) {
  const [activeTab, setActiveTab] = useState<TransactionType>(initialType);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // New Category State
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('Tag');
  const [isAdding, setIsAdding] = useState(false);

  // Reorderable items state for activeTab
  const [items, setItems] = useState<Category[]>(() =>
    categories.filter((c) => c.type === activeTab)
  );

  useEffect(() => {
    setItems(categories.filter((c) => c.type === activeTab));
  }, [categories, activeTab]);

  // Drag-and-drop vertical-only reordering state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [currentHoverIndex, setCurrentHoverIndex] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<boolean>(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const startYRef = useRef<number>(0);
  const minDeltaYRef = useRef<number>(0);
  const maxDeltaYRef = useRef<number>(0);
  const activeDragIndexRef = useRef<number | null>(null);
  const currentHoverIndexRef = useRef<number | null>(null);
  const rowHeightRef = useRef<number>(44);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
    if (items.length <= 1) return;
    if (e.button !== 0) return; // Only primary mouse button

    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    activeDragIndexRef.current = index;
    currentHoverIndexRef.current = index;
    startYRef.current = e.clientY;

    if (rowRefs.current[index] && containerRef.current) {
      const rowRect = rowRefs.current[index]!.getBoundingClientRect();
      const contRect = containerRef.current.getBoundingClientRect();
      // Strictly clamp within container wrapper boundaries so it never escapes vertically
      minDeltaYRef.current = contRect.top - rowRect.top;
      maxDeltaYRef.current = contRect.bottom - rowRect.bottom;
      rowHeightRef.current = rowRect.height || 44;
    }

    setDraggingIndex(index);
    setCurrentHoverIndex(index);
    setDragOffsetY(0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activeDragIndexRef.current === null || !containerRef.current) return;

    const deltaY = e.clientY - startYRef.current;
    // Strictly clamp within wrapper vertically so the category never goes out of the wrapper
    const clampedY = Math.max(minDeltaYRef.current, Math.min(maxDeltaYRef.current, deltaY));

    setDragOffsetY(clampedY);

    // Calculate hover index based on vertical row shifts
    const rowH = rowHeightRef.current || 44;
    const indexShift = Math.round(clampedY / rowH);
    const targetIdx = Math.max(
      0,
      Math.min(items.length - 1, activeDragIndexRef.current + indexShift)
    );

    if (targetIdx !== currentHoverIndexRef.current) {
      currentHoverIndexRef.current = targetIdx;
      setCurrentHoverIndex(targetIdx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activeDragIndexRef.current === null) return;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const fromIdx = activeDragIndexRef.current;
    const toIdx = currentHoverIndexRef.current;

    activeDragIndexRef.current = null;
    currentHoverIndexRef.current = null;
    setDraggingIndex(null);
    setDragOffsetY(0);
    setCurrentHoverIndex(null);

    if (toIdx !== null && toIdx !== fromIdx && toIdx >= 0 && toIdx < items.length) {
      const reordered = [...items];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      setItems(reordered);
      onReorderCategories?.(reordered);
      setSaveStatus(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus(false);
      }, 2000);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    activeDragIndexRef.current = null;
    currentHoverIndexRef.current = null;
    setDraggingIndex(null);
    setDragOffsetY(0);
    setCurrentHoverIndex(null);
  };

  const getRowTransform = (index: number) => {
    if (draggingIndex === null) return undefined;
    if (index === draggingIndex) {
      // Moves ONLY vertically, never horizontally
      return `translate3d(0, ${dragOffsetY}px, 0)`;
    }
    const rowH = rowHeightRef.current || 44;
    if (currentHoverIndex !== null) {
      if (draggingIndex < currentHoverIndex) {
        if (index > draggingIndex && index <= currentHoverIndex) {
          return `translate3d(0, -${rowH}px, 0)`;
        }
      } else if (draggingIndex > currentHoverIndex) {
        if (index >= currentHoverIndex && index < draggingIndex) {
          return `translate3d(0, ${rowH}px, 0)`;
        }
      }
    }
    return undefined;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddCategory({
      name: name.trim(),
      type: activeTab,
      color,
      icon,
    });

    setName('');
    setColor(PRESET_COLORS[0]);
    setIcon('Tag');
    setIsAdding(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editingCat.name.trim()) return;
    onUpdateCategory(editingCat);
    setEditingCat(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-lg w-full shadow-lg space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Category</h3>
            <p className="text-xs text-zinc-500">
              Customize categories, icons, and accent colors used in transaction rows.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Filter */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="grid grid-cols-2 p-0.5 bg-zinc-100 rounded-[4px] border border-zinc-200 w-44 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setActiveTab('expense');
                setIsAdding(false);
                setEditingCat(null);
              }}
              className={`py-1 rounded-[3px] transition-colors ${
                activeTab === 'expense'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-500'
              }`}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('income');
                setIsAdding(false);
                setEditingCat(null);
              }}
              className={`py-1 rounded-[3px] transition-colors ${
                activeTab === 'income'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-500'
              }`}
            >
              Income
            </button>
          </div>

          {!isAdding && !editingCat && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-[4px] hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          )}
        </div>

        {/* Adding New Category Form */}
        {isAdding && (
          <form
            onSubmit={handleCreate}
            className="p-3 bg-zinc-50 border border-zinc-200 rounded-[4px] space-y-3 shrink-0 text-xs"
          >
            <div className="font-semibold text-zinc-900 text-xs">
              New {activeTab === 'expense' ? 'Expense' : 'Income'} Category
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-500 font-medium">Name</label>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {name.length}/30
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={30}
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 30))}
                placeholder="Category name"
                className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-zinc-900 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-zinc-500 font-medium mb-1">
                Accent Color
              </label>
              <div className="flex flex-wrap gap-1.5 items-center">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-[3px] transition-transform ${
                      color === c ? 'ring-2 ring-zinc-900 ring-offset-1 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                  title="Custom hex color"
                />
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-zinc-500 font-medium mb-1">Select Icon</label>
              <div className="grid grid-cols-8 gap-1 p-1 bg-white border border-zinc-200 rounded-[4px] max-h-24 overflow-y-auto">
                {AVAILABLE_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`p-1.5 rounded flex items-center justify-center transition-colors ${
                      icon === ic
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                    title={ic}
                  >
                    <CategoryIcon name={ic} className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 text-zinc-600 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-zinc-900 text-white font-medium rounded-[3px]"
              >
                Save Category
              </button>
            </div>
          </form>
        )}

        {/* Editing Category Form */}
        {editingCat && (
          <form
            onSubmit={handleSaveEdit}
            className="p-3 bg-zinc-50 border border-zinc-200 rounded-[4px] space-y-3 shrink-0 text-xs"
          >
            <div className="font-semibold text-zinc-900 text-xs">Edit Category</div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-500 font-medium">Name</label>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {editingCat.name.length}/30
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={30}
                value={editingCat.name}
                onChange={(e) =>
                  setEditingCat({ ...editingCat, name: e.target.value.slice(0, 30) })
                }
                className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-zinc-900 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-zinc-500 font-medium mb-1">
                Accent Color
              </label>
              <div className="flex flex-wrap gap-1.5 items-center">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditingCat({ ...editingCat, color: c })}
                    className={`w-6 h-6 rounded-[3px] transition-transform ${
                      editingCat.color === c
                        ? 'ring-2 ring-zinc-900 ring-offset-1 scale-110'
                        : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={editingCat.color}
                  onChange={(e) => setEditingCat({ ...editingCat, color: e.target.value })}
                  className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 font-medium mb-1">Icon</label>
              <div className="grid grid-cols-8 gap-1 p-1 bg-white border border-zinc-200 rounded-[4px] max-h-24 overflow-y-auto">
                {AVAILABLE_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setEditingCat({ ...editingCat, icon: ic })}
                    className={`p-1.5 rounded flex items-center justify-center transition-colors ${
                      editingCat.icon === ic
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <CategoryIcon name={ic} className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="px-2.5 py-1 text-zinc-600 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-zinc-900 text-white font-medium rounded-[3px]"
              >
                Update
              </button>
            </div>
          </form>
        )}

        {/* Existing Categories List (Hidden when adding or editing category) */}
        {!isAdding && !editingCat && (
          <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 shrink-0 h-4">
              {saveStatus ? (
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 transition-opacity">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Saved</span>
                </span>
              ) : (
                <span />
              )}
              <span className="font-mono text-[10px] text-zinc-400">
                {items.length} {items.length === 1 ? 'category' : 'categories'}
              </span>
            </div>

            <div
              ref={containerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden border border-zinc-200 rounded-[4px] divide-y divide-zinc-100 relative bg-white select-none"
            >
              {items.map((cat, index) => {
                const isDragging = draggingIndex === index;
                const transform = getRowTransform(index);

                return (
                  <div
                    key={cat.id}
                    ref={(el) => {
                      rowRefs.current[index] = el;
                    }}
                    style={{
                      transform,
                      zIndex: isDragging ? 30 : 10,
                      transition: isDragging ? 'none' : 'transform 150ms ease-out',
                    }}
                    className={`py-2 px-3 flex items-center justify-between text-xs relative bg-white ${
                      isDragging
                        ? 'shadow-md ring-1 ring-zinc-300 rounded-[3px] bg-zinc-50/95'
                        : 'hover:bg-zinc-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Drag Handle Indicator */}
                      <button
                        type="button"
                        id={`btn-drag-handle-${cat.id}`}
                        onPointerDown={(e) => handlePointerDown(e, index)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown' && index < items.length - 1) {
                            e.preventDefault();
                            const reordered = [...items];
                            const [moved] = reordered.splice(index, 1);
                            reordered.splice(index + 1, 0, moved);
                            setItems(reordered);
                            onReorderCategories?.(reordered);
                            setSaveStatus(true);
                            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                            saveTimerRef.current = setTimeout(() => {
                              setSaveStatus(false);
                            }, 2000);
                          } else if (e.key === 'ArrowUp' && index > 0) {
                            e.preventDefault();
                            const reordered = [...items];
                            const [moved] = reordered.splice(index, 1);
                            reordered.splice(index - 1, 0, moved);
                            setItems(reordered);
                            onReorderCategories?.(reordered);
                            setSaveStatus(true);
                            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                            saveTimerRef.current = setTimeout(() => {
                              setSaveStatus(false);
                            }, 2000);
                          }
                        }}
                        className={`p-1 -ml-1 text-zinc-400 hover:text-zinc-700 active:text-zinc-950 flex items-center justify-center rounded-[3px] hover:bg-zinc-100 transition-colors touch-none cursor-grab active:cursor-grabbing shrink-0 ${
                          isDragging ? 'cursor-grabbing text-zinc-900 bg-zinc-100' : ''
                        }`}
                        title="Drag to reorder"
                        aria-label={`Drag to reorder ${cat.name}`}
                      >
                        <GripVertical className="w-4 h-4 shrink-0" />
                      </button>

                      <span
                        className="w-3 h-3 rounded-full inline-block shrink-0 shadow-2xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <CategoryIcon
                        name={cat.icon}
                        className="w-3.5 h-3.5 text-zinc-500 shrink-0"
                      />
                      <span className="font-semibold text-zinc-800 truncate">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => setEditingCat(cat)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                        title="Edit category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryToDelete(cat)}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-zinc-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-[3px] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-sm w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h4 className="text-sm font-semibold text-zinc-900">Delete Category</h4>
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-zinc-900">{categoryToDelete.name}</strong>?
              Past entries in your history will keep this category name.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[3px] border border-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-category"
                onClick={() => {
                  onDeleteCategory(categoryToDelete.id);
                  setCategoryToDelete(null);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-[3px] transition-colors cursor-pointer"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
