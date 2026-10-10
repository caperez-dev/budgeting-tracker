import React, { useState, useEffect } from 'react';
import CodeSlots from './ui/CodeSlots';
import walloLogo from '../assets/wallo.png';
import { Lock, AlertCircle } from 'lucide-react';

interface PinLockScreenProps {
  userId?: string;
  userNickname?: string;
  userEmail?: string;
  hasPin: boolean;
  onUnlock: () => void;
  onSetPin: (pin: string) => Promise<boolean>;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onLogout: () => void;
  onPinStatusSynced?: (hasPin: boolean, pinCode?: string | null) => void;
}

export function PinLockScreen({
  userId,
  userNickname,
  userEmail,
  hasPin,
  onUnlock,
  onSetPin,
  onVerifyPin,
  onLogout,
  onPinStatusSynced,
}: PinLockScreenProps) {
  // If user already has a PIN, mode is 'enter'. If not, we start in 'checking' to verify with server first.
  const [mode, setMode] = useState<'enter' | 'create' | 'confirm' | 'checking'>(() => {
    return hasPin ? 'enter' : 'checking';
  });
  const [createdPin, setCreatedPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Key to force reset CodeSlots component on step change or error drain
  const [slotKey, setSlotKey] = useState(0);

  // Check canonical PIN status from server so another device always detects existing PIN
  useEffect(() => {
    let isCancelled = false;

    const checkServerPin = async () => {
      try {
        const params = new URLSearchParams();
        if (userId) params.set('userId', userId);
        if (userEmail) params.set('email', userEmail);
        const res = await fetch(`/api/user/pin-status?${params.toString()}`, {
          headers: userId ? { 'x-user-id': userId } : {},
          cache: 'no-store',
        });
        const data = await res.json();
        if (isCancelled) return;
        if (data && data.success) {
          if (data.hasPin) {
            setMode('enter');
            onPinStatusSynced?.(true, data.pinCode);
            return;
          } else if (!hasPin) {
            // Truly no PIN set on the server and no PIN locally
            setMode('create');
            onPinStatusSynced?.(false, null);
            return;
          }
        }
      } catch {}

      if (isCancelled) return;
      // If network failure or offline, fallback to hasPin prop
      setMode(hasPin ? 'enter' : 'create');
    };

    if (userId || userEmail) {
      checkServerPin();
    } else {
      setMode(hasPin ? 'enter' : 'create');
    }

    return () => {
      isCancelled = true;
    };
  }, [userId, userEmail, hasPin, onPinStatusSynced]);

  // If parent prop hasPin updates to true, ensure mode is 'enter'
  useEffect(() => {
    if (hasPin && (mode === 'create' || mode === 'checking')) {
      setMode('enter');
    }
  }, [hasPin, mode]);

  const handleEnterComplete = async (code: string) => {
    if (code.length !== 4) return;
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const ok = await onVerifyPin(code);
      if (ok) {
        setStatus('success');
        setTimeout(() => {
          onUnlock();
        }, 500);
      } else {
        setStatus('error');
        setErrorMessage('Incorrect PIN. Please try again.');
        setTimeout(() => {
          setStatus('idle');
          setSlotKey((prev) => prev + 1);
        }, 1200);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Failed to verify PIN.');
      setTimeout(() => {
        setStatus('idle');
        setSlotKey((prev) => prev + 1);
      }, 1200);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCreateComplete = (code: string) => {
    if (code.length !== 4) return;
    setCreatedPin(code);
    setStatus('success');
    setTimeout(() => {
      setMode('confirm');
      setStatus('idle');
      setSlotKey((prev) => prev + 1);
    }, 400);
  };

  const handleConfirmComplete = async (code: string) => {
    if (code.length !== 4) return;
    if (code !== createdPin) {
      setStatus('error');
      setErrorMessage("PINs do not match. Let's try again.");
      setTimeout(() => {
        setCreatedPin('');
        setMode('create');
        setStatus('idle');
        setErrorMessage(null);
        setSlotKey((prev) => prev + 1);
      }, 1200);
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const ok = await onSetPin(code);
      if (ok) {
        setStatus('success');
        onPinStatusSynced?.(true, code);
        setTimeout(() => {
          onUnlock();
        }, 600);
      } else {
        setStatus('error');
        setErrorMessage('Failed to save PIN. Please try again.');
        setTimeout(() => {
          setStatus('idle');
          setSlotKey((prev) => prev + 1);
        }, 1200);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Failed to save PIN.');
      setTimeout(() => {
        setStatus('idle');
        setSlotKey((prev) => prev + 1);
      }, 1200);
    } finally {
      setIsVerifying(false);
    }
  };

  if (mode === 'checking') {
    return (
      <div
        id="pin-lock-screen"
        className="fixed inset-0 z-100 flex flex-col items-center justify-center p-4 sm:p-6 bg-white select-none animate-in fade-in duration-200"
      >
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-5">
          <div className="p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl shadow-xs animate-pulse">
            <img
              src={walloLogo}
              alt="Wallo"
              className="h-10 w-auto object-contain select-none"
            />
          </div>
          <div className="space-y-1 px-2">
            <h2 className="text-base font-semibold text-zinc-900 tracking-tight">Verifying Session</h2>
            <p className="text-xs text-zinc-400">Checking security PIN status...</p>
          </div>
        </div>
      </div>
    );
  }

  const title =
    mode === 'enter'
      ? 'Welcome Back'
      : mode === 'create'
      ? 'Set a 4-Digit Security PIN'
      : 'Confirm Your 4-Digit PIN';

  const subtitle =
    mode === 'enter'
      ? `Enter your 4-digit PIN to access your tracker (${userNickname || userEmail || 'User'})`
      : mode === 'create'
      ? 'To protect your budget when reopening the app, create a 4-digit PIN.'
      : 'Please re-enter your 4-digit PIN to confirm.';

  return (
    <div
      id="pin-lock-screen"
      className="fixed inset-0 z-100 flex flex-col items-center justify-center p-4 sm:p-6 bg-white select-none animate-in fade-in duration-300"
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
        {/* Wallo Brand Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl shadow-xs">
            <img
              src={walloLogo}
              alt="Wallo"
              className="h-10 w-auto object-contain select-none"
            />
          </div>
        </div>

        {/* Header Title & Subtitle */}
        <div className="space-y-1.5 px-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            <Lock className="w-3.5 h-3.5 text-zinc-500" />
            <span>PIN Protected Session</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{title}</h2>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
            {subtitle}
          </p>
        </div>

        {/* CodeSlots PIN Input from React Bits */}
        <div className="py-2 flex flex-col items-center justify-center">
          <CodeSlots
            key={slotKey}
            length={4}
            status={status}
            onChange={() => {
              if (status === 'error') setStatus('idle');
              if (errorMessage) setErrorMessage(null);
            }}
            onComplete={(code) => {
              if (mode === 'enter') {
                handleEnterComplete(code);
              } else if (mode === 'create') {
                handleCreateComplete(code);
              } else {
                handleConfirmComplete(code);
              }
            }}
            mask={true}
            autoFocus={true}
            slotSize={52}
            gap={10}
            radius={10}
            accentColor="#18181b"
            inkColor="#18181b"
            slotColor="#f4f4f5"
            digitColor="#ffffff"
            dangerColor="#ef4444"
            disabled={isVerifying}
          />
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col items-center gap-3 w-full">
          {mode === 'confirm' ? (
            <button
              type="button"
              onClick={() => {
                setMode('create');
                setCreatedPin('');
                setStatus('idle');
                setErrorMessage(null);
                setSlotKey((prev) => prev + 1);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-800 font-medium transition-colors cursor-pointer"
            >
              ← Back to enter new PIN
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-zinc-500 hover:text-zinc-800 font-medium transition-colors cursor-pointer"
            >
              Sign in with a different account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
