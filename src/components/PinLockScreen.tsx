import React, { useState, useEffect } from 'react';
import CodeSlots from './ui/CodeSlots';
import walloLogo from '../assets/wallo.png';
import { SpecularButton } from './ui/SpecularButton';
import { Lock, KeyRound, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface PinLockScreenProps {
  userId?: string;
  userNickname?: string;
  userEmail?: string;
  hasPin: boolean;
  onUnlock: () => void;
  onSetPin: (pin: string) => Promise<boolean>;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onLogout: () => void;
  onPinFound?: () => void;
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
  onPinFound,
}: PinLockScreenProps) {
  // If hasPin is true, we immediately show 'enter'.
  // If hasPin is false, verify with the server first before assuming no PIN exists.
  const [isCheckingServerPin, setIsCheckingServerPin] = useState<boolean>(!hasPin);
  const [mode, setMode] = useState<'enter' | 'create' | 'confirm'>('enter');
  const [createdPin, setCreatedPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Key to force reset CodeSlots component on step change or error drain
  const [slotKey, setSlotKey] = useState(0);

  useEffect(() => {
    if (hasPin) {
      setIsCheckingServerPin(false);
      setMode('enter');
      return;
    }

    let isMounted = true;
    const checkServerStatus = async () => {
      try {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (userEmail) params.append('email', userEmail);
        const res = await fetch(`/api/user/pin-status?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.hasPin) {
              setMode('enter');
              setIsCheckingServerPin(false);
              onPinFound?.();
              return;
            }
          }
        }
      } catch (e) {
        console.error('Error checking server PIN status:', e);
      }

      if (isMounted) {
        // Account genuinely has no PIN on server
        setMode('create');
        setIsCheckingServerPin(false);
      }
    };

    checkServerStatus();
    return () => {
      isMounted = false;
    };
  }, [userId, userEmail, hasPin, onPinFound]);

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
        }, 600);
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

  if (isCheckingServerPin) {
    return (
      <div
        id="pin-lock-screen"
        className="fixed inset-0 z-100 flex flex-col items-center justify-center p-4 sm:p-6 bg-white select-none animate-in fade-in duration-200"
      >
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
          <div className="p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl shadow-xs">
            <img
              src={walloLogo}
              alt="Wallo"
              className="h-10 w-auto object-contain select-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
            <span>Checking security credentials...</span>
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
