import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
  Calendar,
  Search,
  RotateCcw,
  Plus,
  ArrowRight,
  Filter,
  Check,
} from 'lucide-react';
import { Currency, Debt } from '../types';
import { formatCurrency } from '../utils/formatters';
import { SpecularButton } from './ui/SpecularButton';
import { ModalPortal } from './ui/ModalPortal';
import { AddDebtModal } from './AddDebtModal';
import SpringCheck from './ui/SpringCheck';

interface DebtTrackerProps {
  debts: Debt[];
  currencies: Currency[];
  selectedCurrency: string;
  onAddDebt: (debt: Omit<Debt, 'id' | 'createdAt' | 'settled'>) => void;
  onToggleSettle: (id: string) => void;
  onDeleteDebt: (id: string) => void;
}

type TabView = 'active' | 'history';
type HistoryFilter = 'all' | 'owe' | 'owed';

export function DebtTracker({
  debts,
  currencies,
  selectedCurrency,
  onAddDebt,
  onToggleSettle,
  onDeleteDebt,
}: DebtTrackerProps) {
  const [activeView, setActiveView] = useState<TabView>('active');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);

  // Track animating debts: id -> 'checking' | 'sliding'
  const [animatingDebts, setAnimatingDebts] = useState<Record<string, 'checking' | 'sliding'>>({});

  const currencyObj = currencies.find((c) => c.code === selectedCurrency);
  const currencySymbol = currencyObj?.symbol || '₱';

  // Active debts (unsettled)
  const debtsYouOwe = useMemo(() => debts.filter((d) => d.type === 'owe'), [debts]);
  const debtsOwedToYou = useMemo(() => debts.filter((d) => d.type === 'owed'), [debts]);

  const activePayables = useMemo(
    () => debtsYouOwe.filter((d) => !d.settled),
    [debtsYouOwe]
  );
  const activeReceivables = useMemo(
    () => debtsOwedToYou.filter((d) => !d.settled),
    [debtsOwedToYou]
  );

  // Settled debts for History
  const settledPayables = useMemo(
    () => debtsYouOwe.filter((d) => d.settled),
    [debtsYouOwe]
  );
  const settledReceivables = useMemo(
    () => debtsOwedToYou.filter((d) => d.settled),
    [debtsOwedToYou]
  );
  const allSettledDebts = useMemo(
    () => debts.filter((d) => d.settled).sort((a, b) => (b.settledAt || b.createdAt) - (a.settledAt || a.createdAt)),
    [debts]
  );

  // Totals
  const totalYouOweUnsettled = activePayables.reduce((sum, d) => sum + d.amount, 0);
  const totalOwedToYouUnsettled = activeReceivables.reduce((sum, d) => sum + d.amount, 0);

  const totalSettledPayables = settledPayables.reduce((sum, d) => sum + d.amount, 0);
  const totalSettledReceivables = settledReceivables.reduce((sum, d) => sum + d.amount, 0);

  // Handler for SpringCheck interaction on active entries
  const handleCheckDebt = (debt: Debt) => {
    if (animatingDebts[debt.id]) return;

    // Step 1: Spring check animation begins (spring swell, tick draw, strike-through)
    setAnimatingDebts((prev) => ({ ...prev, [debt.id]: 'checking' }));

    // Step 2: After spring check animation displays, trigger slide out to the right + fade out
    setTimeout(() => {
      setAnimatingDebts((prev) => ({ ...prev, [debt.id]: 'sliding' }));
    }, 420);

    // Step 3: Once slide out finishes, officially mark as settled and remove from active list
    setTimeout(() => {
      onToggleSettle(debt.id);
      setAnimatingDebts((prev) => {
        const copy = { ...prev };
        delete copy[debt.id];
        return copy;
      });
    }, 850);
  };

  // Filtered history records
  const filteredHistory = useMemo(() => {
    let list = allSettledDebts;
    if (historyFilter === 'owe') {
      list = list.filter((d) => d.type === 'owe');
    } else if (historyFilter === 'owed') {
      list = list.filter((d) => d.type === 'owed');
    }

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.person.toLowerCase().includes(q) ||
          (d.note && d.note.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allSettledDebts, historyFilter, historySearch]);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div id="debt-tracker-view" className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white border border-zinc-200 rounded-[6px] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
              Debts & Liabilities Tracker
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Keep an organized record of money you owe vs. funds owed to you by others.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SpecularButton
              onClick={() => setShowAddModal(true)}
              id="btn-add-debt"
              size="sm"
              radius={4}
              className="px-3 py-1.5 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </SpecularButton>
          </div>
        </div>

        {/* View Switcher: Active Debts vs Debt History */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="inline-flex items-center p-1 bg-zinc-100 rounded-[6px] border border-zinc-200 text-xs font-medium">
            <button
              type="button"
              id="tab-active-debts"
              onClick={() => setActiveView('active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition-all cursor-pointer ${
                activeView === 'active'
                  ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>Active Debts</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeView === 'active'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {activePayables.length + activeReceivables.length}
              </span>
            </button>

            <button
              type="button"
              id="tab-debt-history"
              onClick={() => setActiveView('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition-all cursor-pointer ${
                activeView === 'history'
                  ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>History</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeView === 'history'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {allSettledDebts.length}
              </span>
            </button>
          </div>

          {activeView === 'active' && (
            <span className="text-[11px] text-zinc-400 hidden sm:inline-flex items-center gap-1">
              Check an entry to mark as completed
            </span>
          )}
        </div>

        {/* Summary Metrics */}
        {activeView === 'active' ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
            <div className="p-3 bg-zinc-50/70 border border-zinc-200/80 rounded-[5px]">
              <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                Money You Owe (Payables)
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-rose-700 tabular-nums">
                {formatCurrency(totalYouOweUnsettled, currencySymbol)}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {activePayables.length} unsettled {activePayables.length === 1 ? 'record' : 'records'}
              </p>
            </div>

            <div className="p-3 bg-zinc-50/70 border border-zinc-200/80 rounded-[5px]">
              <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                Money Owed to You (Receivables)
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 tabular-nums">
                {formatCurrency(totalOwedToYouUnsettled, currencySymbol)}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {activeReceivables.length} unsettled {activeReceivables.length === 1 ? 'record' : 'records'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-zinc-50/70 border border-zinc-200/80 rounded-[5px]">
              <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                Total Paid (Payables)
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-zinc-900 tabular-nums">
                {formatCurrency(totalSettledPayables, currencySymbol)}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {settledPayables.length} completed
              </p>
            </div>

            <div className="p-3 bg-zinc-50/70 border border-zinc-200/80 rounded-[5px]">
              <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                Total Collected (Receivables)
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-emerald-700 tabular-nums">
                {formatCurrency(totalSettledReceivables, currencySymbol)}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {settledReceivables.length} completed
              </p>
            </div>

            <div className="p-3 bg-zinc-50/70 border border-zinc-200/80 rounded-[5px]">
              <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                Completed Records
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-zinc-900 tabular-nums">
                {allSettledDebts.length}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Tracked in history
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* VIEW: ACTIVE DEBTS (PAYABLES & RECEIVABLES PANELS) */}
      {/* ======================================================== */}
      {activeView === 'active' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Panel 1: Payables */}
          <div
            id="panel-payables"
            className="bg-white border border-zinc-200 rounded-[6px] p-4 sm:p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Payables
                  </h3>
                  <p className="text-[11px] text-zinc-400">Money you need to pay</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-rose-700 tabular-nums">
                  {formatCurrency(totalYouOweUnsettled, currencySymbol)}
                </span>
                <p className="text-[10px] text-zinc-400">{activePayables.length} active</p>
              </div>
            </div>

            {activePayables.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs space-y-1">
                <p className="font-medium text-zinc-600">No active payables</p>
                <p className="text-[11px]">You're all caught up on money you owe.</p>
                {settledPayables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('history');
                      setHistoryFilter('owe');
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 hover:text-rose-800 hover:underline cursor-pointer"
                  >
                    <span>View {settledPayables.length} completed payables in History</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 overflow-hidden">
                {activePayables.map((debt) => {
                  const animState = animatingDebts[debt.id];
                  const isChecked = Boolean(animState);
                  const isSliding = animState === 'sliding';

                  return (
                    <div
                      key={debt.id}
                      className="py-3 group relative transition-all duration-350 ease-out"
                      style={
                        isSliding
                          ? {
                              transform: 'translateX(100%)',
                              opacity: 0,
                              pointerEvents: 'none',
                              maxHeight: '0px',
                              paddingTop: '0px',
                              paddingBottom: '0px',
                              overflow: 'hidden',
                              transition:
                                'transform 380ms cubic-bezier(0.2, 0, 0.2, 1), opacity 350ms ease, max-height 380ms ease 120ms, padding 380ms ease 120ms',
                            }
                          : {
                              transform: 'translateX(0)',
                              opacity: 1,
                              transition: 'transform 380ms ease, opacity 350ms ease',
                            }
                      }
                    >
                      <div className="flex items-start justify-between gap-3 text-xs">
                        {/* Left Side: Checkbox first, then person/entity label */}
                        <div className="flex-1 min-w-0">
                          <SpringCheck
                            id={`debt-check-${debt.id}`}
                            checked={isChecked}
                            onChange={() => handleCheckDebt(debt)}
                            disabled={isChecked}
                            color="#18181b"
                            fillColor="#059669"
                            checkColor="#ffffff"
                            boxSize={22}
                            boxRadius={6}
                            fontSize={13.5}
                            bounce={0.25}
                            strikeLag={0.12}
                            strike="left"
                            label={
                              <span className="font-semibold text-zinc-900 tracking-tight block truncate max-w-[200px] sm:max-w-xs">
                                {debt.person}
                              </span>
                            }
                            ariaLabel={`Mark payable to ${debt.person} as settled`}
                            className="w-full justify-start"
                          />

                          {/* Extra Details: Notes & Due Date */}
                          <div className="ml-8 space-y-0.5 mt-0.5">
                            {debt.note && (
                              <p className="text-zinc-500 text-[11px] leading-relaxed truncate">
                                {debt.note}
                              </p>
                            )}
                            {debt.dueDate && (
                              <p className="text-zinc-400 text-[10px] font-mono flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-zinc-400" />
                                <span>Due {debt.dueDate}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Amount & Delete Button */}
                        <div className="flex items-center gap-2.5 shrink-0 pt-1">
                          <span className="font-mono font-bold text-rose-700 tabular-nums text-sm">
                            {formatCurrency(debt.amount, currencySymbol)}
                          </span>

                          <button
                            type="button"
                            onClick={() => setDebtToDelete(debt)}
                            disabled={isChecked}
                            className="p-1.5 text-zinc-300 hover:text-rose-600 rounded-[3px] transition-colors cursor-pointer disabled:opacity-40"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Link to settled history for payables */}
            {settledPayables.length > 0 && activePayables.length > 0 && (
              <div className="pt-2 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('history');
                    setHistoryFilter('owe');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  <span>{settledPayables.length} completed payables in History</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Panel 2: Receivables */}
          <div
            id="panel-receivables"
            className="bg-white border border-zinc-200 rounded-[6px] p-4 sm:p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Receivables
                  </h3>
                  <p className="text-[11px] text-zinc-400">Money owed to you</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(totalOwedToYouUnsettled, currencySymbol)}
                </span>
                <p className="text-[10px] text-zinc-400">{activeReceivables.length} active</p>
              </div>
            </div>

            {activeReceivables.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs space-y-1">
                <p className="font-medium text-zinc-600">No active receivables</p>
                <p className="text-[11px]">No pending funds owed to you.</p>
                {settledReceivables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('history');
                      setHistoryFilter('owed');
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    <span>View {settledReceivables.length} completed receivables in History</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 overflow-hidden">
                {activeReceivables.map((debt) => {
                  const animState = animatingDebts[debt.id];
                  const isChecked = Boolean(animState);
                  const isSliding = animState === 'sliding';

                  return (
                    <div
                      key={debt.id}
                      className="py-3 group relative transition-all duration-350 ease-out"
                      style={
                        isSliding
                          ? {
                              transform: 'translateX(100%)',
                              opacity: 0,
                              pointerEvents: 'none',
                              maxHeight: '0px',
                              paddingTop: '0px',
                              paddingBottom: '0px',
                              overflow: 'hidden',
                              transition:
                                'transform 380ms cubic-bezier(0.2, 0, 0.2, 1), opacity 350ms ease, max-height 380ms ease 120ms, padding 380ms ease 120ms',
                            }
                          : {
                              transform: 'translateX(0)',
                              opacity: 1,
                              transition: 'transform 380ms ease, opacity 350ms ease',
                            }
                      }
                    >
                      <div className="flex items-start justify-between gap-3 text-xs">
                        {/* Left Side: Checkbox first, then person/entity label */}
                        <div className="flex-1 min-w-0">
                          <SpringCheck
                            id={`debt-check-${debt.id}`}
                            checked={isChecked}
                            onChange={() => handleCheckDebt(debt)}
                            disabled={isChecked}
                            color="#18181b"
                            fillColor="#059669"
                            checkColor="#ffffff"
                            boxSize={22}
                            boxRadius={6}
                            fontSize={13.5}
                            bounce={0.25}
                            strikeLag={0.12}
                            strike="left"
                            label={
                              <span className="font-semibold text-zinc-900 tracking-tight block truncate max-w-[200px] sm:max-w-xs">
                                {debt.person}
                              </span>
                            }
                            ariaLabel={`Mark receivable from ${debt.person} as collected`}
                            className="w-full justify-start"
                          />

                          {/* Extra Details: Notes & Due Date */}
                          <div className="ml-8 space-y-0.5 mt-0.5">
                            {debt.note && (
                              <p className="text-zinc-500 text-[11px] leading-relaxed truncate">
                                {debt.note}
                              </p>
                            )}
                            {debt.dueDate && (
                              <p className="text-zinc-400 text-[10px] font-mono flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-zinc-400" />
                                <span>Due {debt.dueDate}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Amount & Delete Button */}
                        <div className="flex items-center gap-2.5 shrink-0 pt-1">
                          <span className="font-mono font-bold text-emerald-700 tabular-nums text-sm">
                            {formatCurrency(debt.amount, currencySymbol)}
                          </span>

                          <button
                            type="button"
                            onClick={() => setDebtToDelete(debt)}
                            disabled={isChecked}
                            className="p-1.5 text-zinc-300 hover:text-rose-600 rounded-[3px] transition-colors cursor-pointer disabled:opacity-40"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Link to settled history for receivables */}
            {settledReceivables.length > 0 && activeReceivables.length > 0 && (
              <div className="pt-2 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('history');
                    setHistoryFilter('owed');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  <span>{settledReceivables.length} completed receivables in History</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW: SEPARATE DEBT HISTORY */}
      {/* ======================================================== */}
      {activeView === 'history' && (
        <div id="debt-history-panel" className="bg-white border border-zinc-200 rounded-[6px] p-5 shadow-xs space-y-4">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span>Past Payables & Receivables History</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                All records you checked off are saved here so you can review completed settlements.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setHistoryFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-[4px] border transition-colors cursor-pointer ${
                  historyFilter === 'all'
                    ? 'bg-zinc-900 text-white border-zinc-900 font-medium'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                All ({allSettledDebts.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('owe')}
                className={`px-2.5 py-1 text-xs rounded-[4px] border transition-colors cursor-pointer ${
                  historyFilter === 'owe'
                    ? 'bg-rose-700 text-white border-rose-700 font-medium'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                Past Payables ({settledPayables.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('owed')}
                className={`px-2.5 py-1 text-xs rounded-[4px] border transition-colors cursor-pointer ${
                  historyFilter === 'owed'
                    ? 'bg-emerald-700 text-white border-emerald-700 font-medium'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                Past Receivables ({settledReceivables.length})
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search past records by person or note..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-[4px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors"
            />
          </div>

          {/* History List */}
          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 text-xs space-y-1.5">
              <Clock className="w-6 h-6 mx-auto text-zinc-300" />
              <p className="font-medium text-zinc-600">No history records found</p>
              <p className="text-[11px] max-w-sm mx-auto">
                {historySearch
                  ? 'No records match your search filter.'
                  : 'When you check off payables or receivables from your active list, they will appear here.'}
              </p>
              {allSettledDebts.length === 0 && (
                <button
                  type="button"
                  onClick={() => setActiveView('active')}
                  className="mt-2 text-xs font-medium text-zinc-900 underline cursor-pointer"
                >
                  Return to Active Debts
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-[5px] overflow-hidden">
              {filteredHistory.map((debt) => {
                const isPayable = debt.type === 'owe';

                return (
                  <div
                    key={debt.id}
                    className="p-3.5 sm:px-4 bg-white hover:bg-zinc-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    {/* Left: Info */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-semibold uppercase tracking-wider ${
                            isPayable
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <Check className="w-2.5 h-2.5" />
                          <span>{isPayable ? 'Paid' : 'Received'}</span>
                        </span>

                        <span className="font-semibold text-zinc-900 tracking-tight">
                          {debt.person}
                        </span>
                      </div>

                      {debt.note && (
                        <p className="text-zinc-600 text-[11px] leading-relaxed">
                          {debt.note}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                        {debt.settledAt ? (
                          <span>Completed: {formatDate(debt.settledAt)}</span>
                        ) : (
                          <span>Completed</span>
                        )}
                        {debt.dueDate && <span>Original due date: {debt.dueDate}</span>}
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                      <div className="text-left sm:text-right">
                        <div
                          className={`font-mono font-bold text-sm tabular-nums ${
                            isPayable ? 'text-zinc-700 line-through' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(debt.amount, currencySymbol)}
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {isPayable ? 'Settled payable' : 'Collected receivable'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleSettle(debt.id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-[3px] transition-colors cursor-pointer flex items-center gap-1"
                          title="Restore back to active list"
                        >
                          <RotateCcw className="w-3 h-3 text-zinc-500" />
                          <span>Reopen</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDebtToDelete(debt)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-[3px] transition-colors cursor-pointer"
                          title="Delete from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Debt Modal */}
      {showAddModal && (
        <AddDebtModal
          onClose={() => setShowAddModal(false)}
          onAddDebt={onAddDebt}
          currencies={currencies}
          defaultCurrency={selectedCurrency}
        />
      )}

      {/* Delete Debt Confirmation Modal */}
      {debtToDelete && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDebtToDelete(null);
              }
            }}
          >
            <div className="bg-white rounded-[6px] border border-zinc-200 p-5 max-w-sm w-full shadow-lg space-y-4 my-auto animate-modal-slide-in">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <h4 className="text-sm font-semibold text-zinc-900">Delete Record</h4>
                <button
                  type="button"
                  onClick={() => setDebtToDelete(null)}
                  className="text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">
                Are you sure you want to remove the record for{' '}
                <strong className="text-zinc-900">{debtToDelete.person}</strong> of{' '}
                <strong className="font-mono text-zinc-900">
                  {formatCurrency(debtToDelete.amount, currencySymbol)}
                </strong>
                ? This action cannot be reversed.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setDebtToDelete(null)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[3px] border border-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteDebt(debtToDelete.id);
                    setDebtToDelete(null);
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-[3px] transition-colors cursor-pointer"
                >
                  Delete Record
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
