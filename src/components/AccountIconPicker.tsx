import React, { useRef, useState } from 'react';
import { Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import { BANK_LOGOS } from '../data/bankLogos';
import { AccountIcon } from './CategoryIcon';

export const STANDARD_ACCOUNT_ICONS = [
  'Smartphone',
  'Wallet',
  'Banknote',
  'Landmark',
  'CreditCard',
  'PiggyBank',
  'Coins',
  'CircleDollarSign',
  'Shield',
];

interface AccountIconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

export function AccountIconPicker({ value, onChange }: AccountIconPickerProps) {
  const [activeTab, setActiveTab] = useState<'banks' | 'standard' | 'upload'>(() => {
    if (value && (value.startsWith('data:image/') || value.startsWith('blob:'))) {
      return 'upload';
    }
    if (value && value.startsWith('bank-')) {
      return 'banks';
    }
    return 'banks';
  });

  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCustomUploaded =
    value && (value.startsWith('data:image/') || value.startsWith('blob:'));

  const validateAndProcessFile = (file: File) => {
    setUploadError(null);

    // Validate type: PNG and JPG only
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const hasValidExtension = /\.(png|jpe?g)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !hasValidExtension) {
      setUploadError('Please select a PNG or JPG image file.');
      return;
    }

    // Validate size: below 3 MB
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError(`File is too large (${sizeMb} MB). It must be below 3 MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        onChange(result);
        setActiveTab('upload');
      }
    };
    reader.onerror = () => {
      setUploadError('Could not read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-zinc-700">
          Choose Account Icon
        </label>
        {value && (
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span>Selected:</span>
            <div className="w-5 h-5 rounded-[4px] bg-zinc-100 border border-zinc-200 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
              <AccountIcon name={value} className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>

      {/* Selector Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200 pb-1.5 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('banks')}
          className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer text-[11px] ${
            activeTab === 'banks'
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          Bank & Wallet Logos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('standard')}
          className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer text-[11px] ${
            activeTab === 'standard'
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          Symbols
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
            activeTab === 'upload'
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Upload className="w-3 h-3" />
          <span>Upload Custom</span>
        </button>
      </div>

      {/* Tab: Real-life Bank & Wallet Logos */}
      {activeTab === 'banks' && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 bg-zinc-50/50 rounded-[4px] border border-zinc-200">
            {BANK_LOGOS.map((bank) => {
              const isSelected = value === bank.id;
              return (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => onChange(bank.id)}
                  title={bank.name}
                  className={`flex items-center gap-2 p-1.5 rounded-[4px] border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs ring-1 ring-zinc-900'
                      : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <div className="w-5 h-5 shrink-0 rounded-[3px] overflow-hidden flex items-center justify-center">
                    {bank.render('w-5 h-5')}
                  </div>
                  <span className="text-[11px] font-medium truncate flex-1">
                    {bank.name}
                  </span>
                  {isSelected && (
                    <Check className="w-3 h-3 text-white shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Standard Symbols */}
      {activeTab === 'standard' && (
        <div className="flex flex-wrap gap-2 p-2 bg-zinc-50/50 rounded-[4px] border border-zinc-200">
          {STANDARD_ACCOUNT_ICONS.map((ic) => {
            const isSelected = value === ic;
            return (
              <button
                key={ic}
                type="button"
                onClick={() => onChange(ic)}
                title={ic}
                className={`p-2 rounded-[4px] border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <AccountIcon name={ic} className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Tab: Upload Custom Icon */}
      {activeTab === 'upload' && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileInputChange}
            className="hidden"
            id="account-custom-icon-file-input"
          />

          {isCustomUploaded ? (
            <div className="p-3 bg-white border border-emerald-200 rounded-[4px] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-[6px] border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  <img
                    src={value}
                    alt="Custom uploaded account icon"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 truncate">
                    Custom Icon Applied
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    PNG or JPG image
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-[4px] transition-colors cursor-pointer"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange('Wallet');
                    setUploadError(null);
                  }}
                  title="Remove custom icon"
                  className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-[4px] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-[5px] text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                dragOver
                  ? 'border-zinc-900 bg-zinc-100/70'
                  : 'border-zinc-200 hover:border-zinc-400 bg-zinc-50/50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="text-xs font-medium text-zinc-900">
                Drop your image here, or{' '}
                <span className="text-blue-600 underline underline-offset-2 font-semibold">
                  browse
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Supports PNG and JPG (maximum 3 MB)
              </p>
            </div>
          )}

          {uploadError && (
            <div className="text-xs text-rose-600 font-medium px-1 flex items-center gap-1">
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
