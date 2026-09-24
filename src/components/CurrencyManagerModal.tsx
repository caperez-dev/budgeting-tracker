import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Trash2,
  Check,
  Search,
} from 'lucide-react';
import { Currency } from '../types';
import {
  WORLD_CURRENCIES,
  WorldCurrency,
  getCurrencyFlag,
  fetchLiveExchangeRates,
} from '../data/worldCurrencies';
import { CurrencyFlag } from './CurrencyFlag';

interface CurrencyManagerModalProps {
  currencies: Currency[];
  selectedCurrency: string;
  onSelectDefaultCurrency: (code: string) => void;
  onAddCurrency: (currency: Currency) => void;
  onDeleteCurrency: (code: string) => void;
  onUpdateRates?: (rates: Record<string, number>) => void;
  onClose: () => void;
}

export function CurrencyManagerModal({
  currencies,
  selectedCurrency,
  onSelectDefaultCurrency,
  onAddCurrency,
  onDeleteCurrency,
  onUpdateRates,
  onClose,
}: CurrencyManagerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const backdropMouseDownRef = React.useRef(false);

  const ratesMap: Record<string, number> = {};
  currencies.forEach((c) => {
    if (c.exchangeRate) ratesMap[c.code] = c.exchangeRate;
  });

  // Keep live rates fresh in the background when modal is open
  useEffect(() => {
    let active = true;
    fetchLiveExchangeRates().then((liveRates) => {
      if (liveRates && active) {
        if (onUpdateRates) onUpdateRates(liveRates);
      }
    });
    return () => {
      active = false;
    };
  }, [onUpdateRates]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleSetDefault = (currCode: string) => {
    onSelectDefaultCurrency(currCode);
    showNotification(`Default currency updated to ${currCode}. Historical data converted.`);
  };

  const handleAddWorldCurrency = (wc: WorldCurrency) => {
    if (currencies.some((c) => c.code === wc.code)) {
      showNotification(`${wc.code} is already in your active currencies.`);
      return;
    }

    onAddCurrency({
      code: wc.code,
      symbol: wc.symbol,
      name: wc.name,
      flag: wc.flag,
      exchangeRate: ratesMap[wc.code] || wc.exchangeRate || 1.0,
    });

    showNotification(`Added ${wc.flag} ${wc.code} (${wc.name}) to your currencies.`);
  };

  // Filtered world currencies based purely on search query
  const query = searchQuery.trim().toLowerCase();

  const filteredWorldCurrencies = WORLD_CURRENCIES.filter((wc) => {
    return (
      !query ||
      wc.code.toLowerCase().includes(query) ||
      wc.name.toLowerCase().includes(query) ||
      wc.country.toLowerCase().includes(query) ||
      wc.symbol.toLowerCase().includes(query)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (backdropMouseDownRef.current && e.target === e.currentTarget) {
          onClose();
        }
        backdropMouseDownRef.current = false;
      }}
    >
      <div className="bg-white rounded-[6px] border border-zinc-200 p-4 sm:p-5 max-w-xl w-full shadow-xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-zinc-800" />
            <h3 className="text-sm font-semibold text-zinc-900">Manage Currencies</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 text-sm leading-none"
          >
            ✕
          </button>
        </div>

        {notification && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-[4px] text-xs text-emerald-800 flex items-center gap-2 shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        <div className="overflow-y-auto space-y-4 flex-1 pr-1">
          {/* Section: Your Active Currencies */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
                Active Currencies ({currencies.length})
              </span>
            </div>

            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-[4px] bg-zinc-50/50">
              {currencies.map((curr) => {
                const isSelected = curr.code === selectedCurrency;
                const flag = curr.flag || getCurrencyFlag(curr.code);

                return (
                  <div
                    key={curr.code}
                    className="py-2 px-3 flex items-center justify-between text-xs hover:bg-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <CurrencyFlag code={curr.code} flag={curr.flag} size="lg" />
                      <span className="w-7 h-7 rounded-[3px] bg-zinc-100 font-mono font-bold flex items-center justify-center text-zinc-800 text-xs">
                        {curr.symbol}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-900 font-mono">
                            {curr.code}
                          </span>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 bg-zinc-900 text-white text-[10px] font-mono rounded-[2px]">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-500">{curr.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isSelected && (
                        <button
                          onClick={() => handleSetDefault(curr.code)}
                          className="px-2 py-1 text-[11px] font-medium bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 rounded-[3px] transition-colors"
                        >
                          Set Default
                        </button>
                      )}
                      {currencies.length > 1 && (
                        <button
                          onClick={() => onDeleteCurrency(curr.code)}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                          title="Remove from active list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Search and Add Currencies directly */}
          <div className="pt-2 border-t border-zinc-100 space-y-2.5">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by country, currency name, or code"
                className="w-full bg-white border border-zinc-200 text-xs pl-8 pr-3 py-1.5 rounded-[4px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Currency Scrollable List */}
            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-[4px] max-h-56 overflow-y-auto bg-white">
              {filteredWorldCurrencies.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400">
                  No currency found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredWorldCurrencies.map((wc) => {
                  const isAlreadyAdded = currencies.some((c) => c.code === wc.code);

                  return (
                    <div
                      key={wc.code}
                      className="py-2 px-3 flex items-center justify-between text-xs hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CurrencyFlag code={wc.code} flag={wc.flag} size="lg" />
                        <span className="w-7 h-7 rounded-[3px] bg-zinc-100 font-mono font-bold flex items-center justify-center text-zinc-800 text-xs shrink-0">
                          {wc.symbol}
                        </span>
                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-900 font-mono">
                              {wc.code}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate">
                            {wc.name} &bull; <span className="text-zinc-400">{wc.country}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        {isAlreadyAdded ? (
                          <span className="px-2 py-1 bg-zinc-100 text-zinc-500 text-[11px] rounded-[3px] font-medium flex items-center gap-1">
                            <Check className="w-3 h-3 text-zinc-500" />
                            Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddWorldCurrency(wc)}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-medium rounded-[3px] flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between shrink-0">
          <div></div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-[3px] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
