'use client';

import Image from 'next/image';
import styles from './dialog.module.css';
import { DialogProps } from './type';
import { OutlineTextButton, PrimaryTextButton } from '@/app/components/shared/button/TextButton';
import { useModal } from '@/app/components/shared/modal/useModal';

export default function Dialog({ modalId, src, title, content, onCancel, onConfirm }: DialogProps) {
  const { closeModal } = useModal();

  const handleCancel = () => {
    onCancel?.();
    closeModal(modalId);
  };
  const handleConfirm = () => {
    onConfirm?.();
    closeModal(modalId);
  };

  return (
    <div className={styles.dialog}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div className={styles.imageWrapper}>
            <Image src={src} alt="dialog mascot" width={160} height={160} />
          </div>
        </div>
        <div className={styles.body}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.content}>{content}</p>
        </div>
      </div>
      <div className={styles.footer}>
        <OutlineTextButton text="취소" onClick={handleCancel} size="medium" />
        <PrimaryTextButton text="확인" onClick={handleConfirm} size="medium" />
      </div>
    </div>
  );
}
