import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ModalPortalProps {
  children: React.ReactNode;
}

export function ModalPortal({ children }: ModalPortalProps) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
}

export default ModalPortal;
