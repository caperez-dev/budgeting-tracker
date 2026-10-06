import React, { useState, useRef, useEffect } from 'react';
import { X, AlertCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Currency, Goal } from '../types';
import { CurrencySelect } from './CurrencySelect';
import { SpecularButton } from './ui/SpecularButton';
import { useModalAnimation } from '../utils/useModalAnimation';
import { getTodayDateString } from '../utils/formatters';

interface CreateGoalModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  currencies: Currency[];
  defaultCurrency: string;
}

export function CreateGoalModal({
  isOpen = true,
  onClose,
  onAddGoal,
  currencies,
  defaultCurrency,
}: CreateGoalModalProps) {
  const { requestClose, backdropClass, modalClass } = useModalAnimation({ isOpen, onClose });

  const [name, setName] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [plannedDate, setPlannedDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrency(defaultCurrency);
  }, [defaultCurrency]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  const compressGoalImage = (file: File, maxSize = 600, quality = 0.85): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to decode image file'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width >= height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          try {
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setImageError('Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImageError('Image file is too large. Please select an image under 5MB.');
        return;
      }
      setImageError(null);
      try {
        const compressedBase64 = await compressGoalImage(file);
        setImageUrl(compressedBase64);
      } catch {
        setImageError('Could not process this image. Please choose another.');
      }
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePriceChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[0].length > 10) return;
    if (parts[1] && parts[1].length > 2) return;
    setTargetPrice(cleaned);
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().slice(0, 50);
    const price = parseFloat(targetPrice);

    if (!cleanName) {
      setErrorMsg('Please enter a goal name.');
      return;
    }

    if (isNaN(price) || price <= 0) {
      setErrorMsg('Please enter a valid target price.');
      return;
    }

    if (price > 9999999999.99) {
      setErrorMsg('Target price is too large (maximum 10 digits).');
      return;
    }

    setErrorMsg(null);
    onAddGoal({
      name: cleanName,
      targetPrice: price,
      currency,
      plannedDate: plannedDate || getTodayDateString(),
      imageUrl: imageUrl || undefined,
      allocationMode: 'shared',
      earmarkedAmount: 0,
      notes: notes.trim().slice(0, 150) || undefined,
      isAchieved: false,
    });

    requestClose();
  };

  return (
    <div
      id="modal-create-goal-backdrop"
      className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer select-none ${backdropClass}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        id="modal-create-goal"
        className={`bg-white rounded-[6px] border border-zinc-200 p-5 max-w-md w-full shadow-xl space-y-4 max-h-[92vh] flex flex-col cursor-default select-none ${modalClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Create Goal</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Set a purchase target and track your savings progress.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-[3px] transition-colors cursor-pointer"
            aria-label="Close window"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[4px] flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Goal Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-zinc-500 font-medium uppercase text-[10px] tracking-wider">
                Goal Name
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {name.length}/50
              </span>
            </div>
            <input
              type="text"
              id="input-goal-name"
              required
              maxLength={50}
              value={name}
              onChange={(e) => {
                setName(e.target.value.slice(0, 50));
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g. New Laptop, Emergency Fund, Vacation"
              className="w-full h-9 bg-zinc-50 border border-zinc-200 px-2.5 rounded-[4px] text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Target Price & Currency */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-zinc-500 font-medium mb-1 uppercase text-[10px] tracking-wider">
                Target Price
              </label>
              <input
                type="text"
                id="input-goal-target-price"
                inputMode="decimal"
                required
                value={targetPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 bg-zinc-50 border border-zinc-200 px-2.5 rounded-[4px] font-mono text-xs tabular-nums text-zinc-800 focus:outline-none focus:border-zinc-500 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-500 font-medium mb-1 uppercase text-[10px] tracking-wider">
                Currency
              </label>
              <CurrencySelect
                currencies={currencies}
                value={currency}
                onChange={setCurrency}
                ariaLabel="Goal currency"
                className="h-9"
              />
            </div>
          </div>

          {/* Planned Purchase Date */}
          <div>
            <label className="block text-zinc-500 font-medium mb-1 uppercase text-[10px] tracking-wider">
              Target Purchase Date
            </label>
            <input
              type="date"
              id="input-goal-planned-date"
              required
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full h-9 bg-zinc-50 border border-zinc-200 px-2.5 rounded-[4px] font-mono text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Optional Goal Photo */}
          <div>
            <label className="block text-zinc-500 font-medium mb-1 uppercase text-[10px] tracking-wider">
              Goal Photo (Optional)
            </label>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                id="input-goal-file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-xs text-zinc-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-[4px] file:border file:border-zinc-200 file:text-xs file:font-semibold file:bg-white file:text-zinc-800 hover:file:bg-zinc-50 cursor-pointer"
              />
              {imageError && (
                <p className="text-[11px] text-rose-600 font-medium">{imageError}</p>
              )}
              {imageUrl && (
                <div className="flex items-center gap-3 p-2 bg-zinc-50 border border-zinc-200 rounded-[4px]">
                  <div className="w-12 h-12 rounded-[4px] overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0">
                    <img
                      src={imageUrl}
                      alt="Goal Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-zinc-800 block truncate">
                      Photo attached
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      Preview ready for your card
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 hover:bg-rose-50 rounded-[3px] transition-colors cursor-pointer flex items-center gap-1"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-zinc-500 font-medium uppercase text-[10px] tracking-wider">
                Notes & Details (Optional)
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {notes.length}/150
              </span>
            </div>
            <input
              type="text"
              id="input-goal-notes"
              maxLength={150}
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 150))}
              placeholder="Store, model specs, or motivation notes"
              className="w-full h-9 bg-zinc-50 border border-zinc-200 px-2.5 rounded-[4px] text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 shrink-0">
            <button
              type="button"
              onClick={requestClose}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 font-medium rounded-[3px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <SpecularButton
              type="submit"
              id="btn-submit-create-goal"
              size="sm"
              radius={4}
              disabled={!targetPrice || !name.trim()}
              className="px-4 py-1.5 text-white text-xs font-semibold shadow-xs"
            >
              <span>Create Goal</span>
            </SpecularButton>
          </div>
        </form>
      </div>
    </div>
  );
}
