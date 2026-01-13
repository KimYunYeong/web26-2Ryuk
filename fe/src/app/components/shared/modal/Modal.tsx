'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { modalStore } from './modal.store';
import styles from './modal.module.css';
import { ModalProps } from './type';
import CSSUtil from '@/utils/css';

type Event = React.MouseEvent<HTMLDivElement>;

export default function Modal({ id, children }: ModalProps) {
  const openModals = modalStore((state) => state.openModals);
  const closeModal = modalStore((state) => state.closeModal);
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => setMounted(true), []);

  const isOpen = openModals.has(id);

  useEffect(() => {
    if (isOpen && mounted) requestAnimationFrame(() => setIsVisible(true));
    else setIsVisible(false);
  }, [isOpen, mounted]);

  if (!mounted || !isOpen) return null;

  const handleContentClick = (e: Event) => e.stopPropagation();
  const handleBackdropClick = (e: Event) => {
    if (e.target === e.currentTarget) closeModal(id);
  };

  const backdropClassName = CSSUtil.buildCls(styles.backdrop, isVisible && styles.visible);

  return createPortal(
    <div className={backdropClassName} onClick={handleBackdropClick}>
      <div className={styles.content} onClick={handleContentClick}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
