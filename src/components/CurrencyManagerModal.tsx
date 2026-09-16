import React, { useState } from 'react';
import { Coins, Plus, Trash2, Check, X, ArrowRightLeft } from 'lucide-react';
import { Currency } from '../types';
import { getExchangeRate, DEFAULT_EXCHANGE_RATES } from '../utils/currency';

interface CurrencyManagerModalProps {
  currencies: Currency[];
  selectedCurrency: string;
  onSelectDefaultCurrency: (code: string) => void;
  onAddCurrency: (currency: Currency) => void;
  onDeleteCurrency: (code: string) => void;
  onClose: () => void;
}

export function CurrencyManagerModal({
  currencies,
  selectedCurrency,
  onSelectDefaultCurrency,
  onAddCurrency,
  onDeleteCurrency,
  onClose,
}: CurrencyManagerModalProps) {
  const [code, setCode] = useState('');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [convertedNotice, setConvertedNotice] = useState<string | null>(null);

  const selectedCurrencyObj = currencies.find((c) => c.code === selectedCurrency);
  const selectedCurrencySymbol = selectedCurrencyObj?.symbol || selectedCurrency;

  const ratesMap: Record<string, number> = {};
  currencies.forEach((c) => {
    if (c.exchangeRate) ratesMap[c.code] = c.exchangeRate;
  });

  const handleSetDefault = (currCode: string) => {
    onSelectDefaultCurrency(currCode);
    setConvertedNotice(`All balances, savings, debts, and goals converted to ${currCode}`);
    setTimeout(() => {
      setConvertedNotice(null);
    }, 4000);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanSymbol = symbol.trim();
    if (!cleanCode || !cleanSymbol) return;

    if (currencies.some((c) => c.code === cleanCode)) {
      alert('A currency with this code already exists.');
      return;
    }

    const parsedRate = parseFloat(rateInput);
    const exchangeRate =
      !isNaN(parsedRate) && parsedRate > 0
        ? parsedRate
        : DEFAULT_EXCHANGE_RATES[cleanCode] || 1.0;

    onAddCurrency({
      code: cleanCode,
      symbol: cleanSymbol,
      name: name.trim() || cleanCode,
      exchangeRate,
    });

    setCode('');
    setSymbol('');
    setName('');
    setRateInput('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-md w-full shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-zinc-700" />
            <h3 className="text-sm font-semibold text-zinc-900">Manage Currencies</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xs">
            ✕
          </button>
        </div>

        <p className="text-xs text-zinc-500">
          Select your default currency. All historical savings, transaction amounts, debts, and goals will be automatically converted.
        </p>

        {convertedNotice && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-[4px] text-xs text-emerald-800 flex items-center gap-2 animate-fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{convertedNotice}</span>
          </div>
        )}

        {/* Currency List */}
        <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-[4px] max-h-60 overflow-y-auto">
          {currencies.map((curr) => {
            const isSelected = curr.code === selectedCurrency;
            const rateToSelected = getExchangeRate(curr.code, selectedCurrency, ratesMap);

            return (
              <div
                key={curr.code}
                className="py-2.5 px-3 flex items-center justify-between text-xs hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-[3px] bg-zinc-100 font-mono font-bold flex items-center justify-center text-zinc-800 text-sm">
                    {curr.symbol}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-900 font-mono">
                        {curr.code}
                      </span>
                      {isSelected ? (
                        <span className="px-1.5 py-0.5 bg-zinc-900 text-white text-[10px] font-mono rounded-[2px]">
                          Default
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-500">
                          1 {curr.code} ≈ {selectedCurrencySymbol}
                          {rateToSelected >= 1
                            ? rateToSelected.toFixed(2)
                            : rateToSelected.toFixed(4)}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400">{curr.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isSelected && (
                    <button
                      onClick={() => handleSetDefault(curr.code)}
                      className="px-2 py-1 text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-[3px] transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                  {currencies.length > 1 && (
                    <button
                      onClick={() => onDeleteCurrency(curr.code)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                      title="Delete currency"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Currency Form */}
        {isAdding ? (
          <form
            onSubmit={handleAdd}
            className="p-3 bg-zinc-50 border border-zinc-200 rounded-[4px] space-y-2.5 text-xs"
          >
            <div className="font-semibold text-zinc-900">Add New Currency</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-500 font-medium mb-1">Currency Code</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="CAD"
                  className="w-full bg-white border border-zinc-200 px-2 py-1 rounded-[3px] font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium mb-1">Currency Symbol</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="C$"
                  className="w-full bg-white border border-zinc-200 px-2 py-1 rounded-[3px] font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-500 font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Canadian Dollar"
                  className="w-full bg-white border border-zinc-200 px-2 py-1 rounded-[3px]"
                />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium mb-1">
                  Rate per USD (opt.)
                </label>
                <input
                  type="number"
                  step="any"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  placeholder="e.g. 1.38"
                  className="w-full bg-white border border-zinc-200 px-2 py-1 rounded-[3px] font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
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
                Save
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-1.5 border border-dashed border-zinc-300 hover:border-zinc-400 text-zinc-600 hover:text-zinc-900 rounded-[4px] text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Currency</span>
          </button>
        )}

        <div className="pt-2 border-t border-zinc-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-[3px] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
