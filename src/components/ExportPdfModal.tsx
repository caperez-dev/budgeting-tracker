import { useState, useMemo } from 'react';
import {
  X,
  FileText,
  FolderOpen,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
} from 'lucide-react';
import {
  ExportPdfOptions,
  buildBudgetPdfDoc,
  exportPdfWithFolderPicker,
  exportPdfToFile,
  getPdfBlobUrl,
} from '../utils/pdfExport';
import { formatCurrency } from '../utils/formatters';

interface ExportPdfModalProps {
  onClose: () => void;
  options: ExportPdfOptions;
}

export function ExportPdfModal({ onClose, options }: ExportPdfModalProps) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [fileName, setFileName] = useState(`budget_tracker_report_${todayStr}.pdf`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // Generate doc on demand
  const { doc } = useMemo(() => buildBudgetPdfDoc(options), [options]);

  const debtsYouOwe = useMemo(
    () => options.debts.filter((d) => d.type === 'owe' && !d.settled).reduce((s, d) => s + d.amount, 0),
    [options.debts]
  );
  const debtsOwedToYou = useMemo(
    () => options.debts.filter((d) => d.type === 'owed' && !d.settled).reduce((s, d) => s + d.amount, 0),
    [options.debts]
  );

  const getCleanFileName = () => {
    const trimmed = fileName.trim();
    if (!trimmed) return `budget_tracker_report_${todayStr}.pdf`;
    return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
  };

  // Option 1: Choose Folder on Device (Native File/Folder Picker)
  const handleChooseFolderAndSave = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const result = await exportPdfWithFolderPicker(doc, getCleanFileName());
      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: 'Report successfully saved to your selected folder!',
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else if (result.cancelled) {
        setStatusMessage({
          type: 'info',
          text: 'Folder selection was cancelled. No file was downloaded.',
        });
      } else {
        // Folder picker not supported or restricted in iframe
        setStatusMessage({
          type: 'error',
          text: result.error || 'Unable to open folder browser. You can use the direct download or preview option below.',
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'An unexpected issue occurred while opening the folder picker. You can use the standard download option below.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Option 2: Standard download
  const handleDirectDownload = () => {
    setIsProcessing(true);
    try {
      exportPdfToFile(doc, getCleanFileName());
      setStatusMessage({
        type: 'success',
        text: 'Report downloaded to your default downloads folder!',
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Failed to create download. Please try again or open preview.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Option 3: Open in new tab
  const handleOpenPreview = () => {
    try {
      const url = getPdfBlobUrl(doc);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatusMessage({
        type: 'info',
        text: 'Preview opened in a new tab. You can view or save from there.',
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Could not open preview. Please use direct download.',
      });
    }
  };

  return (
    <div
      id="modal-export-pdf-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="modal-export-pdf"
        className="bg-white rounded-[6px] border border-zinc-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-zinc-100 flex items-center justify-center text-zinc-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Export PDF Report</h2>
              <p className="text-xs text-zinc-500">
                Choose where you would like to save your report before exporting
              </p>
            </div>
          </div>
          <button
            id="button-close-export-modal"
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-[3px] transition-colors cursor-pointer"
            aria-label="Close export dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* File Name Input */}
          <div>
            <label
              htmlFor="input-export-filename"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Report File Name
            </label>
            <div className="relative">
              <input
                id="input-export-filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter report name..."
                className="w-full bg-white border border-zinc-200 px-3 py-2 rounded-[4px] text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-400"
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              File will be saved in PDF format on your device.
            </p>
          </div>

          {/* Report Summary Card */}
          <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-[4px] space-y-2 text-xs">
            <div className="flex items-center justify-between text-zinc-500 text-[11px] border-b border-zinc-200/50 pb-2">
              <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                Contents Included in Report
              </span>
              <span className="font-mono text-zinc-500">{options.currencySymbol} Currency</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-white p-2 rounded-[3px] border border-zinc-200/60">
                <span className="block text-[10px] text-zinc-400 font-medium uppercase">Transactions</span>
                <span className="text-xs font-semibold text-zinc-800 font-mono">
                  {options.transactions.length} logged
                </span>
              </div>
              <div className="bg-white p-2 rounded-[3px] border border-zinc-200/60">
                <span className="block text-[10px] text-zinc-400 font-medium uppercase">Savings Balance</span>
                <span className="text-xs font-semibold text-zinc-800 font-mono">
                  {formatCurrency(options.currentSavings, options.currencySymbol)}
                </span>
              </div>
              <div className="bg-white p-2 rounded-[3px] border border-zinc-200/60">
                <span className="block text-[10px] text-zinc-400 font-medium uppercase">Active Debts</span>
                <span className="text-xs font-semibold text-zinc-800 font-mono">
                  {options.debts.filter((d) => !d.settled).length} active
                </span>
              </div>
              <div className="bg-white p-2 rounded-[3px] border border-zinc-200/60">
                <span className="block text-[10px] text-zinc-400 font-medium uppercase">Purchase Goals</span>
                <span className="text-xs font-semibold text-zinc-800 font-mono">
                  {options.goals.length} goals
                </span>
              </div>
            </div>
          </div>

          {/* Status Feedback Notice */}
          {statusMessage && (
            <div
              id="export-pdf-status-notice"
              className={`p-2.5 rounded-[4px] text-xs flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : statusMessage.type === 'info'
                  ? 'bg-blue-50 border border-blue-200 text-blue-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'info' ? (
                <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Choice Section: Where to Save */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-zinc-700">Choose Your Destination</span>

            {/* Choice 1: Choose Folder on Device */}
            <div className="p-3 border border-zinc-200 hover:border-zinc-300 rounded-[4px] bg-white transition-colors flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[4px] bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0 mt-0.5">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-zinc-900">Choose Folder on Device</h3>
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    Select any folder or drive on your computer before saving.
                  </p>
                </div>
              </div>
              <button
                id="button-export-choose-folder"
                type="button"
                onClick={handleChooseFolderAndSave}
                disabled={isProcessing}
                className="shrink-0 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-[4px] text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Select Folder
              </button>
            </div>

            {/* Choice 2: Save to Downloads */}
            <div className="p-3 border border-zinc-200 hover:border-zinc-300 rounded-[4px] bg-white transition-colors flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[4px] bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0 mt-0.5">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-zinc-900">Save to Downloads</h3>
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    Save directly to your computer's default downloads folder.
                  </p>
                </div>
              </div>
              <button
                id="button-export-direct-download"
                type="button"
                onClick={handleDirectDownload}
                disabled={isProcessing}
                className="shrink-0 px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-[4px] text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Save File
              </button>
            </div>

            {/* Choice 3: Preview Report */}
            <div className="p-3 border border-zinc-200 hover:border-zinc-300 rounded-[4px] bg-white transition-colors flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[4px] bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0 mt-0.5">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-zinc-900">Preview Report</h3>
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    Open in a new tab to inspect, print, or choose a folder to save.
                  </p>
                </div>
              </div>
              <button
                id="button-export-open-preview"
                type="button"
                onClick={handleOpenPreview}
                disabled={isProcessing}
                className="shrink-0 px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-[4px] text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Open Preview
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end">
          <button
            id="button-cancel-export"
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-3.5 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
