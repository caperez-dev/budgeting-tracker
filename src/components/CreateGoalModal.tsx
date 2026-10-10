import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Currency, Goal } from '../types';
import { CurrencySelect } from './CurrencySelect';
import { SpecularButton } from './ui/SpecularButton';
import { ModalPortal } from './ui/ModalPortal';
import { useModalAnimation } from '../utils/useModalAnimation';
import { getTodayDateString } from '../utils/formatters';

export interface CreateGoalModalProps {
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
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file');
      return;
    }

    try {
      const compressedDataUrl = await compressGoalImage(file);
      setImageUrl(compressedDataUrl);
      setImageError(null);
    } catch {
      if (file.size > 2 * 1024 * 1024) {
        setImageError('Image file is too large (max 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setImageUrl(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isAddFormValid =
    name.trim().length > 0 &&
    targetPrice.trim().length > 0 &&
    !isNaN(parseFloat(targetPrice)) &&
    parseFloat(targetPrice) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (!name.trim() || isNaN(price) || price <= 0) {
      return;
    }

    onAddGoal({
      name: name.trim(),
      targetPrice: price,
      currency,
      plannedDate: plannedDate || getTodayDateString(),
      imageUrl: imageUrl || undefined,
      allocationMode: 'shared',
      earmarkedAmount: 0,
      notes: notes.trim() || undefined,
      isAchieved: false,
    });

    requestClose();
  };

  return (
    <ModalPortal>
      <div
        id="modal-create-goal-backdrop"
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer ${backdropClass}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            requestClose();
          }
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            requestClose();
          }
        }}
      >
        <form
          id="modal-create-goal"
          onSubmit={handleSubmit}
          className={`bg-white rounded-[5px] border border-zinc-200 p-5 max-w-md w-full shadow-lg space-y-4 my-auto cursor-default ${modalClass}`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h4 className="text-sm font-semibold text-zinc-900">Add Purchase Goal</h4>
            <button
              type="button"
              onClick={requestClose}
              className="text-zinc-400 hover:text-zinc-600 p-1 rounded cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Name */}
            <div>
              <label className="block text-zinc-500 font-medium mb-1">Goal Name</label>
              <input
                type="text"
                id="input-goal-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Goal or item name"
                className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Target Price & Currency */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-500 font-medium mb-1">Target Price</label>
                <input
                  type="number"
                  id="input-goal-target-price"
                  step="any"
                  required
                  min="0.01"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-9 bg-white border border-zinc-200 px-2.5 rounded-[4px] font-mono text-xs tabular-nums text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium mb-1">Currency</label>
                <CurrencySelect
                  currencies={currencies}
                  value={currency}
                  onChange={setCurrency}
                  ariaLabel="Goal currency"
                  className="h-9"
                />
              </div>
            </div>

            {/* Planned Date */}
            <div>
              <label className="block text-zinc-500 font-medium mb-1">
                Planned Purchase Date
              </label>
              <input
                type="date"
                id="input-goal-planned-date"
                required
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-[4px] font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Optional Image File */}
            <div>
              <label className="block text-zinc-500 font-medium mb-1">
                Optional Image File
              </label>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="input-goal-image-file"
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
                        Image selected
                      </span>
                      <span className="text-[10px] text-zinc-500 block">
                        Preview ready for this goal
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 hover:bg-rose-50 rounded-[3px] transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-zinc-500 font-medium mb-1">Notes (Optional)</label>
              <input
                type="text"
                id="input-goal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Model, store, or target details (optional)"
                className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={requestClose}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[3px] cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <SpecularButton
              type="submit"
              id="btn-submit-create-goal"
              size="sm"
              radius={3}
              disabled={!isAddFormValid}
              isMuted={!isAddFormValid}
              className={`px-3.5 py-1.5 text-xs font-semibold transition-all ${
                !isAddFormValid
                  ? 'opacity-40 cursor-not-allowed bg-zinc-200 text-zinc-400 border border-zinc-200 shadow-none'
                  : 'text-white cursor-pointer'
              }`}
            >
              Save Goal
            </SpecularButton>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
