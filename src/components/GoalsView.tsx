import React, { useState, useRef } from 'react';
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  Trash2,
  Coins,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon,
  HelpCircle,
  Clock,
  X,
} from 'lucide-react';
import { Currency, Goal } from '../types';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { CurrencySelect } from './CurrencySelect';
import { SpecularButton } from './ui/SpecularButton';
import { ModalPortal } from './ui/ModalPortal';
import { CreateGoalModal } from './CreateGoalModal';

interface GoalsViewProps {
  goals: Goal[];
  currencies: Currency[];
  selectedCurrency: string;
  currentSavings: number;
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onUpdateGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
}

export function GoalsView({
  goals,
  currencies,
  selectedCurrency,
  currentSavings,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
}: GoalsViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  // Deposit to goal modal state
  const [contributingGoal, setContributingGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const currencyObj = currencies.find((c) => c.code === selectedCurrency);
  const currencySymbol = currencyObj?.symbol || '₱';

  const handleContributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributingGoal) return;
    const addAmt = parseFloat(contributeAmount);
    if (isNaN(addAmt) || addAmt <= 0) return;

    const newEarmarked = (contributingGoal.earmarkedAmount || 0) + addAmt;
    onUpdateGoal({
      ...contributingGoal,
      earmarkedAmount: newEarmarked,
      isAchieved: newEarmarked >= contributingGoal.targetPrice,
    });

    setContributingGoal(null);
    setContributeAmount('');
  };

  const getDaysRemaining = (targetDateStr: string) => {
    if (!targetDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr + 'T00:00:00');
    const diffMs = target.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  return (
    <div id="goals-view" className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white border border-zinc-200 rounded-[5px] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
            Purchase & Savings Goals
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Track planned purchases and target savings funds.
          </p>
        </div>

        <div className="flex justify-end sm:justify-start items-center gap-3 shrink-0">
          <SpecularButton
            onClick={() => setShowAddModal(true)}
            id="btn-add-goal"
            size="sm"
            radius={4}
            className="px-3 py-1.5 text-white text-xs font-semibold shadow-xs"
          >
            <span>Create Goal</span>
          </SpecularButton>
        </div>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-[5px] p-12 text-center text-zinc-500">
          <p className="text-sm font-medium text-zinc-700">Add your first purchase goal</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const daysLeft = getDaysRemaining(goal.plannedDate);

            // Progress calculation based on allocation mode (§8 clarification):
            const effectiveFund =
              goal.allocationMode === 'earmarked'
                ? goal.earmarkedAmount
                : Math.min(goal.targetPrice, Math.max(0, currentSavings));

            const remainingNeeded = Math.max(0, goal.targetPrice - effectiveFund);
            const progressPercent = Math.min(
              100,
              Math.max(0, (effectiveFund / goal.targetPrice) * 100)
            );
            const isReady = remainingNeeded === 0;

            return (
              <div
                key={goal.id}
                id={`goal-card-${goal.id}`}
                className="bg-white border border-zinc-200 rounded-[5px] overflow-hidden shadow-xs flex flex-col justify-between"
              >
                {/* Image Header if present */}
                {goal.imageUrl ? (
                  <div className="h-36 w-full overflow-hidden bg-zinc-100 relative border-b border-zinc-100">
                    <img
                      src={goal.imageUrl}
                      alt={goal.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 rounded-[3px] bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono uppercase tracking-wider">
                        {goal.allocationMode === 'earmarked' ? 'Earmarked' : 'Shared Pool'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pt-4 flex justify-between items-start">
                    <span className="px-2 py-0.5 rounded-[3px] bg-zinc-100 text-zinc-600 text-[10px] font-mono uppercase tracking-wider border border-zinc-200">
                      {goal.allocationMode === 'earmarked' ? 'Earmarked' : 'Shared Pool'}
                    </span>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                        {goal.name}
                      </h3>
                      {isReady && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-[3px] font-medium border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </div>
                    {goal.notes && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{goal.notes}</p>
                    )}
                  </div>

                  {/* Target Price & Remaining Details (as strictly required in §8) */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-500">Target Price:</span>
                      <span className="font-semibold text-zinc-900 tabular-nums">
                        {formatCurrency(goal.targetPrice, currencySymbol)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-500">Amount Still Needed:</span>
                      <span
                        className={`font-semibold tabular-nums ${
                          remainingNeeded > 0 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(remainingNeeded, currencySymbol)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-zinc-400" /> Planned Date:
                      </span>
                      <span className="font-mono text-zinc-700 text-xs font-medium">
                        {goal.plannedDate} ({daysLeft > 0 ? `${daysLeft}d left` : 'Passed'})
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                        <span>Progress</span>
                        <span className="font-semibold text-zinc-700">
                          {progressPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isReady ? 'bg-emerald-600' : 'bg-zinc-900'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-4 py-2.5 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {goal.allocationMode === 'earmarked' && !isReady && (
                      <button
                        onClick={() => setContributingGoal(goal)}
                        className="px-2.5 py-1 text-xs bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 font-medium rounded-[3px] transition-colors"
                      >
                        + Deposit Funds
                      </button>
                    )}
                    {isReady && (
                      <button
                        onClick={() =>
                          onUpdateGoal({ ...goal, isAchieved: !goal.isAchieved })
                        }
                        className={`px-2.5 py-1 text-xs font-medium rounded-[3px] transition-colors ${
                          goal.isAchieved
                            ? 'bg-zinc-200 text-zinc-700'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {goal.isAchieved ? 'Mark Pending' : 'Mark Purchased'}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                    title="Delete goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <CreateGoalModal
          onClose={() => setShowAddModal(false)}
          onAddGoal={onAddGoal}
          currencies={currencies}
          defaultCurrency={selectedCurrency}
        />
      )}

      {/* Deposit to Goal Modal */}
      {contributingGoal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setContributingGoal(null);
              }
            }}
          >
            <form
              onSubmit={handleContributeSubmit}
              className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-sm w-full shadow-lg space-y-3 text-xs my-auto animate-modal-slide-in"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <h4 className="text-sm font-semibold text-zinc-900">
                  Deposit Funds to "{contributingGoal.name}"
                </h4>
                <button
                  type="button"
                  onClick={() => setContributingGoal(null)}
                  className="text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  ✕
                </button>
              </div>

              <p className="text-zinc-500 text-xs">
                Current earmarked:{' '}
                <strong className="font-mono text-zinc-800">
                  {formatCurrency(contributingGoal.earmarkedAmount, currencySymbol)}
                </strong>{' '}
                of {formatCurrency(contributingGoal.targetPrice, currencySymbol)}.
              </p>

              <div>
                <label className="block text-zinc-500 font-medium mb-1">
                  Deposit Amount ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  autoFocus
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-[4px] font-mono font-semibold tabular-nums text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setContributingGoal(null)}
                  className="px-3 py-1.5 text-zinc-600 hover:text-zinc-800 rounded-[3px]"
                >
                  Cancel
                </button>
                <SpecularButton
                  type="submit"
                  size="sm"
                  radius={3}
                  className="px-3.5 py-1.5 text-white font-semibold"
                >
                  Confirm Deposit
                </SpecularButton>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
