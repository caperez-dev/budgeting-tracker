import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Palette } from 'lucide-react';
import { Category, TransactionType } from '../types';
import { CategoryIcon, ICON_MAP } from './CategoryIcon';

interface CategoryManagerModalProps {
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
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
  onClose,
  initialType = 'expense',
}: CategoryManagerModalProps) {
  const [activeTab, setActiveTab] = useState<TransactionType>(initialType);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // New Category State
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('Tag');
  const [isAdding, setIsAdding] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === activeTab);

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
              <label className="block text-zinc-500 font-medium mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-zinc-900 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-zinc-500 font-medium mb-1 flex items-center justify-between">
                <span>Accent Color (for amount figures)</span>
                <span className="font-mono text-[10px] text-zinc-400">{color}</span>
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
              <label className="block text-zinc-500 font-medium mb-1">Name</label>
              <input
                type="text"
                required
                value={editingCat.name}
                onChange={(e) =>
                  setEditingCat({ ...editingCat, name: e.target.value })
                }
                className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-zinc-900 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-zinc-500 font-medium mb-1 flex items-center justify-between">
                <span>Accent Color</span>
                <span className="font-mono text-[10px] text-zinc-400">{editingCat.color}</span>
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

        {/* Existing Categories List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 border border-zinc-100 rounded-[4px]">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="py-2.5 px-3 flex items-center justify-between text-xs hover:bg-zinc-50/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full inline-block shrink-0 shadow-2xs"
                  style={{ backgroundColor: cat.color }}
                />
                <CategoryIcon name={cat.icon} className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="font-semibold text-zinc-800">{cat.name}</span>
                <span className="text-[10px] font-mono text-zinc-400">{cat.color}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingCat(cat)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                  title="Edit category"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteCategory(cat.id)}
                  className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                  title="Delete category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-zinc-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-[3px] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
