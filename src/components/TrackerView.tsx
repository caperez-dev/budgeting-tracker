import React, { useState } from 'react';
import {
  Trash2,
  Edit3,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
} from 'lucide-react';
import { Category, Currency, Transaction, Account } from '../types';
import { formatCurrency, groupTransactions } from '../utils/formatters';
import { CategoryIcon, AccountIcon } from './CategoryIcon';
import { CurrencySelect } from './CurrencySelect';
import { CategorySelect } from './CategorySelect';

interface TrackerViewProps {
  transactions: Transaction[];
  categories: Category[];
  currencies: Currency[];
  accounts?: Account[];
  selectedCurrency: string;
  selectedMonthYearLabel?: string;
  allTransactionsCount?: number;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction: (tx: Transaction) => void;
  pendingUndoTx: Transaction | null;
  onUndoDelete: () => void;
  undoSecondsLeft: number;
}

export function TrackerView({
  transactions,
  categories,
  currencies,
  accounts = [],
  selectedCurrency,
  selectedMonthYearLabel,
  allTransactionsCount,
  onDeleteTransaction,
  onUpdateTransaction,
  pendingUndoTx,
  onUndoDelete,
  undoSecondsLeft,
}: TrackerViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Reset pagination when filter criteria change
  React.useEffect(() => {
    setVisibleCount(10);
  }, [filterType, filterCategory, searchQuery, selectedMonthYearLabel]);

  const currencyObj = currencies.find((c) => c.code === selectedCurrency);
  const currencySymbol = currencyObj?.symbol || '₱';

  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const accountMap = new Map<string, Account>();
  accounts.forEach((a) => accountMap.set(a.id, a));

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cat = categoryMap.get(tx.categoryId);
      const catName = cat ? cat.name.toLowerCase() : '';
      const acc = tx.accountId ? accountMap.get(tx.accountId) : undefined;
      const accName = acc ? acc.name.toLowerCase() : '';
      const matchesNote = tx.note.toLowerCase().includes(q);
      const matchesAmount = String(tx.amount).includes(q);
      const matchesDate = tx.date.includes(q);
      if (!matchesNote && !catName.includes(q) && !accName.includes(q) && !matchesAmount && !matchesDate) {
        return false;
      }
    }
    return true;
  });

  const visibleTransactions = filtered.slice(0, visibleCount);
  const monthGroups = groupTransactions(visibleTransactions);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    onUpdateTransaction(editingTx);
    setEditingTx(null);
  };

  return (
    <div id="tracker-main-view" className="space-y-4">
      {/* Controls Bar: Search, Filters, Stats */}
      <div className="bg-white border border-zinc-200 rounded-[5px] p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions (note, category, amount)..."
              className="w-full bg-zinc-50 border border-zinc-200 text-xs pl-8 pr-3 py-1.5 rounded-[4px] text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-[4px] border border-zinc-200">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-[3px] transition-colors ${
                filterType === 'all'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-2.5 py-1 text-xs font-medium rounded-[3px] transition-colors ${
                filterType === 'expense'
                  ? 'bg-white text-rose-600 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-2.5 py-1 text-xs font-medium rounded-[3px] transition-colors ${
                filterType === 'income'
                  ? 'bg-white text-emerald-600 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Income
            </button>
          </div>

          {/* Category Filter - custom styled matching CurrencySelect */}
          <div className="h-8 min-w-[160px]">
            <CategorySelect
              id="filter-category-select"
              ariaLabel="Filter by category"
              categories={categories}
              value={filterCategory}
              onChange={setFilterCategory}
              showAllOption={true}
              className="h-full"
              buttonClassName="min-h-[32px] h-8"
            />
          </div>
        </div>

        <div className="text-xs font-mono text-zinc-500">
          Showing <span className="font-semibold text-zinc-800">{Math.min(visibleCount, filtered.length)}</span>{' '}
          {filtered.length > visibleCount ? (
            <span>
              of <span className="font-semibold text-zinc-800">{filtered.length}</span> entries
            </span>
          ) : (
            filtered.length === 1 ? 'entry' : 'entries'
          )}
          {selectedMonthYearLabel && (
            <span>
              {' '}for <span className="font-semibold text-zinc-800">{selectedMonthYearLabel}</span>
            </span>
          )}
        </div>
      </div>

      {/* Undo Delete Toast / Snackbar (as mandated in §5) */}
      {pendingUndoTx && (
        <div
          id="undo-toast"
          className="bg-zinc-900 text-white px-4 py-2.5 rounded-[4px] shadow-lg flex items-center justify-between gap-3 border border-zinc-800 animate-slide-up"
        >
          <div className="flex items-center gap-2 text-xs">
            <RotateCcw className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>
              Deleted transaction "
              <strong className="font-medium text-zinc-100">{pendingUndoTx.note || 'Untitled'}</strong>" (
              {formatCurrency(pendingUndoTx.amount, currencySymbol)}).
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              Auto-finalizing in {undoSecondsLeft}s
            </span>
          </div>
          <button
            onClick={onUndoDelete}
            id="btn-undo-delete"
            className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-semibold rounded-[3px] transition-colors"
          >
            Undo Delete
          </button>
        </div>
      )}

      {/* Transactions Container */}
      <div className="bg-white border border-zinc-200 rounded-[5px] shadow-xs divide-y divide-zinc-100">
        {monthGroups.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Layers className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
            <p className="text-sm font-medium text-zinc-700">
              No transactions found {selectedMonthYearLabel ? `for ${selectedMonthYearLabel}` : ''}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {searchQuery || filterType !== 'all' || filterCategory !== 'all'
                ? 'Try clearing your filters or search terms.'
                : 'Add an entry using the Quick-Entry form above.'}
            </p>
          </div>
        ) : (
          monthGroups.map((month) => (
            <div key={month.yearMonth} className="p-4 sm:p-5">
              {/* Level 1: Month Header (e.g. "Sep 2026") */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-600" />
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                    {month.monthLabel}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                  <span className="text-emerald-700 font-medium">
                    +{formatCurrency(month.monthTotalIn, currencySymbol)}
                  </span>
                  <span className="text-rose-700 font-medium">
                    -{formatCurrency(month.monthTotalOut, currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Weeks within Month */}
              <div className="space-y-4 ml-1 sm:ml-3">
                {month.weeks.map((week) => (
                  <div key={`${month.yearMonth}-${week.weekNumber}`} className="space-y-2">
                    {/* Level 2: Week Header (e.g. "Week 1", "Week 2") */}
                    <div className="flex items-center justify-between py-1 px-2 bg-zinc-50/80 rounded-[4px] border border-zinc-100">
                      <span className="text-xs font-semibold text-zinc-700 font-mono">
                        {week.weekLabel}
                      </span>
                      <div className="text-[11px] font-mono text-zinc-500 tabular-nums">
                        Out: {formatCurrency(week.weekTotalOut, currencySymbol)}
                      </div>
                    </div>

                    {/* Days within Week */}
                    <div className="space-y-3 ml-2 sm:ml-4">
                      {week.days.map((day) => (
                        <div key={day.date} className="space-y-1">
                          {/* Level 3: Day Header (e.g. "Sep 1") */}
                          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 pt-1">
                            <span className="font-mono text-zinc-800 font-semibold">
                              {day.displayDate} ({day.dayOfWeek})
                            </span>
                            <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                              Daily out: {formatCurrency(day.dayTotalOut, currencySymbol)}
                            </span>
                          </div>

                          {/* Chronological Row Entries */}
                          <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-[4px] overflow-hidden bg-white">
                            {day.transactions.map((tx) => {
                              const cat = categoryMap.get(tx.categoryId);
                              const catColor = cat ? cat.color : '#52525B';
                              const catIcon = cat ? cat.icon : 'Tag';
                              const catName = cat ? cat.name : 'Other';

                              return (
                                <div
                                  key={tx.id}
                                  id={`tx-row-${tx.id}`}
                                  className="group flex flex-wrap items-center justify-between py-2 px-3 hover:bg-zinc-50/80 transition-colors text-xs"
                                >
                                  {/* Left: Tag [OUT]/[IN], Amount (color-coded per category!), Category, Note */}
                                  <div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 min-w-[240px]">
                                    {/* Tag Badge: fixed width so [OUT] and [IN] occupy identical width */}
                                    <span
                                      className={`w-12 shrink-0 flex items-center justify-center text-center py-0.5 rounded-[3px] font-mono text-[10px] font-bold tracking-wider uppercase border ${
                                        tx.type === 'expense'
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      }`}
                                    >
                                      [{tx.type === 'expense' ? 'OUT' : 'IN'}]
                                    </span>

                                    {/* Amount: fixed width so all amounts and following columns align vertically */}
                                    <span
                                      className={`font-mono text-sm font-semibold tabular-nums w-28 shrink-0 ${
                                        tx.type === 'expense' ? 'text-zinc-900' : 'text-emerald-600'
                                      }`}
                                    >
                                      {formatCurrency(tx.amount, currencySymbol)}
                                    </span>

                                    {/* Category with Icon */}
                                    <span className="flex items-center gap-1 text-zinc-700 font-medium whitespace-nowrap">
                                      <CategoryIcon name={catIcon} className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>{catName}</span>
                                    </span>

                                    {/* Account Badge if available */}
                                    {tx.accountId && accountMap.get(tx.accountId) && (
                                      <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-600 bg-zinc-100/90 px-1.5 py-0.5 rounded-[3px] border border-zinc-200/60 whitespace-nowrap">
                                        <span
                                          className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                                          style={{ backgroundColor: accountMap.get(tx.accountId)!.color }}
                                        />
                                        <AccountIcon name={accountMap.get(tx.accountId)!.icon} className="w-3 h-3 shrink-0 text-zinc-500" />
                                        <span>{accountMap.get(tx.accountId)!.name}</span>
                                      </span>
                                    )}

                                    {/* Description / Note */}
                                    {tx.note && (
                                      <span className="text-zinc-500 truncate max-w-[200px] sm:max-w-[320px]">
                                        {tx.note}
                                      </span>
                                    )}
                                  </div>

                                  {/* Right: Subtle 12-hour timestamp and row actions */}
                                  <div className="flex items-center gap-3">
                                    {/* Subtle 12-hour timestamp next to entry per §5 */}
                                    <span className="font-mono text-[11px] text-zinc-400 tabular-nums flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-zinc-300" />
                                      {tx.time}
                                    </span>

                                    {/* Actions */}
                                    <div className="flex items-center opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                      <button
                                        onClick={() => setEditingTx(tx)}
                                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded-[3px] hover:bg-zinc-200/60"
                                        title="Edit transaction"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClick(tx.id)}
                                        className="p-1 text-zinc-400 hover:text-rose-600 rounded-[3px] hover:bg-rose-50"
                                        title="Delete transaction"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Load More Button */}
        {filtered.length > visibleCount && (
          <div className="p-3.5 sm:p-4 text-center border-t border-zinc-100 bg-zinc-50/50">
            <button
              type="button"
              id="btn-load-more"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-800 hover:text-zinc-950 border border-zinc-200 hover:border-zinc-300 text-xs font-semibold rounded-[4px] shadow-2xs transition-colors cursor-pointer"
            >
              <span>Load 10 more transactions</span>
              <span className="text-[11px] text-zinc-400 font-mono font-normal">
                (Showing {Math.min(visibleCount, filtered.length)} of {filtered.length})
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (per §5) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-sm w-full shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="text-sm font-semibold text-zinc-900">Delete this transaction?</h4>
            </div>
            <p className="text-xs text-zinc-600">
              Delete this transaction? This can be undone immediately from the notification banner.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 font-medium rounded-[3px]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-[3px] transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleEditSubmit}
            className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-md w-full shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h4 className="text-sm font-semibold text-zinc-900">Edit Transaction</h4>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="text-zinc-400 hover:text-zinc-600 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 items-start">
                <div>
                  <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">Currency</label>
                  <div className="relative h-9">
                    <CurrencySelect
                      currencies={currencies}
                      value={editingTx.currency}
                      onChange={(code) =>
                        setEditingTx({ ...editingTx, currency: code })
                      }
                      ariaLabel="Transaction currency"
                      className="h-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">Amount</label>
                  <div className="relative h-9">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="999999999.99"
                      required
                      value={editingTx.amount || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setEditingTx({ ...editingTx, amount: 0 });
                        } else {
                          const num = parseFloat(val);
                          if (!isNaN(num) && num <= 999999999.99) {
                            setEditingTx({ ...editingTx, amount: num });
                          }
                        }
                      }}
                      placeholder="Enter amount"
                      className="w-full h-full bg-white border border-zinc-200 px-2.5 rounded-[4px] font-mono font-semibold tabular-nums text-sm text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">Category</label>
                <div className="relative h-9">
                  <CategorySelect
                    id="edit-tx-category-select"
                    ariaLabel="Transaction category"
                    categories={categories.filter((c) => c.type === editingTx.type)}
                    value={editingTx.categoryId}
                    onChange={(catId) =>
                      setEditingTx({ ...editingTx, categoryId: catId })
                    }
                    showAllOption={false}
                    className="h-full"
                  />
                </div>
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">Account</label>
                  <div className="relative h-9">
                    <select
                      id="edit-tx-account-select"
                      aria-label="Transaction account"
                      value={editingTx.accountId || ''}
                      onChange={(e) =>
                        setEditingTx({ ...editingTx, accountId: e.target.value })
                      }
                      className="w-full h-full bg-white border border-zinc-200 px-2.5 rounded-[4px] text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="">(No Account)</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5 h-4 leading-4">
                  <label className="block text-zinc-500 font-medium">Description (Optional)</label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {(editingTx.note || '').length}/100
                  </span>
                </div>
                <div className="relative h-9">
                  <input
                    type="text"
                    maxLength={100}
                    value={editingTx.note}
                    onChange={(e) => setEditingTx({ ...editingTx, note: e.target.value.slice(0, 100) })}
                    placeholder="Description (optional)"
                    className="w-full h-full bg-white border border-zinc-200 px-2.5 rounded-[4px] text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[3px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-[3px]"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
