import React, { useState } from 'react';
import { HeartHandshake, Copy, Check, ExternalLink, QrCode, Edit2, X } from 'lucide-react';
import { UserSettings } from '../types';

interface DonateModalProps {
  donateInfo: UserSettings['donateInfo'];
  onUpdateDonateInfo: (info: UserSettings['donateInfo']) => void;
  onClose: () => void;
}

export function DonateModal({
  donateInfo,
  onUpdateDonateInfo,
  onClose,
}: DonateModalProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [platform, setPlatform] = useState(donateInfo.platform);
  const [handle, setHandle] = useState(donateInfo.handle);
  const [message, setMessage] = useState(donateInfo.message);
  const [linkUrl, setLinkUrl] = useState(donateInfo.linkUrl || '');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(handle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDonateInfo({
      platform: platform.trim(),
      handle: handle.trim(),
      message: message.trim(),
      linkUrl: linkUrl.trim() || undefined,
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-md w-full shadow-lg space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[3px] bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Support Development</h3>
              <p className="text-[11px] text-zinc-500">
                Help maintain and improve this budget tracker.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xs p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div>
              <label className="block text-zinc-500 font-medium mb-1">Platform / Methods</label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="Payment platform or methods"
                className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-zinc-900"
              />
            </div>
            <div>
              <label className="block text-zinc-500 font-medium mb-1">Account Handle / Number</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="Account number or handle"
                className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-zinc-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-500 font-medium mb-1">Payment Link (Optional)</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://paypal.me/..."
                className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-zinc-900"
              />
            </div>
            <div>
              <label className="block text-zinc-500 font-medium mb-1">Support Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-zinc-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 text-zinc-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 bg-zinc-900 text-white font-semibold rounded-[3px]"
              >
                Save Details
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3.5">
            <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3 rounded-[4px] border border-zinc-100">
              "{donateInfo.message}"
            </p>

            {/* Account Card */}
            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-[4px] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium">{donateInfo.platform}</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                >
                  <Edit2 className="w-3 h-3" /> Edit Info
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="font-mono text-sm font-semibold text-zinc-900 truncate">
                  {donateInfo.handle}
                </span>
                <button
                  onClick={copyToClipboard}
                  className="px-2.5 py-1 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 text-xs font-medium rounded-[3px] flex items-center gap-1 transition-colors shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-zinc-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {donateInfo.linkUrl && (
              <a
                href={donateInfo.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-[4px] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Open Payment Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-zinc-100 flex justify-end">
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
