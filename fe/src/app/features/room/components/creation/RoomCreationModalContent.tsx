'use client';

import RoomCreationForm from './RoomCreationForm';
import { RoomCreationFormProps } from '@/app/features/room/components/type';
import styles from './roomCreationForm.module.css';
import Paths from '@/app/shared/path';
import Image from 'next/image';
import { useModal } from '@/app/components/shared/modal/useModal';

export default function RoomCreationModalContent(props: RoomCreationFormProps) {
  const { onSubmit } = props;
  const { closeModal } = useModal();

  const handleCancel = () => closeModal('room-creation');
  const handleSubmit = (data: Parameters<NonNullable<typeof onSubmit>>[0]) => onSubmit?.(data);

  return (
    <div className={styles.modalContent}>
      <div className={styles.modalHeader}>
        <div className={styles.modalHeaderContent}>
          <h1 className={styles.modalTitle}>대화방 만들기</h1>
          <p className={styles.modalSubtitle}>새로운 물방울을 띄워보세요!</p>
        </div>
        <Image src={Paths.images('mascot')} alt="mascot" width={72} height={72} />
      </div>
      <RoomCreationForm {...props} onCancel={handleCancel} onSubmit={handleSubmit} />
    </div>
  );
}
