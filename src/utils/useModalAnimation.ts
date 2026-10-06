import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseModalAnimationOptions {
  isOpen?: boolean;
  onClose: () => void;
  duration?: number;
}

export function useModalAnimation({
  isOpen = true,
  onClose,
  duration = 200,
}: UseModalAnimationOptions) {
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      isClosingRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    timerRef.current = setTimeout(() => {
      onClose();
      setIsClosing(false);
      isClosingRef.current = false;
    }, duration);
  }, [onClose, duration]);

  return {
    isClosing,
    requestClose,
    backdropClass: isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in',
    modalClass: isClosing ? 'animate-modal-slide-out' : 'animate-modal-slide-in',
  };
}

export default useModalAnimation;
